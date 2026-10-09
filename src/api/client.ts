import type { HealthResponse } from '../shared/api';

export type ApiFailure = Error & { status?: number; code?: string };

export type AppUser = { id: string; name: string; email: string };
export type Club = {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  timezone?: string;
  membershipTerms?: string;
  category?: string;
  currency?: string;
  role: 'owner' | 'administrator' | 'coach' | 'member' | 'guardian';
};
export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: 'pending' | 'active' | 'suspended' | 'expired' | 'cancelled';
  startDate: string;
  endDate?: string | null;
};
export type Group = { id: string; name: string; description: string; capacity: number | null; memberCount: number; memberIds: string | null };
export type Activity = {
  id: string;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  capacity: number | null;
  bookedCount: number;
  groupId: string | null;
  groupName: string | null;
  status: 'scheduled' | 'cancelled' | 'completed';
};
export type Announcement = { id: string; title: string; message: string; publishedAt: string | null };
export type DashboardData = {
  summary: { activeMembers: number; pendingApplications: number; upcomingActivities: number; outstandingPayments: number };
  activities: Activity[];
  announcements: Announcement[];
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  });
  const data: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const errorData = data as { error?: { code?: string; message?: string } } | null;
    const error = new Error(errorData?.error?.message ?? `Request failed (${response.status}).`) as ApiFailure;
    error.status = response.status;
    error.code = errorData?.error?.code;
    throw error;
  }
  return data as T;
}

export const authApi = {
  session: () => request<{ user: AppUser; session: { id: string } } | null>('/api/auth/get-session'),
  signIn: (email: string, password: string) => request('/api/auth/sign-in/email', {
    method: 'POST', body: JSON.stringify({ email, password }),
  }),
  signUp: (name: string, email: string, password: string) => request('/api/auth/sign-up/email', {
    method: 'POST', body: JSON.stringify({ name, email, password }),
  }),
  requestPasswordReset: (email: string) => request('/api/auth/request-password-reset', {
    method: 'POST', body: JSON.stringify({ email, redirectTo: window.location.origin }),
  }),
  resetPassword: (token: string, newPassword: string) => request(
    `/api/auth/reset-password?token=${encodeURIComponent(token)}`,
    { method: 'POST', body: JSON.stringify({ newPassword }) },
  ),
  signOut: () => request('/api/auth/sign-out', { method: 'POST' }),
};

export const clubApi = {
  list: () => request<{ clubs: Club[] }>('/api/v1/clubs'),
  create: (data: Record<string, unknown>) => request<{ club: Club }>('/api/v1/clubs', { method: 'POST', body: JSON.stringify(data) }),
  details: (clubId: string) => request<{ club: Club }>(`/api/v1/clubs/${encodeURIComponent(clubId)}`),
  update: (clubId: string, data: Record<string, unknown>) => request<{ club: Club }>(
    `/api/v1/clubs/${encodeURIComponent(clubId)}`, { method: 'PATCH', body: JSON.stringify(data) },
  ),
  dashboard: (clubId: string) => request<DashboardData>(`/api/v1/clubs/${encodeURIComponent(clubId)}/dashboard`),
  members: (clubId: string, filter = '') => request<{ members: Member[] }>(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/members${filter ? `?${filter}` : ''}`,
  ),
  createMember: (clubId: string, data: Record<string, unknown>) => request<{ member: Member }>(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/members`, { method: 'POST', body: JSON.stringify(data) },
  ),
  updateMemberStatus: (clubId: string, memberId: string, status: Member['status']) => request(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/members/${encodeURIComponent(memberId)}`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  ),
  groups: (clubId: string) => request<{ groups: Group[] }>(`/api/v1/clubs/${encodeURIComponent(clubId)}/groups`),
  createGroup: (clubId: string, data: Record<string, unknown>) => request(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/groups`, { method: 'POST', body: JSON.stringify(data) },
  ),
  assignGroupMembers: (clubId: string, groupId: string, memberIds: string[]) => request(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/groups/${encodeURIComponent(groupId)}/members`,
    { method: 'PUT', body: JSON.stringify({ memberIds }) },
  ),
  activities: (clubId: string) => request<{ activities: Activity[] }>(`/api/v1/clubs/${encodeURIComponent(clubId)}/activities`),
  createActivity: (clubId: string, data: Record<string, unknown>) => request(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/activities`, { method: 'POST', body: JSON.stringify(data) },
  ),
  cancelActivity: (clubId: string, activityId: string) => request(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/activities/${encodeURIComponent(activityId)}`,
    { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) },
  ),
  bookings: (clubId: string, activityId: string) => request<{ bookings: { id: string; memberId: string; firstName: string; lastName: string; status: string; attendanceStatus: 'present' | 'absent' | 'excused' | null }[] }>(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/activities/${encodeURIComponent(activityId)}/bookings`,
  ),
  bookActivity: (clubId: string, activityId: string, memberId: string) => request(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/activities/${encodeURIComponent(activityId)}/bookings`,
    { method: 'POST', body: JSON.stringify({ memberId }) },
  ),
  cancelBooking: (clubId: string, bookingId: string) => request(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/bookings/${encodeURIComponent(bookingId)}`,
    { method: 'DELETE' },
  ),
  attendance: (clubId: string, activityId: string, records: { memberId: string; status: 'present' | 'absent' | 'excused' }[]) => request(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/activities/${encodeURIComponent(activityId)}/attendance`,
    { method: 'PUT', body: JSON.stringify({ records }) },
  ),
  announcements: (clubId: string) => request<{ announcements: Announcement[] }>(`/api/v1/clubs/${encodeURIComponent(clubId)}/announcements`),
  publishAnnouncement: (clubId: string, data: Record<string, unknown>) => request(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/announcements`, { method: 'POST', body: JSON.stringify(data) },
  ),
  payments: (clubId: string) => request<{ payments: { id: string; memberId: string; firstName: string; lastName: string; amountPence: number; status: string; dueDate: string | null }[] }>(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/payments`,
  ),
  recordPayment: (clubId: string, data: Record<string, unknown>) => request(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/payments`, { method: 'POST', body: JSON.stringify(data) },
  ),
  portal: (clubId: string, memberId?: string) => request<Record<string, unknown>>(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/portal${memberId ? `?memberId=${encodeURIComponent(memberId)}` : ''}`,
  ),
  exportMembers: (clubId: string) => fetch(`/api/v1/clubs/${encodeURIComponent(clubId)}/reports/members.csv`, { credentials: 'same-origin' }),
};

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/v1/health', { signal });
  if (!response.ok) {
    throw new Error(`API request failed (${response.status}).`);
  }

  const data: unknown = await response.json();
  if (typeof data !== 'object' || data === null || !('status' in data) || data.status !== 'ok') {
    throw new Error('Invalid API response.');
  }
  return { status: data.status };
}