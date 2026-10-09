PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
  image TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  scope TEXT,
  password TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (provider_id, account_id)
);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  category TEXT NOT NULL DEFAULT 'Community',
  currency TEXT NOT NULL DEFAULT 'GBP' CHECK (currency = 'GBP'),
  membership_terms TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS club_memberships (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'administrator', 'coach', 'member', 'guardian')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'expired', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (club_id, user_id),
  UNIQUE (club_id, id)
);

CREATE TABLE IF NOT EXISTS member_profiles (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  membership_status TEXT NOT NULL DEFAULT 'pending' CHECK (membership_status IN ('pending', 'active', 'suspended', 'expired', 'cancelled')),
  membership_start_date TEXT NOT NULL,
  membership_end_date TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (club_id, id)
);

CREATE TABLE IF NOT EXISTS guardian_relationships (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  guardian_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  child_member_profile_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'guardian',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id, child_member_profile_id) REFERENCES member_profiles(club_id, id) ON DELETE CASCADE,
  UNIQUE (guardian_user_id, child_member_profile_id)
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (club_id, id),
  UNIQUE (club_id, name)
);

CREATE TABLE IF NOT EXISTS group_members (
  club_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  member_profile_id TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, member_profile_id),
  FOREIGN KEY (club_id, group_id) REFERENCES groups(club_id, id) ON DELETE CASCADE,
  FOREIGN KEY (club_id, member_profile_id) REFERENCES member_profiles(club_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_coaches (
  club_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (club_id, group_id) REFERENCES groups(club_id, id) ON DELETE CASCADE,
  FOREIGN KEY (club_id, user_id) REFERENCES club_memberships(club_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS membership_plans (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_pence INTEGER NOT NULL CHECK (price_pence >= 0),
  billing_frequency TEXT NOT NULL CHECK (billing_frequency IN ('monthly', 'annually', 'one_off')),
  duration_months INTEGER CHECK (duration_months IS NULL OR duration_months > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (club_id, id)
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  group_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  organiser_user_id TEXT,
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  price_pence INTEGER NOT NULL DEFAULT 0 CHECK (price_pence >= 0),
  booking_deadline TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'weekly', 'fortnightly', 'monthly')),
  recurrence_until TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, group_id) REFERENCES groups(club_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (club_id, organiser_user_id) REFERENCES club_memberships(club_id, user_id) ON DELETE RESTRICT,
  CHECK (end_at > start_at)
);

CREATE TABLE IF NOT EXISTS activity_bookings (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  member_profile_id TEXT NOT NULL,
  booking_status TEXT NOT NULL DEFAULT 'booked' CHECK (booking_status IN ('booked', 'cancelled', 'waitlisted')),
  booked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TEXT,
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, activity_id) REFERENCES activities(club_id, id) ON DELETE CASCADE,
  FOREIGN KEY (club_id, member_profile_id) REFERENCES member_profiles(club_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS activity_bookings_active_unique
  ON activity_bookings(activity_id, member_profile_id)
  WHERE booking_status IN ('booked', 'waitlisted');

CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  member_profile_id TEXT NOT NULL,
  attendance_status TEXT NOT NULL CHECK (attendance_status IN ('present', 'absent', 'excused')),
  recorded_by TEXT NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id, activity_id) REFERENCES activities(club_id, id) ON DELETE CASCADE,
  FOREIGN KEY (club_id, member_profile_id) REFERENCES member_profiles(club_id, id) ON DELETE CASCADE,
  FOREIGN KEY (club_id, recorded_by) REFERENCES club_memberships(club_id, user_id),
  UNIQUE (activity_id, member_profile_id)
);

CREATE TABLE IF NOT EXISTS payment_records (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  member_profile_id TEXT NOT NULL,
  membership_plan_id TEXT,
  amount_pence INTEGER NOT NULL CHECK (amount_pence > 0),
  payment_method TEXT NOT NULL DEFAULT 'other',
  payment_status TEXT NOT NULL CHECK (payment_status IN ('due', 'paid', 'part_paid', 'overdue', 'cancelled')),
  payment_date TEXT,
  due_date TEXT,
  reference TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id, member_profile_id) REFERENCES member_profiles(club_id, id) ON DELETE CASCADE,
  FOREIGN KEY (club_id, membership_plan_id) REFERENCES membership_plans(club_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (club_id, created_by) REFERENCES club_memberships(club_id, user_id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  audience_type TEXT NOT NULL DEFAULT 'club' CHECK (audience_type IN ('club', 'groups')),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  publish_at TEXT,
  published_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id, created_by) REFERENCES club_memberships(club_id, user_id)
);

CREATE TABLE IF NOT EXISTS announcement_groups (
  club_id TEXT NOT NULL,
  announcement_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  PRIMARY KEY (announcement_id, group_id),
  FOREIGN KEY (club_id, announcement_id) REFERENCES announcements(club_id, id) ON DELETE CASCADE,
  FOREIGN KEY (club_id, group_id) REFERENCES groups(club_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  assigned_role TEXT NOT NULL CHECK (assigned_role IN ('administrator', 'coach', 'member', 'guardian')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  revoked_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id, created_by) REFERENCES club_memberships(club_id, user_id)
);

CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  member_profile_id TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  consent_status TEXT NOT NULL CHECK (consent_status IN ('granted', 'withdrawn')),
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id, member_profile_id) REFERENCES member_profiles(club_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  recipient_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS club_memberships_user_idx ON club_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS member_profiles_club_status_idx ON member_profiles(club_id, membership_status);
CREATE INDEX IF NOT EXISTS member_profiles_club_email_idx ON member_profiles(club_id, email);
CREATE UNIQUE INDEX IF NOT EXISTS member_profiles_email_unique
  ON member_profiles(club_id, lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS activities_club_start_idx ON activities(club_id, start_at, status);
CREATE INDEX IF NOT EXISTS bookings_club_activity_idx ON activity_bookings(club_id, activity_id, booking_status);
CREATE INDEX IF NOT EXISTS attendance_club_member_idx ON attendance_records(club_id, member_profile_id, recorded_at);
CREATE INDEX IF NOT EXISTS payments_club_status_idx ON payment_records(club_id, payment_status, due_date);
CREATE INDEX IF NOT EXISTS announcements_club_status_idx ON announcements(club_id, status, publish_at);
CREATE INDEX IF NOT EXISTS invitations_club_email_idx ON invitations(club_id, email, accepted_at, revoked_at);