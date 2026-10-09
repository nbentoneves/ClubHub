import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Env } from '../auth';
import { createAuth } from '../auth';
import { handleClubApi } from '../club-api';
import { handleOperationsApi } from '../operations-api';

const clubId = 'club-main';
const memberUserId = 'user-member';
const otherUserId = 'user-other';
const guardianUserId = 'user-guardian';
const adminUserId = 'user-admin';
const memberId = 'profile-member';
const childId = 'profile-child';
const activityId = 'activity-capacity';

class TestD1 {
  private readonly sqlite = new DatabaseSync(':memory:');

  async exec(sql: string): Promise<void> {
    this.sqlite.exec(sql);
  }

  prepare(sql: string): D1PreparedStatement {
    const create = (values: unknown[] = []): D1PreparedStatement => {
      const bound = this.sqlite.prepare(sql);
      return {
        bind: (...nextValues: unknown[]) => create(nextValues),
        first: async <T>(columnName?: string) => {
          const row = bound.get(...values as never[]) as Record<string, unknown> | undefined;
          return (columnName && row ? row[columnName] : row ?? null) as T | null;
        },
        all: async <T>() => ({ results: bound.all(...values as never[]) as T[] }) as D1Result<T>,
        run: async () => {
          const result = bound.run(...values as never[]);
          return { success: true, meta: { changes: Number(result.changes) } } as D1Result;
        },
      } as unknown as D1PreparedStatement;
    };
    return create();
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    this.sqlite.exec('BEGIN');
    try {
      const results: D1Result<T>[] = [];
      for (const statement of statements) results.push(await statement.run() as D1Result<T>);
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }

  close(): void {
    this.sqlite.close();
  }
}

const database = new TestD1();
const env = { DB: database as unknown as D1Database } as Env;

async function seed(sql: string, values: (string | number | null)[] = []): Promise<void> {
  await env.DB.prepare(sql).bind(...values).run();
}

function call(path: string, userId: string, method = 'GET', body?: unknown) {
  const request = new Request(`https://clubhub.test/api/v1/clubs/${clubId}/${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handleOperationsApi(request, env, { user: { id: userId, email: `${userId}@example.test` } }, clubId,
    path.split('/'), 'member');
}

describe('Club operations API with D1', () => {
  beforeAll(async () => {
    const migration = await readFile(new URL('../../../migrations/0001_initial.sql', import.meta.url), 'utf8');
    await database.exec(migration);

    await seed("INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('user-member', 'Member One', 'member@example.test', 0, 0)");
    await seed("INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('user-other', 'Member Two', 'other@example.test', 0, 0)");
    await seed("INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('user-guardian', 'Guardian', 'guardian@example.test', 0, 0)");
    await seed("INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('user-admin', 'Club Admin', 'admin@example.test', 0, 0)");
    await seed("INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('user-new', 'New Member', 'new-member@example.test', 0, 0)");
    await seed("INSERT INTO clubs (id, name) VALUES (?, 'Main Club')", [clubId]);
    await seed("INSERT INTO clubs (id, name) VALUES ('club-other', 'Other Club')");
    await seed("INSERT INTO club_memberships (id, club_id, user_id, role, status) VALUES ('membership-one', ?, ?, 'member', 'active')", [clubId, memberUserId]);
    await seed("INSERT INTO club_memberships (id, club_id, user_id, role, status) VALUES ('membership-two', ?, ?, 'member', 'active')", [clubId, otherUserId]);
    await seed("INSERT INTO club_memberships (id, club_id, user_id, role, status) VALUES ('membership-guardian', ?, ?, 'guardian', 'active')", [clubId, guardianUserId]);
    await seed("INSERT INTO club_memberships (id, club_id, user_id, role, status) VALUES ('membership-admin', ?, ?, 'administrator', 'active')", [clubId, adminUserId]);
    await seed("INSERT INTO club_memberships (id, club_id, user_id, role, status) VALUES ('membership-other', 'club-other', ?, 'member', 'active')", [otherUserId]);
    await seed("INSERT INTO member_profiles (id, club_id, user_id, first_name, last_name, membership_status, membership_start_date) VALUES (?, ?, ?, 'Member', 'One', 'active', '2026-01-01')", [memberId, clubId, memberUserId]);
    await seed("INSERT INTO member_profiles (id, club_id, first_name, last_name, membership_status, membership_start_date) VALUES ('profile-formula', ?, '=1+1', 'Sheet', 'active', '2026-01-01')", [clubId]);
    await seed("INSERT INTO member_profiles (id, club_id, first_name, last_name, membership_status, membership_start_date) VALUES (?, ?, 'Child', 'One', 'active', '2026-01-01')", [childId, clubId]);
    await seed("INSERT INTO guardian_relationships (id, club_id, guardian_user_id, child_member_profile_id) VALUES ('guardian-link', ?, ?, ?)", [clubId, guardianUserId, childId]);
    await seed("INSERT INTO activities (id, club_id, title, start_at, end_at, capacity) VALUES (?, ?, 'Capacity session', '2027-01-01T10:00:00.000Z', '2027-01-01T11:00:00.000Z', 1)", [activityId, clubId]);
  });

  afterAll(() => database.close());

  it('enforces active-booking uniqueness and activity capacity', async () => {
    const firstBooking = await call(`activities/${activityId}/bookings`, memberUserId, 'POST', { memberId });
    expect(firstBooking.status).toBe(201);

    const duplicate = await call(`activities/${activityId}/bookings`, memberUserId, 'POST', { memberId });
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ error: { code: 'DUPLICATE_BOOKING' } });

    await seed("INSERT INTO member_profiles (id, club_id, user_id, first_name, last_name, membership_status, membership_start_date) VALUES ('profile-other', ?, ?, 'Member', 'Two', 'active', '2026-01-01')", [clubId, otherUserId]);
    const capacityReached = await call(`activities/${activityId}/bookings`, otherUserId, 'POST', { memberId: 'profile-other' });
    expect(capacityReached.status).toBe(409);
    expect(await capacityReached.json()).toMatchObject({ error: { code: 'BOOKING_UNAVAILABLE' } });
  });

  it('limits guardian portal data to children linked to that guardian', async () => {
    const portal = await call('portal', guardianUserId);
    expect(portal.status).toBe(200);
    const result = await portal.json() as { profiles: { id: string }[] };
    expect(result.profiles.map((profile) => profile.id)).toEqual([childId]);
  });

  it('does not allow a user to book another member profile by identifier', async () => {
    const response = await call(`activities/${activityId}/bookings`, memberUserId, 'POST', { memberId: childId });
    expect(response.status).toBe(403);
  });

  it('hides another club and blocks member access to club-wide dashboard data', async () => {
    const auth = { api: { getSession: async () => ({ user: { id: memberUserId } }) } } as unknown as ReturnType<typeof import('../auth').createAuth>;
    const foreignClub = await handleClubApi(new Request('https://clubhub.test/api/v1/clubs/club-other'), env, auth);
    expect(foreignClub.status).toBe(404);

    const dashboard = await handleClubApi(new Request(`https://clubhub.test/api/v1/clubs/${clubId}/dashboard`), env, auth);
    expect(dashboard.status).toBe(403);
  });

