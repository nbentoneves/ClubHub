import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const { authApi, clubApi } = vi.hoisted(() => ({
  authApi: { session: vi.fn(), signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), requestPasswordReset: vi.fn(), resetPassword: vi.fn() },
  clubApi: { list: vi.fn(), create: vi.fn(), dashboard: vi.fn() },
}));

vi.mock('../api/client', () => ({ authApi, clubApi }));

const account = { id: 'user-1', name: 'Alex Club', email: 'alex@example.test' };
const club = { id: 'club-1', name: 'Northside Juniors', role: 'owner', category: 'Sports', currency: 'GBP' };

describe('ClubHub onboarding', () => {
  beforeEach(() => {
    authApi.session.mockReset();
    authApi.signIn.mockReset();
    authApi.signUp.mockReset();
    authApi.requestPasswordReset.mockReset();
    authApi.resetPassword.mockReset();
    clubApi.list.mockReset();
    clubApi.create.mockReset();
    clubApi.dashboard.mockReset();
  });

  it('signs in and loads the selected club dashboard', async () => {
    authApi.session.mockResolvedValueOnce(null).mockResolvedValue({ user: account, session: { id: 'session-1' } });
    authApi.signIn.mockResolvedValue({});
    clubApi.list.mockResolvedValue({ clubs: [club] });
    clubApi.dashboard.mockResolvedValue({
      summary: { activeMembers: 12, pendingApplications: 2, upcomingActivities: 3, outstandingPayments: 1 },
      activities: [], announcements: [],
    });
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Email address'), { target: { value: account.email } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'not-a-real-password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Good operations make room for good moments.')).toBeInTheDocument();
    expect(screen.getByText('Northside Juniors')).toBeInTheDocument();
    expect(authApi.signIn).toHaveBeenCalledWith(account.email, 'not-a-real-password');
    expect(clubApi.dashboard).toHaveBeenCalledWith(club.id);
  });

  it('lets a signed-in user create their first club', async () => {
    authApi.session.mockResolvedValue({ user: account, session: { id: 'session-1' } });
    clubApi.list.mockResolvedValue({ clubs: [] });
    clubApi.create.mockResolvedValue({ club });
    clubApi.dashboard.mockResolvedValue({
      summary: { activeMembers: 0, pendingApplications: 0, upcomingActivities: 0, outstandingPayments: 0 },
      activities: [], announcements: [],
    });
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Club name'), { target: { value: club.name } });
    fireEvent.click(screen.getByRole('button', { name: /create club/i }));
    expect(await screen.findByText('Good operations make room for good moments.')).toBeInTheDocument();
    expect(clubApi.create).toHaveBeenCalledWith(expect.objectContaining({ name: club.name }));
  });

  it('requests a password reset without disclosing whether an account exists', async () => {
    authApi.session.mockResolvedValue(null);
    authApi.requestPasswordReset.mockResolvedValue({ status: true });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Forgot password?' }));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: account.email } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('If this email is registered');
    expect(authApi.requestPasswordReset).toHaveBeenCalledWith(account.email);
  });

  it('accepts a reset token and updates the password', async () => {
    window.history.replaceState(null, '', '/?token=reset-token');
    authApi.resetPassword.mockResolvedValue({ status: true });
    render(<App />);
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password-value' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'new-password-value' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeInTheDocument();
    expect(authApi.resetPassword).toHaveBeenCalledWith('reset-token', 'new-password-value');
  });
});