import type { createAuth } from './auth';
import type { Env } from './auth';
import { handleOperationsApi } from './operations-api';

type Auth = ReturnType<typeof createAuth>;
type ClubRole = 'owner' | 'administrator' | 'coach' | 'member' | 'guardian';
type MemberStatus = 'pending' | 'active' | 'suspended' | 'expired' | 'cancelled';

const adminRoles: ClubRole[] = ['owner', 'administrator'];
const memberStatuses: MemberStatus[] = ['pending', 'active', 'suspended', 'expired', 'cancelled'];

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

function error(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status);
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? body as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function text(value: unknown, maxLength = 500): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean.length > 0 && clean.length <= maxLength ? clean : null;
}

function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function validLogoUrl(value: string | null): boolean {
  if (!value) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

async function requireMembership(
  env: Env,
  userId: string,
  clubId: string,
): Promise<{ role: ClubRole } | null> {
  return env.DB.prepare(
    `SELECT role FROM club_memberships
     WHERE club_id = ? AND user_id = ? AND status = 'active'`,
  ).bind(clubId, userId).first<{ role: ClubRole }>();
}

function ownsRequest(request: Request, env: Env): boolean {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) return true;
  if (!env.BETTER_AUTH_URL) return false;
  const origin = request.headers.get('origin');
  return origin === new URL(env.BETTER_AUTH_URL).origin;
}