  it('escapes spreadsheet formulas in member CSV exports', async () => {
    const request = new Request(`https://clubhub.test/api/v1/clubs/${clubId}/reports/members.csv`);
    const report = await handleOperationsApi(request, env, { user: { id: adminUserId, email: 'admin@example.test' } },
      clubId, ['reports', 'members.csv'], 'administrator');
    expect(report.status).toBe(200);
    expect(await report.text()).toContain("'=1+1");
  });

  it('registers accounts once and links existing guardian accounts', async () => {
    env.BETTER_AUTH_URL = 'https://clubhub.test';
    const auth = { api: { getSession: async () => ({ user: { id: adminUserId } }) } } as unknown as ReturnType<typeof createAuth>;
    const payload = {
      firstName: 'New',
      lastName: 'Member',
      email: 'new-member@example.test',
      guardianEmail: 'guardian@example.test',
      status: 'active',
      startDate: '2026-01-01',
    };
    const create = () => handleClubApi(new Request(`https://clubhub.test/api/v1/clubs/${clubId}/members`, {
      method: 'POST',
      headers: { Origin: 'https://clubhub.test', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }), env, auth);

    const created = await create();
    expect(created.status).toBe(201);
    const linkedProfile = await env.DB.prepare(
      'SELECT id FROM member_profiles WHERE club_id = ? AND email = ?',
    ).bind(clubId, payload.email).first<{ id: string }>();
    expect(linkedProfile).toBeTruthy();
    const guardianLink = await env.DB.prepare(
      'SELECT id FROM guardian_relationships WHERE club_id = ? AND guardian_user_id = ? AND child_member_profile_id = ?',
    ).bind(clubId, guardianUserId, linkedProfile?.id).first();
    expect(guardianLink).toBeTruthy();

    const duplicate = await create();
    expect(duplicate.status).toBe(409);
  });
});