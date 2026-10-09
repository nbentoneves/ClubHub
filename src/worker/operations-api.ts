import type { Env } from './auth';

type Role = 'owner' | 'administrator' | 'coach' | 'member' | 'guardian';
type Session = { user: { id: string; email: string } };

const administrators: Role[] = ['owner', 'administrator'];
const statuses = ['pending', 'active', 'suspended', 'expired', 'cancelled'] as const;

function response(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

function fail(code: string, message: string, status: number): Response {
  return response({ error: { code, message } }, status);
}

async function bodyOf(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function string(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null;
  const result = value.trim();
  return result && result.length <= max ? result : null;
}

function positiveInt(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) > 0 ? value as number : null;
}

function price(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100000
    ? Math.round(value * 100)
    : null;
}

async function clubRole(env: Env, userId: string, clubId: string): Promise<Role | null> {
  const row = await env.DB.prepare(
    "SELECT role FROM club_memberships WHERE club_id = ? AND user_id = ? AND status = 'active'",
  ).bind(clubId, userId).first<{ role: Role }>();
  return row?.role ?? null;
}

async function ownsProfile(env: Env, session: Session, clubId: string, memberId: string): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT mp.id FROM member_profiles mp
     WHERE mp.club_id = ? AND mp.id = ? AND (
       mp.user_id = ? OR EXISTS (
         SELECT 1 FROM guardian_relationships gr
         WHERE gr.club_id = mp.club_id AND gr.child_member_profile_id = mp.id AND gr.guardian_user_id = ?
       )
     )`,
  ).bind(clubId, memberId, session.user.id, session.user.id).first();
  return !!row;
}

async function isGroupCoach(env: Env, userId: string, clubId: string, groupId: string | null): Promise<boolean> {
  if (!groupId) return false;
  return !!await env.DB.prepare(
    'SELECT 1 FROM group_coaches WHERE club_id = ? AND group_id = ? AND user_id = ?',
  ).bind(clubId, groupId, userId).first();
}

async function assignedGroupAccess(env: Env, userId: string, clubId: string, groupId: string | null): Promise<boolean> {
  if (!groupId) {
    return !!await env.DB.prepare(
      `SELECT 1 FROM member_profiles mp WHERE mp.club_id = ? AND mp.membership_status = 'active'
       AND (mp.user_id = ? OR EXISTS (SELECT 1 FROM guardian_relationships gr
         WHERE gr.club_id = mp.club_id AND gr.child_member_profile_id = mp.id AND gr.guardian_user_id = ?)) LIMIT 1`,
    ).bind(clubId, userId, userId).first();
  }
  return !!await env.DB.prepare(
    `SELECT 1 FROM group_members gm JOIN member_profiles mp ON mp.id = gm.member_profile_id
     WHERE gm.club_id = ? AND gm.group_id = ? AND mp.club_id = ? AND mp.membership_status = 'active'
     AND (mp.user_id = ? OR EXISTS (SELECT 1 FROM guardian_relationships gr
       WHERE gr.club_id = mp.club_id AND gr.child_member_profile_id = mp.id AND gr.guardian_user_id = ?))`,
  ).bind(clubId, groupId, clubId, userId, userId).first();
}

export async function handleOperationsApi(
  request: Request,
  env: Env,
  session: Session,
  clubId: string,
  route: string[],
  role: Role,
): Promise<Response> {
  const resource = route[0];

  if (resource === 'groups' && route.length === 1) {
    if (request.method === 'GET') {
      const sql = administrators.includes(role) ?
        `SELECT g.id, g.name, g.description, g.capacity, g.status,
         COUNT(DISTINCT gm.member_profile_id) AS memberCount,
         GROUP_CONCAT(DISTINCT gm.member_profile_id) AS memberIds
         FROM groups g LEFT JOIN group_members gm ON gm.club_id = g.club_id AND gm.group_id = g.id
         WHERE g.club_id = ? GROUP BY g.id ORDER BY g.name COLLATE NOCASE` :
        `SELECT g.id, g.name, g.description, g.capacity, g.status,
         COUNT(DISTINCT gm.member_profile_id) AS memberCount,
         GROUP_CONCAT(DISTINCT gm.member_profile_id) AS memberIds
         FROM groups g LEFT JOIN group_members gm ON gm.club_id = g.club_id AND gm.group_id = g.id
         JOIN group_coaches gc ON gc.club_id = g.club_id AND gc.group_id = g.id AND gc.user_id = ?
         WHERE g.club_id = ? GROUP BY g.id ORDER BY g.name COLLATE NOCASE`;
      const groups = administrators.includes(role)
        ? await env.DB.prepare(sql).bind(clubId).all()
        : await env.DB.prepare(sql).bind(session.user.id, clubId).all();
      return response({ groups: groups.results });
    }
    if (request.method === 'POST') {
      if (!administrators.includes(role)) return fail('FORBIDDEN', 'You cannot manage groups.', 403);
      const body = await bodyOf(request);
      const name = string(body?.name, 100);
      const capacity = body?.capacity === undefined || body.capacity === null || body.capacity === '' ? null : positiveInt(body.capacity);
      if (!name || (body?.capacity !== undefined && body.capacity !== null && body.capacity !== '' && !capacity)) {
        return fail('VALIDATION_ERROR', 'Provide a group name and a valid capacity.', 400);
      }
      const id = crypto.randomUUID();
      try {
        await env.DB.prepare('INSERT INTO groups (id, club_id, name, description, capacity) VALUES (?, ?, ?, ?, ?)')
          .bind(id, clubId, name, string(body?.description, 1000) ?? '', capacity).run();
      } catch {
        return fail('DUPLICATE_GROUP', 'A group with this name already exists.', 409);
      }
      return response({ group: { id, name, capacity } }, 201);
    }
  }

  if (resource === 'groups' && route.length === 3 && route[2] === 'members' && request.method === 'PUT') {
    if (!administrators.includes(role)) return fail('FORBIDDEN', 'You cannot assign group members.', 403);
    const groupId = route[1];
    const body = await bodyOf(request);
    if (!Array.isArray(body?.memberIds) || body.memberIds.some((id) => typeof id !== 'string')) {
      return fail('VALIDATION_ERROR', 'A list of member IDs is required.', 400);
    }
    const group = await env.DB.prepare('SELECT id, capacity FROM groups WHERE club_id = ? AND id = ? AND status = \'active\'')
      .bind(clubId, groupId).first<{ id: string; capacity: number | null }>();
    if (!group) return fail('NOT_FOUND', 'Group not found.', 404);
    const memberIds = [...new Set(body.memberIds as string[])];
    if (group.capacity !== null && memberIds.length > group.capacity) return fail('GROUP_FULL', 'The group capacity would be exceeded.', 409);
    const validCount = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM member_profiles WHERE club_id = ? AND id IN (${memberIds.map(() => '?').join(',') || "''"})`,
    ).bind(clubId, ...memberIds).first<{ count: number }>();
    if ((validCount?.count ?? 0) !== memberIds.length) return fail('NOT_FOUND', 'One or more members were not found.', 404);
    await env.DB.prepare('DELETE FROM group_members WHERE club_id = ? AND group_id = ?').bind(clubId, groupId).run();
    if (memberIds.length) {
      await env.DB.batch(memberIds.map((memberId) => env.DB.prepare(
        'INSERT INTO group_members (club_id, group_id, member_profile_id) VALUES (?, ?, ?)',
      ).bind(clubId, groupId, memberId)));
    }
    return response({ memberIds });
  }

  if (resource === 'activities' && route.length === 1) {
    if (request.method === 'GET') {
      const rows = await env.DB.prepare(
        `SELECT a.id, a.title, a.description, a.location, a.start_at AS startAt, a.end_at AS endAt,
         a.capacity, a.price_pence AS pricePence, a.booking_deadline AS bookingDeadline, a.status,
         a.recurrence, a.recurrence_until AS recurrenceUntil, a.group_id AS groupId,
         g.name AS groupName, COUNT(b.id) AS bookedCount
         FROM activities a LEFT JOIN groups g ON g.club_id = a.club_id AND g.id = a.group_id
         LEFT JOIN activity_bookings b ON b.club_id = a.club_id AND b.activity_id = a.id AND b.booking_status = 'booked'
         WHERE a.club_id = ? GROUP BY a.id ORDER BY a.start_at`,
      ).bind(clubId).all();
      const visible = administrators.includes(role)
        ? rows.results
        : await Promise.all(rows.results.map(async (activity) => {
          const item = activity as { groupId: string | null };
          const permitted = role === 'coach'
            ? await isGroupCoach(env, session.user.id, clubId, item.groupId)
            : await assignedGroupAccess(env, session.user.id, clubId, item.groupId);
          return permitted ? activity : null;
        })).then((items) => items.filter(Boolean));
      return response({ activities: visible });
    }
    if (request.method === 'POST') {
      const body = await bodyOf(request);
      const title = string(body?.title, 160);
      const startAt = string(body?.startAt, 40);
      const endAt = string(body?.endAt, 40);
      const parsedPrice = body?.price === undefined || body.price === '' ? 0 : price(body.price);
      const capacity = body?.capacity === undefined || body.capacity === '' ? null : positiveInt(body.capacity);
      const recurrence = body?.recurrence ?? 'none';
      if (!administrators.includes(role) && !(role === 'coach' && await isGroupCoach(env, session.user.id, clubId, string(body?.groupId, 100)))) {
        return fail('FORBIDDEN', 'You cannot create this activity.', 403);
      }
      if (!title || !startAt || !endAt || Date.parse(endAt) <= Date.parse(startAt) || parsedPrice === null ||
        (body?.capacity !== undefined && body.capacity !== '' && !capacity) ||
        !['none', 'weekly', 'fortnightly', 'monthly'].includes(recurrence as string)) {
        return fail('VALIDATION_ERROR', 'Check the activity details, dates, capacity, and price.', 400);
      }
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO activities (id, club_id, group_id, title, description, location, start_at, end_at,
         organiser_user_id, capacity, price_pence, booking_deadline, recurrence, recurrence_until)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id, clubId, string(body?.groupId, 100), title, string(body?.description, 2000) ?? '',
        string(body?.location, 200) ?? '', startAt, endAt, session.user.id, capacity, parsedPrice,
        string(body?.bookingDeadline, 40), recurrence, string(body?.recurrenceUntil, 10),
      ).run();
      return response({ activity: { id, title, startAt, endAt, status: 'scheduled' } }, 201);
    }
  }

  if (resource === 'activities' && route.length === 2 && request.method === 'PATCH') {
    const activityId = route[1];
    const activity = await env.DB.prepare('SELECT group_id AS groupId FROM activities WHERE club_id = ? AND id = ?')
      .bind(clubId, activityId).first<{ groupId: string | null }>();
    if (!activity) return fail('NOT_FOUND', 'Activity not found.', 404);
    if (!administrators.includes(role) && !(role === 'coach' && await isGroupCoach(env, session.user.id, clubId, activity.groupId))) {
      return fail('FORBIDDEN', 'You cannot update this activity.', 403);
    }
    const body = await bodyOf(request);
    if (body?.status === 'cancelled') {
      await env.DB.prepare("UPDATE activities SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE club_id = ? AND id = ?")
        .bind(clubId, activityId).run();
      return response({ status: 'cancelled' });
    }
    return fail('VALIDATION_ERROR', 'Only cancellation is supported in this update.', 400);
  }

  if (resource === 'activities' && route.length === 3 && route[2] === 'bookings') {
    const activityId = route[1];
    if (request.method === 'GET') {
      const activity = await env.DB.prepare('SELECT group_id AS groupId FROM activities WHERE club_id = ? AND id = ?')
        .bind(clubId, activityId).first<{ groupId: string | null }>();
      if (!activity) return fail('NOT_FOUND', 'Activity not found.', 404);
      if (!administrators.includes(role) && !(role === 'coach' && await isGroupCoach(env, session.user.id, clubId, activity.groupId))) {
        return fail('FORBIDDEN', 'You cannot view this participant list.', 403);
      }
      const bookings = await env.DB.prepare(
        `SELECT b.id, b.member_profile_id AS memberId, mp.first_name AS firstName,
         mp.last_name AS lastName, b.booking_status AS status, b.booked_at AS bookedAt,
         ar.attendance_status AS attendanceStatus
         FROM activity_bookings b JOIN member_profiles mp ON mp.club_id = b.club_id AND mp.id = b.member_profile_id
         LEFT JOIN attendance_records ar ON ar.club_id = b.club_id AND ar.activity_id = b.activity_id AND ar.member_profile_id = b.member_profile_id
         WHERE b.club_id = ? AND b.activity_id = ? ORDER BY b.booked_at`,
      ).bind(clubId, activityId).all();
      return response({ bookings: bookings.results });
    }
    if (request.method === 'POST') {
      const body = await bodyOf(request);
      const memberId = string(body?.memberId, 100);
      if (!memberId || (!administrators.includes(role) && !await ownsProfile(env, session, clubId, memberId))) {
        return fail('FORBIDDEN', 'You cannot book for this member.', 403);
      }
      const booked = await env.DB.prepare(
        `INSERT INTO activity_bookings (id, club_id, activity_id, member_profile_id)
         SELECT ?, a.club_id, a.id, mp.id FROM activities a
         JOIN member_profiles mp ON mp.club_id = a.club_id AND mp.id = ? AND mp.membership_status = 'active'
         WHERE a.club_id = ? AND a.id = ? AND a.status = 'scheduled'
         AND (a.booking_deadline IS NULL OR julianday(a.booking_deadline) >= julianday('now'))
         AND (a.group_id IS NULL OR EXISTS (SELECT 1 FROM group_members gm
           WHERE gm.club_id = a.club_id AND gm.group_id = a.group_id AND gm.member_profile_id = mp.id))
         AND (a.capacity IS NULL OR (SELECT COUNT(*) FROM activity_bookings b
           WHERE b.club_id = a.club_id AND b.activity_id = a.id AND b.booking_status = 'booked') < a.capacity)`,
      ).bind(crypto.randomUUID(), memberId, clubId, activityId).run();
      if (booked.meta.changes) return response({ status: 'booked' }, 201);
      const existing = await env.DB.prepare(
        "SELECT booking_status AS status FROM activity_bookings WHERE club_id = ? AND activity_id = ? AND member_profile_id = ? AND booking_status IN ('booked', 'waitlisted')",
      ).bind(clubId, activityId, memberId).first();
      if (existing) return fail('DUPLICATE_BOOKING', 'This member already has an active booking.', 409);
      return fail('BOOKING_UNAVAILABLE', 'This activity is full, closed, or unavailable to this member.', 409);
    }
  }

  if (resource === 'bookings' && route.length === 2 && request.method === 'DELETE') {
    const booking = await env.DB.prepare(
      `SELECT b.member_profile_id AS memberId, a.booking_deadline AS deadline
       FROM activity_bookings b JOIN activities a ON a.club_id = b.club_id AND a.id = b.activity_id
       WHERE b.club_id = ? AND b.id = ? AND b.booking_status = 'booked'`,
    ).bind(clubId, route[1]).first<{ memberId: string; deadline: string | null }>();
    if (!booking) return fail('NOT_FOUND', 'Booking not found.', 404);
    if (!administrators.includes(role) && !await ownsProfile(env, session, clubId, booking.memberId)) return fail('FORBIDDEN', 'You cannot cancel this booking.', 403);
    if (booking.deadline && Date.parse(booking.deadline) < Date.now()) return fail('BOOKING_CLOSED', 'The cancellation deadline has passed.', 409);
    await env.DB.prepare("UPDATE activity_bookings SET booking_status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE club_id = ? AND id = ?")
      .bind(clubId, route[1]).run();
    return response({ status: 'cancelled' });
  }

  if (resource === 'activities' && route.length === 3 && route[2] === 'attendance' && request.method === 'PUT') {
    const activityId = route[1];
    const activity = await env.DB.prepare('SELECT group_id AS groupId FROM activities WHERE club_id = ? AND id = ?')
      .bind(clubId, activityId).first<{ groupId: string | null }>();
    if (!activity) return fail('NOT_FOUND', 'Activity not found.', 404);
    if (!administrators.includes(role) && !(role === 'coach' && await isGroupCoach(env, session.user.id, clubId, activity.groupId))) {
      return fail('FORBIDDEN', 'You cannot record attendance for this activity.', 403);
    }
    const body = await bodyOf(request);
    if (!Array.isArray(body?.records) || body.records.length > 500) return fail('VALIDATION_ERROR', 'A valid attendance list is required.', 400);
    const records = body.records as { memberId?: unknown; status?: unknown }[];
    if (records.some((record) => typeof record.memberId !== 'string' || !['present', 'absent', 'excused'].includes(record.status as string))) {
      return fail('VALIDATION_ERROR', 'Each attendance record needs a member and a valid status.', 400);
    }
    const writes: D1PreparedStatement[] = [];
    for (const record of records) {
      writes.push(env.DB.prepare(
        `INSERT INTO attendance_records (id, club_id, activity_id, member_profile_id, attendance_status, recorded_by)
         SELECT ?, ?, ?, mp.id, ?, ? FROM member_profiles mp WHERE mp.club_id = ? AND mp.id = ?
         ON CONFLICT(activity_id, member_profile_id) DO UPDATE SET attendance_status = excluded.attendance_status,
         recorded_by = excluded.recorded_by, updated_at = CURRENT_TIMESTAMP`,
      ).bind(crypto.randomUUID(), clubId, activityId, record.status, session.user.id, clubId, record.memberId as string));
    }
    if (writes.length) await env.DB.batch(writes);
    return response({ saved: writes.length });
  }

  if (resource === 'announcements' && route.length === 1) {
    if (request.method === 'GET') {
      const rows = await env.DB.prepare(
        `SELECT a.id, a.title, a.message, a.status, a.publish_at AS publishAt, a.published_at AS publishedAt
         FROM announcements a WHERE a.club_id = ? AND a.status = 'published' AND (a.publish_at IS NULL OR a.publish_at <= datetime('now'))
         AND (? = 1 OR a.audience_type = 'club' OR EXISTS (
           SELECT 1 FROM announcement_groups ag JOIN group_members gm ON gm.club_id = ag.club_id AND gm.group_id = ag.group_id
           JOIN member_profiles mp ON mp.club_id = gm.club_id AND mp.id = gm.member_profile_id
           WHERE ag.club_id = a.club_id AND ag.announcement_id = a.id AND (
             mp.user_id = ? OR EXISTS (SELECT 1 FROM guardian_relationships gr WHERE gr.club_id = mp.club_id
               AND gr.child_member_profile_id = mp.id AND gr.guardian_user_id = ?)
           )
         )) ORDER BY a.published_at DESC`,
      ).bind(clubId, administrators.includes(role) ? 1 : 0, session.user.id, session.user.id).all();
      return response({ announcements: rows.results });
    }
    if (request.method === 'POST') {
      if (!administrators.includes(role)) return fail('FORBIDDEN', 'You cannot publish announcements.', 403);
      const body = await bodyOf(request);
      const title = string(body?.title, 160);
      const message = string(body?.message, 10000);
      if (!title || !message) return fail('VALIDATION_ERROR', 'Title and message are required.', 400);
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO announcements (id, club_id, title, message, created_by, published_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      ).bind(id, clubId, title, message, session.user.id).run();
      return response({ announcement: { id, title, message, status: 'published' } }, 201);
    }
  }

  if (resource === 'payments' && route.length === 1) {
    if (request.method === 'GET') {
      const memberId = new URL(request.url).searchParams.get('memberId');
      if (!administrators.includes(role) && (!memberId || !await ownsProfile(env, session, clubId, memberId))) {
        return fail('FORBIDDEN', 'You cannot view these payment records.', 403);
      }
      const rows = await env.DB.prepare(
        `SELECT p.id, p.member_profile_id AS memberId, mp.first_name AS firstName, mp.last_name AS lastName,
         p.amount_pence AS amountPence, p.payment_method AS method, p.payment_status AS status,
         p.payment_date AS paymentDate, p.due_date AS dueDate, p.reference
         FROM payment_records p JOIN member_profiles mp ON mp.club_id = p.club_id AND mp.id = p.member_profile_id
         WHERE p.club_id = ? AND (? IS NULL OR p.member_profile_id = ?) ORDER BY COALESCE(p.due_date, p.payment_date) DESC`,
      ).bind(clubId, memberId, memberId).all();
      return response({ payments: rows.results });
    }
    if (request.method === 'POST') {
      if (!administrators.includes(role)) return fail('FORBIDDEN', 'You cannot record payments.', 403);
      const body = await bodyOf(request);
      const memberId = string(body?.memberId, 100);
      const amountPence = typeof body?.amount === 'number' ? price(body.amount) : null;
      const status = body?.status;
      if (!memberId || amountPence === null || amountPence === 0 || !['due', 'paid', 'part_paid', 'overdue'].includes(status as string)) {
        return fail('VALIDATION_ERROR', 'Provide a member, positive amount, and valid payment status.', 400);
      }
      const member = await env.DB.prepare('SELECT id FROM member_profiles WHERE club_id = ? AND id = ?').bind(clubId, memberId).first();
      if (!member) return fail('NOT_FOUND', 'Member not found.', 404);
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO payment_records (id, club_id, member_profile_id, amount_pence, payment_method,
         payment_status, payment_date, due_date, reference, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, clubId, memberId, amountPence, string(body?.method, 40) ?? 'other', status,
        status === 'paid' ? string(body?.paymentDate, 10) ?? new Date().toISOString().slice(0, 10) : null,
        string(body?.dueDate, 10), string(body?.reference, 120), session.user.id).run();
      return response({ id, amountPence, status }, 201);
    }
  }

  if (resource === 'reports' && route.length === 2 && route[1] === 'members.csv' && request.method === 'GET') {
    if (!administrators.includes(role)) return fail('FORBIDDEN', 'You cannot export member reports.', 403);
    const result = await env.DB.prepare(
      `SELECT first_name, last_name, email, phone, membership_status, membership_start_date, membership_end_date
       FROM member_profiles WHERE club_id = ? ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE`,
    ).bind(clubId).all<Record<string, string | null>>();
    const fields = ['first_name', 'last_name', 'email', 'phone', 'membership_status', 'membership_start_date', 'membership_end_date'];
    const escape = (value: unknown) => {
      const cell = String(value ?? '').replace(/^[\t\r ]*(?=[=+\-@])/, "'");
      return `"${cell.replace(/"/g, '""')}"`;
    };
    const csv = [fields.join(','), ...result.results.map((row) => fields.map((field) => escape(row[field])).join(','))].join('\r\n');
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="clubhub-members.csv"',
        'Cache-Control': 'no-store',
      },
    });
  }

  if (resource === 'portal' && route.length === 1 && request.method === 'GET') {
    const profiles = await env.DB.prepare(
      `SELECT id, first_name AS firstName, last_name AS lastName, email, phone,
       membership_status AS status, membership_start_date AS startDate, membership_end_date AS endDate
       FROM member_profiles WHERE club_id = ? AND user_id = ?
       UNION SELECT mp.id, mp.first_name, mp.last_name, mp.email, mp.phone, mp.membership_status,
       mp.membership_start_date, mp.membership_end_date FROM member_profiles mp
       JOIN guardian_relationships gr ON gr.club_id = mp.club_id AND gr.child_member_profile_id = mp.id
       WHERE gr.club_id = ? AND gr.guardian_user_id = ?`,
    ).bind(clubId, session.user.id, clubId, session.user.id).all();
    if (!profiles.results.length) return fail('NOT_FOUND', 'No member profile is linked to this account.', 404);
    const requestedMemberId = new URL(request.url).searchParams.get('memberId');
    if (requestedMemberId && !profiles.results.some((profile) => (profile as { id: string }).id === requestedMemberId)) {
      return fail('FORBIDDEN', 'You cannot view this member profile.', 403);
    }
    const visibleMemberIds = requestedMemberId ? [requestedMemberId] : profiles.results.map((profile) => (profile as { id: string }).id);
    const memberPlaceholders = visibleMemberIds.map(() => '?').join(',');
    const [activities, attendance, payments, announcements] = await Promise.all([
      env.DB.prepare(
        `SELECT a.id, a.title, a.start_at AS startAt, a.end_at AS endAt, a.location, a.capacity,
         (SELECT COUNT(*) FROM activity_bookings booked WHERE booked.club_id = a.club_id
           AND booked.activity_id = a.id AND booked.booking_status = 'booked') AS bookedCount,
         b.id AS bookingId, b.booking_status AS bookingStatus
         FROM activities a LEFT JOIN activity_bookings b ON b.club_id = a.club_id AND b.activity_id = a.id
         AND b.member_profile_id IN (${memberPlaceholders}) AND b.booking_status = 'booked'
         WHERE a.club_id = ? AND a.status = 'scheduled' AND julianday(a.start_at) >= julianday('now')
         AND (a.group_id IS NULL OR EXISTS (SELECT 1 FROM group_members gm
           WHERE gm.club_id = a.club_id AND gm.group_id = a.group_id AND gm.member_profile_id IN (${memberPlaceholders})))
         ORDER BY a.start_at LIMIT 50`,
      ).bind(...visibleMemberIds, clubId, ...visibleMemberIds),
      env.DB.prepare(
        `SELECT activity_id AS activityId, member_profile_id AS memberId, attendance_status AS status, recorded_at AS recordedAt
        FROM attendance_records WHERE club_id = ? AND member_profile_id IN (${memberPlaceholders}) ORDER BY recorded_at DESC LIMIT 100`,
      ).bind(clubId, ...visibleMemberIds),
      env.DB.prepare(
        `SELECT id, member_profile_id AS memberId, amount_pence AS amountPence, payment_status AS status,
         payment_date AS paymentDate, due_date AS dueDate FROM payment_records
        WHERE club_id = ? AND member_profile_id IN (${memberPlaceholders}) ORDER BY COALESCE(payment_date, due_date) DESC LIMIT 100`,
      ).bind(clubId, ...visibleMemberIds),
      env.DB.prepare(
        `SELECT id, title, message, published_at AS publishedAt FROM announcements
         WHERE club_id = ? AND status = 'published' AND (audience_type = 'club' OR EXISTS (
           SELECT 1 FROM announcement_groups ag JOIN group_members gm
           ON gm.club_id = ag.club_id AND gm.group_id = ag.group_id
           WHERE ag.club_id = announcements.club_id AND ag.announcement_id = announcements.id
           AND gm.member_profile_id IN (${memberPlaceholders})
         )) ORDER BY published_at DESC LIMIT 20`,
      ).bind(clubId, ...visibleMemberIds),
    ]);
    return response({ profiles: profiles.results, activities: (await activities.all()).results,
      attendance: (await attendance.all()).results, payments: (await payments.all()).results,
      announcements: (await announcements.all()).results });
  }

  return fail('NOT_FOUND', 'Route not found.', 404);
}