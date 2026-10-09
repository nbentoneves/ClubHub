import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { authApi, clubApi } from './api/client';
import type { Activity, Announcement, AppUser, Club, DashboardData, Group, Member } from './api/client';

type Section = 'Overview' | 'Members' | 'Groups' | 'Activities' | 'Attendance' | 'Announcements' | 'Payments' | 'Reports' | 'Member portal' | 'Club settings';
type LoadState = 'loading' | 'ready' | 'error';

const sections: Section[] = ['Overview', 'Members', 'Groups', 'Activities', 'Attendance', 'Announcements', 'Payments', 'Reports', 'Member portal', 'Club settings'];
const memberStatuses: Member['status'][] = ['pending', 'active', 'suspended', 'expired', 'cancelled'];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function displayDate(value: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en-GB', options ?? { dateStyle: 'medium' }).format(date);
}

function currency(value: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value / 100);
}

function StatusPill({ status }: { status: string }) {
  return <span className={`pill pill-${status.toLowerCase().replaceAll('_', '-')}`}>{status.replaceAll('_', ' ')}</span>;
}

function SignIn({ onSignedIn }: { onSignedIn: (user: AppUser) => void }) {
  const [register, setRegister] = useState(false);
  const [reset, setReset] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const name = String(form.get('name') ?? '').trim();
    const password = String(form.get('password') ?? '');
    try {
      if (reset) {
        await authApi.requestPasswordReset(email);
        setNotice('If this email is registered, a password reset link is on its way.');
      } else if (register) {
        await authApi.signUp(name, email, password);
        setNotice('Check your email for a verification link, then sign in.');
        setRegister(false);
      } else {
        await authApi.signIn(email, password);
        const result = await authApi.session();
        if (result?.user) onSignedIn(result.user);
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <aside className="auth-brand">
        <div className="brand-lockup"><span className="brand-mark">C</span><span>ClubHub</span></div>
        <div className="brand-copy"><p className="eyebrow">A better run club</p><h1>Bring your club<br />together.</h1><p>People, sessions and the small details that keep a community moving.</p></div>
        <span className="brand-caption">Made for the people who make clubs happen.</span>
      </aside>
      <section className="auth-panel">
        <div className="auth-mobile-mark"><span className="brand-mark">C</span><span>ClubHub</span></div>
        <div className="auth-form-wrap">
          <p className="eyebrow">{reset ? 'Account recovery' : register ? 'Get started' : 'Welcome back'}</p>
          <h2>{reset ? 'Reset your password' : register ? 'Create your account' : 'Sign in to ClubHub'}</h2>
          <p className="auth-subtitle">{reset ? 'We will email a secure reset link if this account exists.' : register ? 'Start bringing your club together.' : 'Your club, ready when you are.'}</p>
          {notice && <p role="status" className="notice">{notice}</p>}
          {error && <p role="alert" className="error-message">{error}</p>}
          <form className="form-stack" onSubmit={submit}>
            {register && <label>Your name<input autoComplete="name" name="name" required maxLength={120} /></label>}
            <label>Email address<input autoComplete="email" type="email" name="email" required maxLength={254} /></label>
            {!reset && <label>Password<input autoComplete={register ? 'new-password' : 'current-password'} type="password" name="password" required minLength={8} /></label>}
            <button className="button-primary button-wide" disabled={busy}>{busy ? 'Please wait...' : reset ? 'Send reset link' : register ? 'Create account' : 'Sign in'}<span aria-hidden="true">→</span></button>
          </form>
          {reset ? <p className="auth-switch">Remember your password? <button className="text-button" onClick={() => { setReset(false); setNotice(''); setError(''); }}>Sign in</button></p> : <p className="auth-switch">{register ? 'Already have an account?' : 'New to ClubHub?'} <button className="text-button" onClick={() => { setRegister(!register); setError(''); setNotice(''); }}>{register ? 'Sign in' : 'Create an account'}</button>{!register && <> · <button className="text-button" onClick={() => { setReset(true); setNotice(''); setError(''); }}>Forgot password?</button></>}</p>}
        </div>
        <p className="auth-legal">By continuing, you agree to your club's terms and ClubHub's privacy policy.</p>
      </section>
    </main>
  );
}

function PasswordReset({ token, onDone }: { token: string; onDone: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    if (password !== String(form.get('confirmPassword') ?? '')) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await authApi.resetPassword(token, password);
      setComplete(true);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return <main className="setup-page"><header className="brand-lockup"><span className="brand-mark">C</span><span>ClubHub</span></header><section className="setup-content"><p className="eyebrow">Account recovery</p><h1>{complete ? 'Password updated' : 'Choose a new password'}</h1>{complete ? <><p className="muted">Your password has been reset. Sign in with your new password.</p><button className="button-primary" onClick={onDone}>Return to sign in<span aria-hidden="true">→</span></button></> : <><p className="muted">Use at least 8 characters.</p>{error && <p role="alert" className="error-message">{error}</p>}<form className="form-stack" onSubmit={submit}><label>New password<input name="password" type="password" autoComplete="new-password" required minLength={8} /></label><label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} /></label><button className="button-primary" disabled={busy}>{busy ? 'Updating...' : 'Reset password'}<span aria-hidden="true">→</span></button></form></>}</section></main>;
}

function CreateClub({ onCreated }: { onCreated: (club: Club) => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const result = await clubApi.create(values);
      onCreated(result.club);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return <main className="setup-page"><header className="brand-lockup"><span className="brand-mark">C</span><span>ClubHub</span></header><section className="setup-content"><p className="eyebrow">Your space starts here</p><h1>Set up your club</h1><p className="muted">A few details now. You can change them anytime.</p>{error && <p role="alert" className="error-message">{error}</p>}<form className="form-stack" onSubmit={submit}><label>Club name<input name="name" required maxLength={120} autoFocus /></label><label>What kind of club?<select name="category"><option>Sports</option><option>Children's activities</option><option>Swimming</option><option>Martial arts</option><option>Dance</option><option>Hobby and interest</option><option>Community</option><option>Other</option></select></label><label>Short description<textarea name="description" rows={3} maxLength={2000} /></label><label>Contact email<input type="email" name="contactEmail" /></label><label>Phone number<input type="tel" name="contactPhone" /></label><button className="button-primary" disabled={busy}>{busy ? 'Creating...' : 'Create club'}<span aria-hidden="true">→</span></button></form></section></main>;
}

function App() {
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get('token'));
  const [user, setUser] = useState<AppUser | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [club, setClub] = useState<Club | null>(null);
  const [section, setSection] = useState<Section>('Overview');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [serviceError, setServiceError] = useState('');
  const [data, setData] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [portalMemberId, setPortalMemberId] = useState('');
  const isAdmin = !!club && ['owner', 'administrator'].includes(club.role);

  if (resetToken) return <PasswordReset token={resetToken} onDone={() => { window.history.replaceState(null, '', '/'); setResetToken(null); }} />;

  useEffect(() => {
    let active = true;
    authApi.session().then((result) => {
      if (active && result?.user) setUser(result.user);
      else if (active) setLoadState('ready');
    }).catch((cause) => {
      if (!active) return;
      setServiceError(errorMessage(cause));
      setLoadState('error');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    clubApi.list().then((result) => {
      if (!active) return;
      setClubs(result.clubs);
      const selected = result.clubs[0] ?? null;
      setClub(selected);
      if (selected) setSection(selected.role === 'coach' ? 'Activities' : ['member', 'guardian'].includes(selected.role) ? 'Member portal' : 'Overview');
      setLoadState('ready');
    }).catch((cause) => {
      if (!active) return;
      setServiceError(errorMessage(cause));
      setLoadState('error');
    });
    return () => { active = false; };
  }, [user]);

  async function refresh(target = section, currentClub = club) {
    if (!currentClub) return;
    setLoadState('loading');
    setActionError('');
    try {
      let next: Record<string, unknown> = {};
      if (target === 'Overview') next = await clubApi.dashboard(currentClub.id) as unknown as Record<string, unknown>;
      if (target === 'Members') next = await clubApi.members(currentClub.id) as unknown as Record<string, unknown>;
      if (target === 'Groups') {
        const [groups, members] = await Promise.all([clubApi.groups(currentClub.id), clubApi.members(currentClub.id)]);
        next = { ...groups, ...members } as unknown as Record<string, unknown>;
      }
      if (target === 'Activities') {
        const [activities, groups] = await Promise.all([clubApi.activities(currentClub.id), clubApi.groups(currentClub.id)]);
        next = { ...activities, ...groups } as unknown as Record<string, unknown>;
      }
      if (target === 'Attendance') {
        const activities = await clubApi.activities(currentClub.id);
        next = { ...activities, ...(target === 'Attendance' && activities.activities[0] ? await clubApi.bookings(currentClub.id, activities.activities[0].id) : {}) };
      }
      if (target === 'Announcements') next = await clubApi.announcements(currentClub.id) as unknown as Record<string, unknown>;
      if (target === 'Payments') next = { ...(await clubApi.payments(currentClub.id)), ...(await clubApi.members(currentClub.id)) };
      if (target === 'Member portal') next = await clubApi.portal(currentClub.id, portalMemberId || undefined);
      if (target === 'Reports') next = await clubApi.dashboard(currentClub.id) as unknown as Record<string, unknown>;
      if (target === 'Club settings') next = await clubApi.details(currentClub.id) as unknown as Record<string, unknown>;
      setData(next);
      setLoadState('ready');
    } catch (cause) {
      setActionError(errorMessage(cause));
      setLoadState('error');
    }
  }

  useEffect(() => {
    if (user && club) void refresh(section, club);
  }, [user, club, section, portalMemberId]);

  async function act(action: () => Promise<unknown>, message: string, nextSection = section) {
    setBusy(true);
    setActionError('');
    setNotice('');
    try {
      await action();
      setNotice(message);
      await refresh(nextSection);
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await authApi.signOut().catch(() => undefined);
    setUser(null); setClub(null); setClubs([]); setData({}); setLoadState('ready');
  }

  if (loadState === 'loading' && !user) return <main className="boot-screen"><span className="brand-mark">C</span><p>Opening your club space...</p></main>;
  if (!user && loadState !== 'error') return <SignIn onSignedIn={setUser} />;
  if (!user && loadState === 'error') return <main className="service-screen"><div className="brand-lockup"><span className="brand-mark">C</span><span>ClubHub</span></div><p className="eyebrow">Setup required</p><h1>ClubHub is not connected yet.</h1><p role="alert">{serviceError}</p><p>Configure the D1 database, <code>BETTER_AUTH_SECRET</code>, <code>BETTER_AUTH_URL</code>, <code>RESEND_API_KEY</code>, and <code>RESEND_FROM_EMAIL</code> before opening the app.</p></main>;
  if (!user) return <SignIn onSignedIn={setUser} />;
  if (loadState === 'loading' && user && !club && !clubs.length) return <main className="boot-screen"><span className="brand-mark">C</span><p>Loading your clubs...</p></main>;
  if (user && !clubs.length && !club) return <CreateClub onCreated={(created) => { setClub(created); setClubs([created]); }} />;
  if (!club) return <main className="boot-screen"><span className="brand-mark">C</span><p>Choose a club to continue.</p></main>;

  const navSections = isAdmin
    ? sections
    : club.role === 'coach'
      ? ['Activities', 'Attendance', 'Announcements'] as Section[]
      : ['Activities', 'Announcements', 'Member portal'] as Section[];
  const canManageActivities = isAdmin || club.role === 'coach';
  const summary = data.summary as DashboardData['summary'] | undefined;

  async function formAction(event: FormEvent<HTMLFormElement>, action: (values: Record<string, FormDataEntryValue>) => Promise<unknown>, success: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    await act(async () => { await action(values); form.reset(); }, success);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><span className="brand-mark">C</span><span>ClubHub</span></div>
        <div className="club-switcher"><span className="club-avatar">{club.name.slice(0, 1).toUpperCase()}</span><span className="club-switch-copy"><strong>{club.name}</strong><small>{club.role}</small></span>{clubs.length > 1 && <select aria-label="Select club" value={club.id} onChange={(event) => { setClub(clubs.find((item) => item.id === event.target.value) ?? null); setPortalMemberId(''); }}>{clubs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</div>
        <nav aria-label="Main navigation" className="side-nav">{navSections.map((item) => <button key={item} className={section === item ? 'nav-item active' : 'nav-item'} onClick={() => { setSection(item); setNotice(''); }}><span className="nav-indicator" aria-hidden="true" />{item}</button>)}</nav>
        <div className="sidebar-bottom"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span className="user-copy"><strong>{user.name}</strong><small>{user.email}</small></span><button className="icon-button" title="Sign out" aria-label="Sign out" onClick={() => void signOut()}>↗</button></div>
      </aside>
      <main className="main-panel">
        <header className="topbar"><div><p className="breadcrumb">{club.name}<span>/</span>{section}</p><h1>{section}</h1></div><div className="topbar-actions"><span className="role-tag">{club.role}</span>{clubs.length > 1 && <label className="mobile-club-select"><span>Club</span><select aria-label="Select club" value={club.id} onChange={(event) => { setClub(clubs.find((item) => item.id === event.target.value) ?? null); setPortalMemberId(''); }}>{clubs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}</div></header>
        {actionError && <p role="alert" className="inline-error">{actionError}</p>}
        {notice && <p role="status" className="inline-notice">{notice}</p>}
        {loadState === 'loading' ? <div className="content-loading" role="status">Loading {section.toLowerCase()}...</div> : <div className="content-area">
          {section === 'Overview' && <Overview summary={summary} data={data} onNavigate={setSection} />}
          {section === 'Members' && <Members data={data} search={search} setSearch={setSearch} isAdmin={isAdmin} busy={busy} onCreate={(values) => formAction(values.event, (data) => clubApi.createMember(club.id, data), 'Member added.')} onStatus={(id, status) => act(() => clubApi.updateMemberStatus(club.id, id, status), 'Membership status updated.')} onExport={async () => { const result = await clubApi.exportMembers(club.id); if (!result.ok) throw new Error('Unable to export members.'); const url = URL.createObjectURL(await result.blob()); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'club-members.csv'; anchor.click(); URL.revokeObjectURL(url); }} />}
          {section === 'Groups' && <Groups data={data} isAdmin={isAdmin} onCreate={(event) => formAction(event, (values) => clubApi.createGroup(club.id, { ...values, capacity: values.capacity ? Number(values.capacity) : null }), 'Group created.')} onAssign={(groupId, memberIds) => act(() => clubApi.assignGroupMembers(club.id, groupId, memberIds), 'Group roster updated.')} />}
          {section === 'Activities' && <Activities data={data} groups={(data.groups ?? []) as Group[]} isAdmin={canManageActivities} onCreate={(event) => formAction(event, (values) => clubApi.createActivity(club.id, { ...values, capacity: values.capacity ? Number(values.capacity) : null, price: Number(values.price || 0), startAt: new Date(String(values.startAt)).toISOString(), endAt: new Date(String(values.endAt)).toISOString(), bookingDeadline: values.bookingDeadline ? new Date(String(values.bookingDeadline)).toISOString() : null }), 'Activity scheduled.')} onCancel={(id) => act(() => clubApi.cancelActivity(club.id, id), 'Activity cancelled.')} />}
          {section === 'Attendance' && <Attendance data={data} clubId={club.id} onSave={(activityId, records) => act(() => clubApi.attendance(club.id, activityId, records), 'Attendance saved.')} />}
          {section === 'Announcements' && <Announcements data={data} isAdmin={isAdmin} onCreate={(event) => formAction(event, (values) => clubApi.publishAnnouncement(club.id, values), 'Announcement published.')} />}
          {section === 'Payments' && <Payments data={data} isAdmin={isAdmin} onCreate={(event) => formAction(event, (values) => clubApi.recordPayment(club.id, { ...values, amount: Number(values.amount) }), 'Payment record saved.')} />}
          {section === 'Reports' && <Reports clubId={club.id} onExport={() => clubApi.exportMembers(club.id)} />}
          {section === 'Member portal' && <MemberPortal data={data} selectedId={portalMemberId} clubId={club.id} onSelect={setPortalMemberId} onBook={(activityId, memberId) => act(() => clubApi.bookActivity(club.id, activityId, memberId), 'Activity booked.', 'Member portal')} onCancel={(bookingId) => act(() => clubApi.cancelBooking(club.id, bookingId), 'Booking cancelled.', 'Member portal')} />}
          {section === 'Club settings' && <ClubSettings club={(data.club as Club | undefined) ?? club} onSave={(event) => formAction(event, async (values) => { const updated = await clubApi.update(club.id, values); setClub({ ...club, ...updated.club }); setClubs(clubs.map((item) => item.id === club.id ? { ...item, ...updated.club } : item)); }, 'Club details saved.')} />}
        </div>}
      </main>
      <nav className="mobile-nav" aria-label="Main navigation">{navSections.slice(0, 5).map((item) => <button key={item} className={section === item ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={() => setSection(item)}><span className="nav-indicator" aria-hidden="true" />{item}</button>)}</nav>
    </div>
  );
}

function Overview({ summary, data, onNavigate }: { summary?: DashboardData['summary']; data: Record<string, unknown>; onNavigate: (section: Section) => void }) {
  const activities = (data.activities ?? []) as Activity[];
  const announcements = (data.announcements ?? []) as Announcement[];
  const cards = [
    ['Active members', summary?.activeMembers ?? 0, 'Members', 'People currently in your club'],
    ['Pending applications', summary?.pendingApplications ?? 0, 'Members', 'Waiting for a decision'],
    ['Upcoming activities', summary?.upcomingActivities ?? 0, 'Activities', 'Sessions on the calendar'],
    ['Payments to review', summary?.outstandingPayments ?? 0, 'Payments', 'Due, part-paid or overdue'],
  ] as const;
  return <>
    <section className="welcome-row"><div><p className="eyebrow">Your club at a glance</p><h2>Good operations make room for good moments.</h2></div><button className="button-primary" onClick={() => onNavigate('Activities')}>Plan an activity<span aria-hidden="true">+</span></button></section>
    <section className="metrics-grid" aria-label="Club overview">{cards.map(([label, count, target, caption]) => <button key={label} className="metric" onClick={() => onNavigate(target as Section)}><span className="metric-label">{label}</span><strong>{count}</strong><small>{caption}</small></button>)}</section>
    <div className="dashboard-columns"><section className="content-section"><div className="section-heading"><div><p className="eyebrow">Coming up</p><h2>Next activities</h2></div><button className="text-button" onClick={() => onNavigate('Activities')}>All activities →</button></div>{activities.length ? <div className="activity-list">{activities.map((activity) => <ActivityRow key={activity.id} activity={activity} />)}</div> : <EmptyState title="Nothing on the calendar" message="Schedule your next club activity to get started." />}</section><section className="content-section"><div className="section-heading"><div><p className="eyebrow">Club noticeboard</p><h2>Latest announcements</h2></div><button className="text-button" onClick={() => onNavigate('Announcements')}>View all →</button></div>{announcements.length ? <div className="announcement-list">{announcements.map((item) => <article className="announcement-item" key={item.id}><h3>{item.title}</h3><p>{item.message}</p><time>{displayDate(item.publishedAt)}</time></article>)}</div> : <EmptyState title="No announcements yet" message="Keep everyone in the loop with one clear update." />}</section></div>
  </>;
}

function Members({ data, search, setSearch, isAdmin, busy, onCreate, onStatus, onExport }: { data: Record<string, unknown>; search: string; setSearch: (value: string) => void; isAdmin: boolean; busy: boolean; onCreate: (args: { event: FormEvent<HTMLFormElement> }) => void; onStatus: (id: string, status: Member['status']) => void; onExport: () => void }) {
  const members = (data.members ?? []) as Member[];
  const visible = members.filter((member) => `${member.firstName} ${member.lastName} ${member.email ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  return <><div className="toolbar"><label className="search-box"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" /></label><div className="toolbar-actions"><button className="button-secondary" onClick={onExport}>Export CSV ↓</button>{isAdmin && <button className="button-primary" onClick={() => document.getElementById('add-member')?.scrollIntoView({ behavior: 'smooth' })}>Add member<span aria-hidden="true">+</span></button>}</div></div>
    <section className="table-section"><div className="table-headline"><div><p className="eyebrow">People</p><h2>{members.length} members</h2></div><span className="table-note">Membership is managed by club administrators</span></div>{visible.length ? <div className="table-scroll"><table><thead><tr><th>Member</th><th>Contact</th><th>Status</th><th>Member since</th>{isAdmin && <th>Update</th>}</tr></thead><tbody>{visible.map((member) => <tr key={member.id}><td><strong>{member.firstName} {member.lastName}</strong></td><td>{member.email || member.phone || 'No contact details'}</td><td><StatusPill status={member.status} /></td><td>{displayDate(member.startDate)}</td>{isAdmin && <td><select aria-label={`Status for ${member.firstName} ${member.lastName}`} value={member.status} onChange={(event) => onStatus(member.id, event.target.value as Member['status'])}>{memberStatuses.map((status) => <option key={status}>{status}</option>)}</select></td>}</tr>)}</tbody></table></div> : <EmptyState title="No members found" message={search ? 'Try a different name or email.' : 'Add your first member to begin building your club roster.'} />}</section>
    {isAdmin && <section id="add-member" className="form-section"><div className="section-heading"><div><p className="eyebrow">Membership</p><h2>Add a member</h2></div><p className="table-note">Existing email matches will be linked to their account.</p></div><form className="form-grid" onSubmit={(event) => onCreate({ event })}><label>First name<input name="firstName" required maxLength={100} /></label><label>Last name<input name="lastName" required maxLength={100} /></label><label>Email address<input name="email" type="email" /></label><label>Phone number<input name="phone" type="tel" /></label><label>Start date<input name="startDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label><label>Status<select name="status" defaultValue="pending">{memberStatuses.map((status) => <option key={status}>{status}</option>)}</select></label><label>Emergency contact<input name="emergencyContactName" /></label><label>Emergency phone<input name="emergencyContactPhone" type="tel" /></label><label className="field-wide">Guardian account email<input name="guardianEmail" type="email" placeholder="Guardian must already have a ClubHub account" /></label><label className="field-wide">Membership notes<textarea name="notes" rows={2} maxLength={2000} /></label><div className="field-wide form-actions"><button className="button-primary" disabled={busy}>Add member<span aria-hidden="true">→</span></button></div></form></section>}
  </>;
}

function Groups({ data, isAdmin, onCreate, onAssign }: { data: Record<string, unknown>; isAdmin: boolean; onCreate: (event: FormEvent<HTMLFormElement>) => void; onAssign: (groupId: string, memberIds: string[]) => void }) {
  const groups = (data.groups ?? []) as Group[];
  const members = (data.members ?? []) as Member[];
  return <><div className="section-heading"><div><p className="eyebrow">People, organised</p><h2>Groups and teams</h2></div></div>{groups.length ? <div className="group-grid">{groups.map((group) => <article key={group.id} className="group-item"><div className="group-mark">{group.name.slice(0, 1).toUpperCase()}</div><div className="group-content"><h3>{group.name}</h3><p>{group.description || 'No description yet.'}</p><span>{group.memberCount} members{group.capacity ? ` · ${group.capacity} places` : ''}</span>{isAdmin && <GroupRoster group={group} members={members} onSave={onAssign} />}</div></article>)}</div> : <EmptyState title="Start with a group" message="Create a team, class or age group to organise activities." />}{isAdmin && <section className="form-section"><p className="eyebrow">New team</p><h2>Create a group</h2><form className="form-grid" onSubmit={onCreate}><label>Group name<input name="name" required maxLength={100} /></label><label>Capacity<input name="capacity" type="number" min="1" /></label><label className="field-wide">Description<textarea name="description" rows={2} /></label><div className="field-wide form-actions"><button className="button-primary">Create group<span aria-hidden="true">→</span></button></div></form></section>}</>;
}

function GroupRoster({ group, members, onSave }: { group: Group; members: Member[]; onSave: (groupId: string, memberIds: string[]) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const select = event.currentTarget.querySelector('select[name="memberIds"]') as unknown as HTMLSelectElement;
    if (!select) return;
    onSave(group.id, Array.from(select.selectedOptions, (option) => option.value));
  }
  return <details className="roster-editor"><summary>Manage members</summary><form onSubmit={submit}><label>Assigned members<select name="memberIds" multiple size={Math.min(Math.max(members.length, 2), 6)} defaultValue={group.memberIds?.split(',') ?? []}>{members.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}</select></label><button className="button-secondary">Save roster</button></form></details>;
}

function Activities({ data, groups, isAdmin, onCreate, onCancel }: { data: Record<string, unknown>; groups: Group[]; isAdmin: boolean; onCreate: (event: FormEvent<HTMLFormElement>) => void; onCancel: (id: string) => void }) {
  const activities = (data.activities ?? []) as Activity[];
  return <><div className="section-heading"><div><p className="eyebrow">Sessions and events</p><h2>Activity calendar</h2></div></div>{activities.length ? <div className="activity-list full-list">{activities.map((activity) => <article key={activity.id} className="activity-row"><div className="date-block"><strong>{new Date(activity.startAt).toLocaleDateString('en-GB', { day: '2-digit' })}</strong><span>{new Date(activity.startAt).toLocaleDateString('en-GB', { month: 'short' })}</span></div><div className="activity-copy"><h3>{activity.title}</h3><p>{displayDate(activity.startAt, { dateStyle: 'medium', timeStyle: 'short' })} · {activity.location || 'Location not set'}</p><div className="activity-meta"><span>{activity.groupName || 'All members'}</span><span>{activity.bookedCount}{activity.capacity ? ` / ${activity.capacity}` : ''} booked</span><StatusPill status={activity.status} /></div></div>{isAdmin && activity.status === 'scheduled' && <button className="button-quiet" onClick={() => onCancel(activity.id)}>Cancel</button>}</article>)}</div> : <EmptyState title="No activities scheduled" message="Set a date for the next get-together." />}{isAdmin && <section className="form-section"><p className="eyebrow">Get together</p><h2>Schedule an activity</h2><form className="form-grid" onSubmit={onCreate}><label>Title<input name="title" required maxLength={160} /></label><label>Location<input name="location" maxLength={200} /></label><label>Group<select name="groupId" defaultValue=""><option value="">All eligible members</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><label>Starts<input name="startAt" type="datetime-local" required /></label><label>Ends<input name="endAt" type="datetime-local" required /></label><label>Capacity<input name="capacity" type="number" min="1" /></label><label>Price (£)<input name="price" type="number" min="0" step="0.01" defaultValue="0" /></label><label>Booking deadline<input name="bookingDeadline" type="datetime-local" /></label><label>Repeat<select name="recurrence"><option value="none">Does not repeat</option><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option></select></label><label className="field-wide">Description<textarea name="description" rows={2} /></label><div className="field-wide form-actions"><button className="button-primary">Schedule activity<span aria-hidden="true">→</span></button></div></form></section>}</>;
}

function Attendance({ data, clubId, onSave }: { data: Record<string, unknown>; clubId: string; onSave: (activityId: string, records: { memberId: string; status: 'present' | 'absent' | 'excused' }[]) => void }) {
  const activities = (data.activities ?? []) as Activity[];
  const [activityId, setActivityId] = useState(activities[0]?.id ?? '');
  const [bookings, setBookings] = useState<{ id: string; memberId: string; firstName: string; lastName: string; status: string; attendanceStatus: 'present' | 'absent' | 'excused' | null }[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'excused'>>({});
  useEffect(() => { if (activities[0] && !activityId) setActivityId(activities[0].id); }, [activities, activityId]);
  useEffect(() => {
    setAttendance({});
    setBookings([]);
    if (activityId) clubApi.bookings(clubId, activityId).then((result) => {
      setBookings(result.bookings);
      setAttendance(Object.fromEntries(result.bookings.map((booking) => [booking.memberId, booking.attendanceStatus ?? 'absent'])));
    }).catch(() => setBookings([]));
  }, [clubId, activityId]);
  return <><div className="toolbar"><label className="field-select"><span>Activity</span><select value={activityId} onChange={(event) => setActivityId(event.target.value)}>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title} · {displayDate(activity.startAt)}</option>)}</select></label></div><section className="table-section"><div className="table-headline"><div><p className="eyebrow">Session register</p><h2>{bookings.length} bookings</h2></div></div>{bookings.length ? <div className="attendance-list">{bookings.map((booking) => <label className="attendance-person" key={booking.id}><span className="attendance-person-name">{booking.firstName} {booking.lastName}</span><select aria-label={`Attendance for ${booking.firstName} ${booking.lastName}`} value={attendance[booking.memberId] ?? booking.attendanceStatus ?? 'absent'} onChange={(event) => setAttendance({ ...attendance, [booking.memberId]: event.target.value as 'present' | 'absent' | 'excused' })}><option value="present">Present</option><option value="absent">Absent</option><option value="excused">Excused</option></select></label>)}</div> : <EmptyState title="No bookings yet" message="Booked participants will appear here before their session." />}{bookings.length > 0 && <div className="form-actions"><button className="button-primary" onClick={() => onSave(activityId, bookings.map((booking) => ({ memberId: booking.memberId, status: attendance[booking.memberId] ?? booking.attendanceStatus ?? 'absent' })))}>Save attendance<span aria-hidden="true">→</span></button></div>}</section></>;
}

function Announcements({ data, isAdmin, onCreate }: { data: Record<string, unknown>; isAdmin: boolean; onCreate: (event: FormEvent<HTMLFormElement>) => void }) {
  const announcements = (data.announcements ?? []) as Announcement[];
  return <><div className="section-heading"><div><p className="eyebrow">Club noticeboard</p><h2>Announcements</h2></div></div>{announcements.length ? <div className="announcement-list">{announcements.map((announcement) => <article className="announcement-item announcement-large" key={announcement.id}><time>{displayDate(announcement.publishedAt)}</time><h3>{announcement.title}</h3><p>{announcement.message}</p></article>)}</div> : <EmptyState title="A clear place for club news" message="Your members will see published announcements here." />}{isAdmin && <section className="form-section"><p className="eyebrow">Tell your club</p><h2>Publish an announcement</h2><form className="form-grid" onSubmit={onCreate}><label className="field-wide">Title<input name="title" required maxLength={160} /></label><label className="field-wide">Message<textarea name="message" rows={5} required maxLength={10000} /></label><div className="field-wide form-actions"><button className="button-primary">Publish announcement<span aria-hidden="true">→</span></button></div></form></section>}</>;
}

function Payments({ data, isAdmin, onCreate }: { data: Record<string, unknown>; isAdmin: boolean; onCreate: (event: FormEvent<HTMLFormElement>) => void }) {
  const payments = (data.payments ?? []) as { id: string; firstName: string; lastName: string; amountPence: number; status: string; dueDate: string | null }[];
  const members = (data.members ?? []) as Member[];
  return <><div className="table-section"><div className="table-headline"><div><p className="eyebrow">Manual records</p><h2>Membership payments</h2></div><span className="table-note">Payments are recorded manually and are not provider-verified.</span></div>{payments.length ? <div className="table-scroll"><table><thead><tr><th>Member</th><th>Amount</th><th>Status</th><th>Due date</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{payment.firstName} {payment.lastName}</td><td>{currency(payment.amountPence)}</td><td><StatusPill status={payment.status} /></td><td>{displayDate(payment.dueDate)}</td></tr>)}</tbody></table></div> : <EmptyState title="No payment records" message="Record dues and payments here. No payment is automatically collected." />}</div>{isAdmin && <section className="form-section"><p className="eyebrow">Accounts</p><h2>Record a payment or amount due</h2><form className="form-grid" onSubmit={onCreate}><label>Member<select name="memberId" required>{members.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}</select></label><label>Amount (£)<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Status<select name="status"><option value="due">Due</option><option value="paid">Recorded as paid</option><option value="part_paid">Part paid</option><option value="overdue">Overdue</option></select></label><label>Method<input name="method" placeholder="Cash, bank transfer..." /></label><label>Due date<input name="dueDate" type="date" /></label><label>Reference<input name="reference" maxLength={120} /></label><div className="field-wide form-actions"><button className="button-primary">Save payment record<span aria-hidden="true">→</span></button></div></form></section>}</>;
}

function Reports({ clubId, onExport }: { clubId: string; onExport: () => Promise<Response> }) {
  const [error, setError] = useState('');
  async function download() { try { const response = await onExport(); if (!response.ok) throw new Error('You do not have permission to export this report.'); const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'club-members.csv'; anchor.click(); URL.revokeObjectURL(url); setError(''); } catch (cause) { setError(errorMessage(cause)); } }
  return <><section className="report-intro"><p className="eyebrow">Useful information, ready to share</p><h2>Club reports</h2><p>Download a current member list, including contact details and membership dates.</p><button className="button-primary" onClick={() => void download()}>Export members CSV<span aria-hidden="true">↓</span></button>{error && <p role="alert" className="error-message">{error}</p>}</section><section className="report-note"><h3>More reports</h3><p>Attendance percentages, renewals due and collected-fee summaries are not yet available in this release.</p></section></>;
}

function MemberPortal({
  data,
  selectedId,
  clubId,
  onSelect,
  onBook,
  onCancel,
}: {
  data: Record<string, unknown>;
  selectedId: string;
  clubId: string;
  onSelect: (id: string) => void;
  onBook: (activityId: string, memberId: string) => void;
  onCancel: (bookingId: string) => void;
}) {
  const profiles = (data.profiles ?? []) as { id: string; firstName: string; lastName: string; status: string; startDate: string; endDate: string | null }[];
  const activities = (data.activities ?? []) as { id: string; title: string; startAt: string; location: string; bookingId: string | null; capacity: number | null; bookedCount: number }[];
  const attendance = (data.attendance ?? []) as { activityId: string; status: string; recordedAt: string }[];
  const payments = (data.payments ?? []) as { id: string; amountPence: number; status: string; dueDate: string | null }[];
  const announcements = (data.announcements ?? []) as Announcement[];
  const memberId = selectedId || profiles[0]?.id || '';
  useEffect(() => {
    if (!selectedId && profiles[0]) onSelect(profiles[0].id);
  }, [selectedId, profiles, onSelect]);
  return <><div className="portal-profile">{profiles.map((profile) => <article key={profile.id}><span className="club-avatar">{profile.firstName.slice(0, 1)}</span><div><p className="eyebrow">Membership</p><h2>{profile.firstName} {profile.lastName}</h2><p>{displayDate(profile.startDate)}{profile.endDate ? ` – ${displayDate(profile.endDate)}` : ' · Ongoing'}</p></div><StatusPill status={profile.status} /></article>)}</div>{profiles.length > 1 && <label className="field-select portal-member-select"><span>Manage activities for</span><select value={memberId} onChange={(event) => onSelect(event.target.value)}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.firstName} {profile.lastName}</option>)}</select></label>}<div className="dashboard-columns"><section className="content-section"><div className="section-heading"><div><p className="eyebrow">Your calendar</p><h2>Upcoming activities</h2></div></div>{activities.length ? activities.map((activity) => <article className="portal-line" key={activity.id}><strong>{activity.title}</strong><span>{displayDate(activity.startAt, { dateStyle: 'medium', timeStyle: 'short' })} · {activity.location}</span><span>{activity.bookingId ? 'Booked' : `${activity.bookedCount}${activity.capacity ? ` / ${activity.capacity}` : ''} booked`}</span>{activity.bookingId ? <button className="button-quiet" onClick={() => onCancel(activity.bookingId!)}>Cancel booking</button> : <button className="button-secondary" disabled={!memberId || (!!activity.capacity && activity.bookedCount >= activity.capacity)} onClick={() => onBook(activity.id, memberId)}>Book activity</button>}</article>) : <EmptyState title="No upcoming activities" message="Your eligible sessions will appear here." />}</section><section className="content-section"><div className="section-heading"><div><p className="eyebrow">Your history</p><h2>Attendance and payments</h2></div></div><p>{attendance.length} attendance records</p>{payments.map((payment) => <p key={payment.id}>{currency(payment.amountPence)} · {payment.status} · {displayDate(payment.dueDate)}</p>)}{announcements.map((announcement) => <article className="announcement-item" key={announcement.id}><h3>{announcement.title}</h3><p>{announcement.message}</p></article>)}</section></div></>;
}

function ClubSettings({ club, onSave }: { club: Club; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  return <section className="form-section settings-form"><p className="eyebrow">Club profile</p><h2>Club details</h2><form className="form-grid" onSubmit={onSave}><label>Club name<input name="name" required maxLength={120} defaultValue={club.name} /></label><label>Category<input name="category" maxLength={80} defaultValue={club.category || 'Community'} /></label><label className="field-wide">Description<textarea name="description" rows={3} maxLength={2000} defaultValue={club.description || ''} /></label><label>Logo URL (HTTPS)<input name="logoUrl" type="url" defaultValue={club.logoUrl || ''} /></label><label>Contact email<input name="contactEmail" type="email" defaultValue={club.contactEmail || ''} /></label><label>Phone number<input name="contactPhone" type="tel" defaultValue={club.contactPhone || ''} /></label><label>Timezone<input name="timezone" defaultValue={club.timezone || 'Europe/London'} /></label><label className="field-wide">Address<input name="address" maxLength={500} defaultValue={club.address || ''} /></label><label className="field-wide">Membership terms<textarea name="membershipTerms" rows={4} maxLength={5000} defaultValue={club.membershipTerms || ''} /></label><div className="field-wide form-actions"><button className="button-primary">Save club details<span aria-hidden="true">→</span></button></div></form></section>;
}

function ActivityRow({ activity }: { activity: Activity }) {
  return <article className="activity-row"><div className="date-block"><strong>{new Date(activity.startAt).toLocaleDateString('en-GB', { day: '2-digit' })}</strong><span>{new Date(activity.startAt).toLocaleDateString('en-GB', { month: 'short' })}</span></div><div className="activity-copy"><h3>{activity.title}</h3><p>{displayDate(activity.startAt, { dateStyle: 'medium', timeStyle: 'short' })} · {activity.location || 'Location not set'}</p><div className="activity-meta"><span>{activity.groupName || 'All members'}</span><span>{activity.bookedCount}{activity.capacity ? ` / ${activity.capacity}` : ''} booked</span></div></div></article>;
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="empty-state"><span className="empty-mark" aria-hidden="true">+</span><h3>{title}</h3><p>{message}</p></div>;
}

export default App;