export async function handleClubApi(request: Request, env: Env, auth: Auth): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return error('UNAUTHENTICATED', 'Sign in to continue.', 401);
  if (!ownsRequest(request, env)) return error('INVALID_ORIGIN', 'Request origin is not allowed.', 403);

  const parts = new URL(request.url).pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] !== 'api' || parts[1] !== 'v1') return error('NOT_FOUND', 'Route not found.', 404);

  if (parts.length === 3 && parts[2] === 'clubs') {
    if (request.method === 'GET') {
      const result = await env.DB.prepare(
        `SELECT c.id, c.name, c.description, c.category, c.currency, c.status, m.role
         FROM clubs c JOIN club_memberships m ON m.club_id = c.id
         WHERE m.user_id = ? AND m.status = 'active' AND c.status = 'active'
         ORDER BY c.name COLLATE NOCASE`,
      ).bind(session.user.id).all();
      return json({ clubs: result.results });
    }

    if (request.method === 'POST') {
      const body = await readBody(request);
      const name = text(body?.name, 120);
      if (!name) return error('VALIDATION_ERROR', 'Club name is required.', 400);

      const id = crypto.randomUUID();
      const fields = {
        description: text(body?.description, 2000) ?? '',
        logoUrl: text(body?.logoUrl, 1000),
        contactEmail: text(body?.contactEmail, 254),
        contactPhone: text(body?.contactPhone, 40),
        address: text(body?.address, 500),
        timezone: text(body?.timezone, 80) ?? 'Europe/London',
        category: text(body?.category, 80) ?? 'Community',
        membershipTerms: text(body?.membershipTerms, 5000) ?? '',
      };
      if ((fields.contactEmail && !validEmail(fields.contactEmail)) || !validLogoUrl(fields.logoUrl)) {
        return error('VALIDATION_ERROR', 'Check the contact email and use a secure HTTPS logo URL.', 400);
      }

      await env.DB.batch([
        env.DB.prepare(
           `INSERT INTO clubs (id, name, description, logo_url, contact_email, contact_phone, address, timezone, category, membership_terms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ).bind(id, name, fields.description, fields.logoUrl, fields.contactEmail, fields.contactPhone, fields.address, fields.timezone, fields.category, fields.membershipTerms),
        env.DB.prepare(
          `INSERT INTO club_memberships (id, club_id, user_id, role, status)
           VALUES (?, ?, ?, 'owner', 'active')`,
        ).bind(crypto.randomUUID(), id, session.user.id),
      ]);
      return json({ club: { id, name, ...fields, currency: 'GBP', role: 'owner' } }, 201);
    }
    return error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
  }

  if (parts.length < 4 || parts[2] !== 'clubs') return error('NOT_FOUND', 'Route not found.', 404);
  const clubId = parts[3];
  const membership = await requireMembership(env, session.user.id, clubId);
  if (!membership) return error('NOT_FOUND', 'Club not found.', 404);

  if (parts.length === 4) {
    if (request.method === 'GET') {
      const club = await env.DB.prepare(
        `SELECT id, name, description, logo_url AS logoUrl, contact_email AS contactEmail,
         contact_phone AS contactPhone, address, timezone, category, currency,
         membership_terms AS membershipTerms, status FROM clubs WHERE id = ? AND status = 'active'`,
      ).bind(clubId).first();
      return club ? json({ club: { ...club, role: membership.role } }) : error('NOT_FOUND', 'Club not found.', 404);
    }
    if (request.method === 'PATCH') {
      if (!adminRoles.includes(membership.role)) return error('FORBIDDEN', 'You cannot edit this club.', 403);
      const body = await readBody(request);
      if (!body) return error('VALIDATION_ERROR', 'A valid JSON body is required.', 400);

      const current = await env.DB.prepare('SELECT * FROM clubs WHERE id = ? AND status = \'active\'').bind(clubId).first<Record<string, unknown>>();
      if (!current) return error('NOT_FOUND', 'Club not found.', 404);
      const name = body.name === undefined ? current.name as string : text(body.name, 120);
      const contactEmail = body.contactEmail === undefined ? current.contact_email as string | null : text(body.contactEmail, 254);
      const logoUrl = body.logoUrl === undefined ? current.logo_url as string | null : text(body.logoUrl, 1000);
      if (!name || (contactEmail && !validEmail(contactEmail)) || !validLogoUrl(logoUrl)) {
        return error('VALIDATION_ERROR', 'Check the club name and contact email, and use a secure HTTPS logo URL.', 400);
      }
      const patch = {
        name,
        description: body.description === undefined ? current.description as string : text(body.description, 2000) ?? '',
        logoUrl,
        contactEmail,
        contactPhone: body.contactPhone === undefined ? current.contact_phone as string | null : text(body.contactPhone, 40),
        address: body.address === undefined ? current.address as string | null : text(body.address, 500),
        timezone: body.timezone === undefined ? current.timezone as string : text(body.timezone, 80) ?? 'Europe/London',
        category: body.category === undefined ? current.category as string : text(body.category, 80) ?? 'Community',
        membershipTerms: body.membershipTerms === undefined ? current.membership_terms as string : text(body.membershipTerms, 5000) ?? '',
      };
      await env.DB.prepare(
        `UPDATE clubs SET name = ?, description = ?, logo_url = ?, contact_email = ?, contact_phone = ?, address = ?,
         timezone = ?, category = ?, membership_terms = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ).bind(patch.name, patch.description, patch.logoUrl, patch.contactEmail, patch.contactPhone, patch.address, patch.timezone, patch.category, patch.membershipTerms, clubId).run();
      return json({ club: { id: clubId, ...patch, currency: 'GBP', role: membership.role } });
    }
    return error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
  }

  if (parts[4] === 'dashboard' && parts.length === 5 && request.method === 'GET') {
    if (!adminRoles.includes(membership.role)) return error('FORBIDDEN', 'You cannot view club-wide reports.', 403);
    const [members, pending, upcoming, payments, announcements, activities] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS count FROM member_profiles WHERE club_id = ? AND membership_status = 'active'").bind(clubId).first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM member_profiles WHERE club_id = ? AND membership_status = 'pending'").bind(clubId).first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM activities WHERE club_id = ? AND status = 'scheduled' AND julianday(start_at) >= julianday('now')").bind(clubId).first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM payment_records WHERE club_id = ? AND payment_status IN ('due', 'part_paid', 'overdue')").bind(clubId).first<{ count: number }>(),
      env.DB.prepare("SELECT id, title, message, published_at AS publishedAt FROM announcements WHERE club_id = ? AND status = 'published' ORDER BY published_at DESC LIMIT 5").bind(clubId).all(),
      env.DB.prepare("SELECT id, title, start_at AS startAt, end_at AS endAt, location, capacity FROM activities WHERE club_id = ? AND status = 'scheduled' AND julianday(start_at) >= julianday('now') ORDER BY start_at LIMIT 5").bind(clubId).all(),
    ]);
    return json({
      summary: {
        activeMembers: members?.count ?? 0,
        pendingApplications: pending?.count ?? 0,
        upcomingActivities: upcoming?.count ?? 0,
        outstandingPayments: payments?.count ?? 0,
      },
      activities: activities.results,
      announcements: announcements.results,
    });
  }

  if (parts[4] === 'members' && parts.length === 5) {
    if (request.method === 'GET') {
      if (!adminRoles.includes(membership.role)) return error('FORBIDDEN', 'You cannot view the club member roster.', 403);
      const search = text(new URL(request.url).searchParams.get('q'), 100);
      const status = new URL(request.url).searchParams.get('status');
      if (status && !memberStatuses.includes(status as MemberStatus)) return error('VALIDATION_ERROR', 'Invalid membership status.', 400);
      const rows = await env.DB.prepare(
        `SELECT id, first_name AS firstName, last_name AS lastName, email, phone,
         membership_status AS status, membership_start_date AS startDate,
         membership_end_date AS endDate, emergency_contact_name AS emergencyContactName,
         emergency_contact_phone AS emergencyContactPhone, notes
         FROM member_profiles WHERE club_id = ?
         AND (? IS NULL OR membership_status = ?)
         AND (? IS NULL OR first_name LIKE '%' || ? || '%' OR last_name LIKE '%' || ? || '%' OR email LIKE '%' || ? || '%')
         ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE`,
      ).bind(clubId, status, status, search, search, search, search).all();
      return json({ members: rows.results });
    }
    if (request.method === 'POST') {
      if (!adminRoles.includes(membership.role)) return error('FORBIDDEN', 'You cannot register members.', 403);
      const body = await readBody(request);
      const firstName = text(body?.firstName, 100);
      const lastName = text(body?.lastName, 100);
      const email = text(body?.email, 254);
      const phone = text(body?.phone, 40);
      const startDate = text(body?.startDate, 10);
      const status = body?.status === undefined ? 'pending' : body.status;
      if (!firstName || !lastName || !startDate || !validDate(startDate) || (email && !validEmail(email)) || (phone === null && body?.phone !== undefined) || !memberStatuses.includes(status as MemberStatus)) {
        return error('VALIDATION_ERROR', 'Check the member details and membership dates.', 400);
      }
      if (email) {
        const duplicate = await env.DB.prepare(
          'SELECT id FROM member_profiles WHERE club_id = ? AND lower(email) = lower(?) LIMIT 1',
        ).bind(clubId, email).first();
        if (duplicate) return error('DUPLICATE_MEMBER', 'A member with this email already exists in this club.', 409);
      }

      const id = crypto.randomUUID();
      const linkedUser = email
        ? await env.DB.prepare('SELECT id FROM user WHERE lower(email) = lower(?)').bind(email).first<{ id: string }>()
        : null;
      const statements = [env.DB.prepare(
        `INSERT INTO member_profiles
         (id, club_id, user_id, first_name, last_name, email, phone, membership_status, membership_start_date,
          emergency_contact_name, emergency_contact_phone, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id,
        clubId,
        linkedUser?.id ?? null,
        firstName,
        lastName,
        email,
        phone,
        status,
        startDate,
        text(body?.emergencyContactName, 120),
        text(body?.emergencyContactPhone, 40),
        text(body?.notes, 2000) ?? '',
      )];
      if (linkedUser) {
        statements.push(env.DB.prepare(
          `INSERT OR IGNORE INTO club_memberships (id, club_id, user_id, role, status)
           VALUES (?, ?, ?, 'member', ?)`,
        ).bind(crypto.randomUUID(), clubId, linkedUser.id, status));
      }
      const guardianEmail = text(body?.guardianEmail, 254);
      let guardianUser: { id: string } | null = null;
      if (guardianEmail) {
        guardianUser = await env.DB.prepare('SELECT id FROM user WHERE lower(email) = lower(?)').bind(guardianEmail).first<{ id: string }>();
        if (!guardianUser) return error('GUARDIAN_NOT_FOUND', 'The guardian must create a ClubHub account before linking.', 404);
        statements.push(env.DB.prepare(
          `INSERT OR IGNORE INTO club_memberships (id, club_id, user_id, role, status)
           VALUES (?, ?, ?, 'guardian', ?)`,
        ).bind(crypto.randomUUID(), clubId, guardianUser.id, status));
        statements.push(env.DB.prepare(
          `INSERT INTO guardian_relationships (id, club_id, guardian_user_id, child_member_profile_id)
           VALUES (?, ?, ?, ?)`,
        ).bind(crypto.randomUUID(), clubId, guardianUser.id, id));
      }
      try {
        await env.DB.batch(statements);
      } catch {
        return error('DUPLICATE_MEMBER', 'A member with this email already exists in this club.', 409);
      }
      return json({ member: { id, firstName, lastName, email, phone, status, startDate } }, 201);
    }
    return error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
  }

  if (parts[4] === 'members' && parts.length === 6 && request.method === 'PATCH') {
    if (!adminRoles.includes(membership.role)) return error('FORBIDDEN', 'You cannot update members.', 403);
    const body = await readBody(request);
    if (!body || !memberStatuses.includes(body.status as MemberStatus)) {
      return error('VALIDATION_ERROR', 'A valid membership status is required.', 400);
    }
    const update = await env.DB.prepare(
      `UPDATE member_profiles SET membership_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE club_id = ? AND id = ?`,
    ).bind(body.status, clubId, parts[5]).run();
    if (!update.meta.changes) return error('NOT_FOUND', 'Member not found.', 404);
    await env.DB.prepare(
      `UPDATE club_memberships SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE club_id = ? AND user_id = (SELECT user_id FROM member_profiles WHERE club_id = ? AND id = ?)`,
    ).bind(body.status, clubId, clubId, parts[5]).run();
    await env.DB.prepare(
      `UPDATE club_memberships SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE club_id = ? AND role = 'guardian' AND user_id IN (
         SELECT guardian_user_id FROM guardian_relationships WHERE club_id = ? AND child_member_profile_id = ?
       )`,
    ).bind(body.status, clubId, clubId, parts[5]).run();
    await env.DB.prepare(
      `INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id)
       VALUES (?, ?, ?, 'membership_status_changed', 'member', ?)`,
    ).bind(crypto.randomUUID(), clubId, session.user.id, parts[5]).run();
    return json({ status: body.status });
  }

  if (parts[4] === 'members' && parts.length === 7 && parts[6] === 'guardian' && request.method === 'POST') {
    if (!adminRoles.includes(membership.role)) return error('FORBIDDEN', 'You cannot link a guardian.', 403);
    const body = await readBody(request);
    const guardianEmail = text(body?.email, 254);
    if (!guardianEmail || !validEmail(guardianEmail)) return error('VALIDATION_ERROR', 'Enter a valid guardian email.', 400);
    const guardian = await env.DB.prepare('SELECT id FROM user WHERE lower(email) = lower(?)').bind(guardianEmail).first<{ id: string }>();
    if (!guardian) return error('GUARDIAN_NOT_FOUND', 'The guardian must create a ClubHub account before linking.', 404);
    const member = await env.DB.prepare('SELECT id, membership_status AS status FROM member_profiles WHERE club_id = ? AND id = ?')
      .bind(clubId, parts[5]).first<{ id: string; status: MemberStatus }>();
    if (!member) return error('NOT_FOUND', 'Member not found.', 404);
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO club_memberships (id, club_id, user_id, role, status) VALUES (?, ?, ?, 'guardian', ?)")
        .bind(crypto.randomUUID(), clubId, guardian.id, member.status),
      env.DB.prepare('INSERT OR IGNORE INTO guardian_relationships (id, club_id, guardian_user_id, child_member_profile_id) VALUES (?, ?, ?, ?)')
        .bind(crypto.randomUUID(), clubId, guardian.id, member.id),
    ]);
    return json({ linked: true }, 201);
  }
  return handleOperationsApi(request, env, session, clubId, parts.slice(4), membership.role);
}