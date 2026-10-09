# ClubHub

> The simplest way to manage your club, your members, and your activities.

## 1. Overview

ClubHub is a lightweight club management platform designed for small sports clubs, children's activity clubs, hobby groups, and community organisations.

The platform centralises membership management, activity scheduling, attendance tracking, communications, and membership fee administration.

ClubHub aims to replace fragmented workflows involving spreadsheets, WhatsApp groups, Google Forms, emails, and manual payment tracking.

The product prioritises simplicity, affordability, mobile usability, and minimal administrative effort.

### 1.1 Product Vision

Build an affordable, easy-to-use platform that enables small clubs to manage their daily operations without requiring complex or expensive software.

### 1.2 Target Market

The initial target market is the United Kingdom.

Potential customers include:

- Small sports clubs.
- Children's sports and activity clubs.
- Swimming clubs.
- Martial arts schools.
- Dance schools.
- Hobby and interest groups.
- Community organisations.
- Local activity groups.

### 1.3 Product Principles

- **Simplicity first:** Users should not need training to use the application.
- **Mobile-first:** All essential workflows must work on mobile devices.
- **Affordable:** Pricing should be suitable for small organisations.
- **Self-service:** Members and parents should manage their own information where possible.
- **Secure by design:** Personal information must be protected.
- **Multi-tenant:** Multiple independent clubs must be supported.
- **Incremental delivery:** Prioritise a usable MVP over a large feature set.
- **Reusable architecture:** Follow the conventions and reusable components established by the AI MVP Factory.

---

## 2. Objectives

The initial product must:

1. Allow clubs to manage members and membership status.
2. Allow clubs to organise members into groups and teams.
3. Allow clubs to schedule activities and events.
4. Allow members to book activities.
5. Allow coaches to record attendance.
6. Allow administrators to publish announcements.
7. Allow clubs to track membership fees and payments.
8. Provide a member portal.
9. Support parent and guardian accounts when managing children's participation.
10. Provide basic operational reports.

The product should reduce administrative work while remaining easy to configure and operate.

---

## 3. User Roles and Permissions

### 3.1 Platform Administrator

Responsible for operating the ClubHub platform.

Permissions:

- Manage platform configuration.
- Support clubs and users.
- Investigate platform-level issues.
- Manage platform-level administrative functions.

Platform administrators must not have unrestricted access to club personal data without an authorised operational reason.

### 3.2 Club Owner

Responsible for an individual club.

Permissions:

- Configure club information.
- Manage club administrators.
- Manage members, groups, and activities.
- Manage membership plans and payment records.
- Publish announcements.
- Access club reports.
- Manage club settings.

### 3.3 Club Administrator

Helps manage club operations.

Permissions:

- Manage members.
- Manage groups and teams.
- Create and update activities.
- Record attendance.
- Publish announcements.
- Manage membership and payment records where authorised.
- Access permitted reports.

### 3.4 Coach or Organiser

Responsible for assigned groups and activities.

Permissions:

- View assigned groups.
- View relevant participant information.
- Manage assigned activities.
- Record attendance.
- View relevant announcements.

Coaches must only access information necessary for their responsibilities.

### 3.5 Member

Participates in club activities.

Permissions:

- View membership information.
- View eligible activities.
- Book and cancel activities.
- View personal attendance history.
- View relevant announcements.
- Update permitted personal information.
- View personal membership payment history.

### 3.6 Parent or Guardian

Manages a child's participation.

Permissions:

- Manage linked children.
- Register children for activities.
- View children's schedules.
- View attendance history.
- View relevant announcements.
- Manage permitted membership information.
- Receive relevant communications.

Children's accounts should be managed through parent or guardian accounts by default.

### 3.7 Role-Based Access Control

Requirements:

- A user may belong to multiple clubs.
- A user may have different roles in different clubs.
- Each role must have explicitly defined permissions.
- Club data must be isolated between tenants.
- Access to sensitive information must be restricted.
- Permissions must be enforced on the server.
- Users must not gain access by manipulating URLs or API identifiers.

---

## 4. Functional Requirements

Requirements are assigned identifiers to support implementation, testing, and future maintenance.

Priority definitions:

- **MUST:** Required for the initial release.
- **SHOULD:** Important, but may be deferred if necessary.
- **COULD:** Optional or suitable for a later release.

### 4.1 Club Management

#### FR-001: Club Registration

Priority: MUST

The system must allow a user to create a club.

Required functionality:

- Create a club with a name and description.
- Configure a logo.
- Configure contact email and phone number.
- Configure address and timezone.
- Select a club category.
- Configure the default currency, initially GBP.
- Configure membership terms and conditions.
- Edit club details.
- Deactivate a club.

The creator becomes the club owner.

#### FR-002: Club Dashboard

Priority: MUST

The system must provide a club dashboard displaying:

- Active member count.
- Pending membership applications.
- Upcoming activities.
- Recent attendance.
- Outstanding membership payments.
- Recent announcements.
- Items requiring administrative attention.

Dashboard information must be restricted to the selected club.

### 4.2 Member Management

#### FR-003: Member Registration

Priority: MUST

Administrators must be able to register members manually.

Required fields:

- First name.
- Last name.
- Email address, where applicable.
- Phone number, where applicable.
- Membership start date.
- Membership status.

Optional fields:

- Emergency contact details.
- Group assignments.
- Membership notes.
- Custom registration fields.

Additional functionality:

- Invite members to complete registration.
- Prevent accidental duplicate registrations.
- Allow members to update permitted information.
- Import members from CSV.
- Export member lists to CSV.

#### FR-004: Membership Lifecycle

Priority: MUST

Support the following membership statuses:

- Pending.
- Active.
- Suspended.
- Expired.
- Cancelled.

Administrators must be able to:

- Approve or reject applications.
- Record membership start and end dates.
- Renew memberships.
- Review basic membership history.
- Identify memberships approaching expiry.

The system should notify members about relevant membership status changes and renewals.

#### FR-005: Groups and Teams

Priority: MUST

Administrators must be able to:

- Create groups and teams.
- Configure names and descriptions.
- Assign members to groups.
- Assign coaches to groups.
- Configure group capacity.
- Move members between groups.
- View group membership.
- Filter members by group and membership status.

A member may belong to multiple groups.

### 4.3 Activities and Bookings

#### FR-006: Activity Management

Priority: MUST

Administrators and authorised organisers must be able to create activities.

An activity must support:

- Title.
- Description.
- Date.
- Start and end times.
- Location.
- Assigned group.
- Assigned organiser or coach.
- Maximum capacity.
- Optional price.
- Booking deadline.
- Activity status.

Administrators must be able to:

- Edit activities.
- Cancel activities.
- Reschedule activities.
- View upcoming activities.
- View past activities.

#### FR-007: Recurring Activities

Priority: SHOULD

Support recurring activities.

Required functionality:

- Weekly recurrence.
- Fortnightly recurrence.
- Monthly recurrence.
- Recurrence end date.
- Individual occurrence cancellation.
- Modification of an individual occurrence.
- Modification of an entire series.

The initial implementation should prioritise recurring weekly activities.

#### FR-008: Activity Bookings

Priority: MUST

Members must be able to:

- View eligible activities.
- Book an activity.
- Cancel a booking before the deadline.
- View booking status.
- See when an activity is full.

The system must:

- Enforce activity capacity.
- Prevent duplicate bookings.
- Prevent bookings by unauthorised members.
- Support manual bookings by authorised organisers.
- Support waiting lists when enabled.

Booking and attendance must be represented separately.

#### FR-009: Waiting Lists

Priority: COULD

When an activity is full:

- Allow members to join a waiting list.
- Maintain the order of waiting-list entries.
- Allow members to leave the waiting list.
- Notify the next eligible member when a place becomes available.
- Prevent multiple active bookings for the same person and activity.

### 4.4 Attendance

#### FR-010: Attendance Tracking

Priority: MUST

Coaches and authorised organisers must be able to:

- View an activity's participant list.
- Mark participants as present.
- Mark participants as absent.
- Mark participants as excused.
- Register attendance for members without advance bookings.
- Correct attendance records where authorised.

The system must maintain an attendance history.

#### FR-011: Attendance Reporting

Priority: SHOULD

Provide reports showing:

- Attendance per member.
- Attendance per activity.
- Attendance percentage over a selected period.
- Number of participants per session.
- Attendance by group.

Reports must support date-range filtering and CSV export.

### 4.5 Membership Plans and Payments

#### FR-012: Membership Plans

Priority: SHOULD

Administrators must be able to create membership plans.

Each plan must support:

- Name.
- Description.
- Price.
- Payment frequency.
- Membership duration, where applicable.
- Applicable groups.
- Active or inactive status.

Initial payment frequencies:

- Monthly.
- Annually.
- One-off.

#### FR-013: Payment Tracking

Priority: SHOULD

The system must support manual payment recording.

Required functionality:

- Associate payments with members.
- Associate payments with membership plans.
- Record payment amount.
- Record payment date.
- Record payment method.
- Track outstanding balances.
- Track overdue payments.
- Display payment history.
- Correct payment records where authorised.
- Export payment reports.

Payment statuses must distinguish between amounts due, recorded payments, and outstanding balances.

A manually recorded payment must not be represented as independently verified by a payment provider.

Automatic payment collection is outside the initial MVP.

### 4.6 Communications

#### FR-014: Announcements

Priority: MUST

Administrators must be able to:

- Create announcements.
- Add a title and message.
- Publish to the entire club.
- Publish to selected groups.
- Schedule publication where supported.
- Edit announcements.
- Archive announcements.

Members must only see announcements intended for them.

#### FR-015: Email Notifications

Priority: MUST

The application must support email notifications for:

- Invitations.
- Membership registration.
- Membership approval or rejection.
- Booking confirmations.
- Activity cancellations.
- Activity rescheduling.
- Upcoming activity reminders.
- Membership renewal reminders.
- Payment reminders.
- New announcements.

Requirements:

- Avoid duplicate notifications.
- Record delivery status where supported.
- Retry eligible failed deliveries.
- Support configurable email templates.
- Separate essential service communications from marketing messages.

The initial release should use email only.

SMS, WhatsApp, and push notifications are outside the MVP.

### 4.7 Member Portal

#### FR-016: Member Dashboard

Priority: MUST

Members must be able to:

- View membership information.
- View upcoming activities.
- Book and cancel activities.
- View attendance history.
- View payment history.
- View announcements.
- Update permitted personal details.

The portal must be responsive and usable on mobile devices.

#### FR-017: Parent and Guardian Management

Priority: MUST when targeting children's clubs

Parents and guardians must be able to:

- Create an account.
- Register one or more children.
- Link children to appropriate club memberships.
- View activities available to each child.
- Book and cancel activities for each child.
- View attendance history.
- View relevant announcements.
- Receive relevant communications.

The system must enforce parent-child relationships when accessing children's information.

#### FR-018: Consent and Emergency Contacts

Priority: MUST where relevant to the club's activities

The system should support:

- Emergency contact details.
- Relevant activity consent declarations.
- Consent declaration dates.
- Consent version information.
- Consent status.
- Updates and withdrawals of consent.
- Restricted access to sensitive information.

Only collect personal and sensitive information that is necessary for the service.

### 4.8 Invitations and Administration

#### FR-019: User Invitations

Priority: MUST

Club owners and authorised administrators must be able to:

- Invite users by email.
- Assign an appropriate role.
- Generate secure invitation links.
- Set invitation expiry.
- Revoke invitations.
- View pending invitations.
- View accepted invitations.

Expired or revoked invitations must not be usable.

#### FR-020: Account Management

Priority: MUST

The application must support:

- Secure registration.
- Login and logout.
- Account recovery.
- Secure session management.
- Club access revocation.
- Account deletion requests.
- Appropriate handling of personal data retention obligations.

#### FR-021: Reports and Exports

Priority: SHOULD

Provide the following reports:

- Active members.
- Membership registrations and cancellations.
- Members by group.
- Upcoming and past activities.
- Attendance.
- Membership fees collected.
- Outstanding payments.
- Membership renewals due.

Reports should support date filtering and CSV export.

Only authorised users may access reports.

---

## 5. Non-Functional Requirements

### NFR-001: Responsive Design

Priority: MUST

The application must support mobile, tablet, and desktop browsers.

### NFR-002: Tenant Isolation

Priority: MUST

Every club-specific operation must enforce the correct tenant context.

Users must not access another club's information by changing request parameters, identifiers, or URLs.

### NFR-003: Authentication and Authorisation

Priority: MUST

All protected operations must enforce authentication and server-side authorisation.

### NFR-004: Data Protection

Priority: MUST

Protect personal data in transit and at rest using appropriate security controls.

### NFR-005: Input Validation

Priority: MUST

Validate input on both the client and server where applicable.

### NFR-006: Error Handling

Priority: MUST

Return useful error messages without exposing credentials, sensitive data, or internal implementation details.

### NFR-007: Testing

Priority: MUST

Include automated tests for critical business workflows.

At a minimum, test:

- Authentication and authorisation.
- Tenant isolation.
- Membership management.
- Activity bookings.
- Capacity enforcement.
- Attendance.
- Payment calculations.
- Parent-child access restrictions.

### NFR-008: Backup and Recovery

Priority: MUST

Provide a documented database backup and recovery process.

### NFR-009: Audit Logging

Priority: SHOULD

Record important administrative operations, including changes to membership status, permissions, attendance, and payment records.

Audit records must not unnecessarily expose sensitive information.

### NFR-010: Accessibility

Priority: SHOULD

Target WCAG 2.2 AA accessibility standards.

### NFR-011: Personal Data Rights

Priority: MUST

Support appropriate workflows for personal data access, correction, export, and deletion.

Deletion must account for applicable legal retention obligations.

### NFR-012: Reliability

Priority: MUST

Critical operations must handle failures consistently.

Examples include booking activities, recording payments, and sending notifications.

The application must avoid duplicate bookings and duplicate payment records caused by retries.

---

## 6. Suggested Architecture

The implementation must follow the established conventions of the AI MVP Factory.

Avoid unnecessary architectural complexity.

### 6.1 Components

| Component | Responsibility |
|---|---|
| Frontend | Responsive user interface |
| Backend/API | Business logic, validation, and authorisation |
| Database | Persistent application data |
| Authentication | Identity, sessions, and account recovery |
| Email provider | Invitations and notifications |
| Hosting platform | Application deployment |
| Monitoring | Errors and operational health |

### 6.2 Architecture Requirements

- Prefer a straightforward application architecture over microservices.
- Use a relational database for structured club data.
- Separate business logic from presentation logic.
- Enforce tenant isolation at the API and data-access layers.
- Use database migrations for schema changes.
- Store secrets securely.
- Separate development, testing, and production environments.
- Support automated deployment.
- Include database backup and recovery procedures.
- Follow the AI MVP Factory's existing reusable components and coding standards.

Cloudflare Workers and a compatible relational database are possible deployment choices if they align with the Factory's existing architecture.

Do not introduce additional infrastructure unless it is needed.

---

## 7. Core Data Model

The initial data model should include the following entities.

### User

Represents a platform account.

Example fields:

- id
- email
- name
- account_status
- created_at
- updated_at

### Club

Represents a club or organisation.

Example fields:

- id
- name
- description
- logo_url
- contact_email
- contact_phone
- address
- timezone
- currency
- status
- created_at
- updated_at

### ClubMembership

Connects a user to a club.

Example fields:

- id
- club_id
- user_id
- role
- status
- created_at
- updated_at

A user may belong to multiple clubs.

### MemberProfile

Stores club-specific membership information.

Example fields:

- id
- club_id
- user_id
- first_name
- last_name
- membership_status
- membership_start_date
- membership_end_date
- created_at
- updated_at

### GuardianRelationship

Links a parent or guardian to a child.

Example fields:

- id
- club_id
- guardian_user_id
- child_member_profile_id
- relationship_type
- created_at

### Group

Represents a team, class, or group.

Example fields:

- id
- club_id
- name
- description
- capacity
- status

### GroupMember

Connects members to groups.

Example fields:

- id
- club_id
- group_id
- member_profile_id
- joined_at

### MembershipPlan

Defines a membership plan.

Example fields:

- id
- club_id
- name
- description
- price
- currency
- billing_frequency
- duration
- status

### Activity

Represents a session or event.

Example fields:

- id
- club_id
- group_id
- title
- description
- location
- start_at
- end_at
- capacity
- price
- booking_deadline
- status
- created_by

### ActivityBooking

Represents a booking.

Example fields:

- id
- club_id
- activity_id
- member_profile_id
- booking_status
- booked_at
- cancelled_at

Enforce uniqueness for active bookings where appropriate.

### AttendanceRecord

Records attendance.

Example fields:

- id
- club_id
- activity_id
- member_profile_id
- attendance_status
- recorded_by
- recorded_at
- updated_at

### PaymentRecord

Represents a payment record.

Example fields:

- id
- club_id
- member_profile_id
- membership_plan_id
- amount
- currency
- payment_method
- payment_status
- payment_date
- reference
- created_by
- created_at

### Announcement

Represents a club announcement.

Example fields:

- id
- club_id
- title
- message
- audience_type
- published_at
- created_by
- status

### Notification

Tracks notification delivery.

Example fields:

- id
- club_id
- recipient_user_id
- notification_type
- delivery_status
- sent_at
- created_at

### Invitation

Represents a pending invitation.

Example fields:

- id
- club_id
- email
- assigned_role
- token_hash
- expires_at
- accepted_at
- revoked_at
- created_by

### ConsentRecord

Stores relevant consent declarations.

Example fields:

- id
- club_id
- member_profile_id
- consent_type
- consent_version
- consent_status
- recorded_at
- updated_at

### AuditEvent

Records selected administrative actions.

Example fields:

- id
- club_id
- actor_user_id
- action
- entity_type
- entity_id
- created_at

Avoid storing sensitive information in audit event payloads unless necessary.

### Data Modelling Principles

- Every club-owned entity must be associated with a club.
- Foreign-key relationships must be validated.
- Club ownership must be enforced on every relevant operation.
- A user account must be distinct from a club membership.
- Booking records must be distinct from attendance records.
- Membership plans must be distinct from payment records.
- Parent-child relationships must be explicit and authorised.
- Financial amounts must use an appropriate decimal or integer representation.
- Dates and times must be stored and processed consistently, with the club timezone applied for display.
- Important records should have appropriate creation and update timestamps.

---

## 8. MVP Delivery Plan

### Phase 1: Core MVP

Goal: Deliver a working product for a small club.

Must-have functionality:

- Club registration.
- Authentication.
- Club-specific roles and permissions.
- Member management.
- Group management.
- Activity management.
- Activity bookings.
- Attendance tracking.
- Announcements.
- Email invitations.
- Essential notifications.
- Member dashboard.
- Parent and guardian functionality when targeting children's clubs.
- Tenant isolation.
- Responsive design.
- Critical automated tests.

Should-have functionality:

- CSV member import and export.
- Membership plans.
- Manual payment tracking.
- Basic reports.

### Phase 2: Monetisation and Retention

Goal: Make the platform commercially useful.

Potential functionality:

- Online payment integration.
- Automated membership renewals.
- Payment reminders.
- Waiting lists.
- Advanced attendance reports.
- Custom registration fields.
- More granular permissions.
- Club branding.
- Recurring activity management.
- Automated data-retention workflows.

### Phase 3: Expansion

Goal: Support a wider range of club types.

Potential functionality:

- Multiple locations.
- Facility and equipment bookings.
- Volunteer management.
- Competition and tournament management.
- Event ticketing.
- Advanced financial reporting.
- Calendar integrations.
- Additional languages and currencies.
- Public club pages.

Features must be prioritised based on user feedback and demonstrated demand.

---

## 9. Out of Scope for the Initial MVP

The following features must not delay the first release:

- Native iOS application.
- Native Android application.
- Built-in chat.
- Video conferencing.
- Complex accounting.
- Payroll.
- Advanced league management.
- Automated direct debit.
- SMS notifications.
- WhatsApp integration.
- Push notifications.
- Advanced marketing automation.
- Public social network.
- AI-powered features.
- Custom integrations for individual clubs.

These features may be considered in future phases.

---

## 10. Acceptance Criteria

The MVP is ready for pilot testing when the following scenarios work end to end.

### AC-001: Create a Club

Given a registered user,

When the user creates a club,

Then:

- The club is created.
- The user becomes its owner.
- The owner can update club settings.
- The owner can invite an administrator.
- The administrator can access only that club.

### AC-002: Register a Member

Given an authorised administrator,

When the administrator registers a member,

Then:

- The member is created.
- The member can receive an invitation.
- The member can complete registration.
- The member appears in the member list.
- The administrator can assign the member to a group.

### AC-003: Create an Activity

Given an authorised administrator,

When the administrator creates an activity,

Then:

- The activity is saved.
- Eligible members can view it.
- Members can book places.
- Capacity limits are enforced.
- Duplicate bookings are prevented.

### AC-004: Record Attendance

Given an authorised coach,

When the coach records attendance,

Then:

- Attendance records are saved.
- Each participant has an attendance status.
- Authorised administrators can review attendance history.
- Unauthorised users cannot modify attendance.

### AC-005: Record a Payment

Given an authorised administrator,

When the administrator records a payment,

Then:

- The payment is associated with the correct member.
- The payment history is updated.
- The outstanding balance is recalculated correctly.
- The payment can be included in reports.
- Unauthorised users cannot modify the payment.

### AC-006: Publish an Announcement

Given an authorised administrator,

When an announcement is published,

Then:

- The announcement appears to its intended audience.
- Relevant email notifications are sent.
- Members from other clubs cannot access it.

### AC-007: Enforce Tenant Isolation

Given users belonging to different clubs,

When a user attempts to access another club's information,

Then:

- The request is rejected unless explicitly authorised.
- Changing an identifier or URL cannot bypass access controls.
- Sensitive information is not returned.

### AC-008: Manage a Child's Participation

Given an authorised parent or guardian,

When the parent manages a linked child's activities,

Then:

- Only authorised linked children are accessible.
- The parent can view relevant activities.
- The parent can book or cancel activities.
- The parent can view relevant attendance information.
- Unauthorised users cannot access the child's records.

### AC-009: Use the Application on Mobile

Given a user accessing ClubHub from a mobile browser,

When the user performs a critical workflow,

Then:

- The interface remains usable.
- Navigation works correctly.
- Forms are accessible.
- The user can complete the workflow without a desktop computer.

---

## 11. Initial Business Model

ClubHub should initially use a subscription model.

Indicative pricing hypotheses:

| Plan | Target customer | Monthly price |
|---|---|---:|
| Free | Clubs evaluating the platform | £0 |
| Starter | Small clubs | £9 |
| Standard | Growing clubs | £19 |
| Plus | Larger clubs | £39 |

These prices are assumptions to validate, not established market rates.

Potential plan limits include:

- Active members.
- Number of administrators.
- Available features.
- Reporting capabilities.

Avoid introducing per-booking fees in the initial release.

The free tier should be sufficient for a small club to experience the core product while leaving a clear reason to upgrade.

---

## 12. Success Metrics

Track the following metrics from the first release.

### Acquisition

- Number of clubs registered.
- Number of clubs completing onboarding.
- Number of invited users.

### Activation

- Members added per club.
- Activities created per club.
- First booking completed.
- First attendance record created.

### Engagement

- Weekly active clubs.
- Activities created per week.
- Attendance records created.
- Active members per club.

### Retention

- Clubs active after 30 days.
- Clubs active after 90 days.
- Club cancellation rate.

### Revenue

- Free-to-paid conversion rate.
- Monthly recurring revenue.
- Average revenue per club.
- Paid club retention.

### Initial Validation Target

Recruit 5–10 clubs for a pilot.

Observe whether the product replaces an existing spreadsheet, form, or administrative workflow.

Prioritise evidence of repeated usage and willingness to pay over the total number of features delivered.

---

## 13. Security, Privacy, and Compliance

ClubHub may process personal information relating to adults and children.

The implementation must:

- Follow applicable UK GDPR and Data Protection Act requirements.
- Provide appropriate privacy information.
- Collect only necessary personal data.
- Implement appropriate access controls.
- Protect sensitive information.
- Provide suitable data retention and deletion workflows.
- Support relevant data access and correction requests.
- Assess whether a Data Protection Impact Assessment is necessary.
- Ensure that parent-child access relationships are correctly enforced.
- Review the requirements applicable to children's services before launch.

The platform must not assume that collecting consent is the correct legal basis for every processing activity. The appropriate lawful basis and any additional requirements must be assessed for each relevant processing purpose.

Compliance requirements should be reviewed before the platform is used by real clubs.

---

## 14. Development Guidelines for the AI MVP Factory

When implementing ClubHub:

1. Follow the existing AI MVP Factory architecture and conventions.
2. Reuse existing authentication, database, UI, and deployment components where appropriate.
3. Avoid unnecessary dependencies.
4. Implement one complete workflow at a time.
5. Add automated tests for each critical workflow.
6. Use database migrations for schema changes.
7. Validate input on the server.
8. Enforce tenant isolation from the beginning.
9. Never rely on frontend checks as the only authorisation mechanism.
10. Keep development and production configuration separate.
11. Provide seed data for local development and testing.
12. Document environment variables and deployment steps.
13. Avoid introducing external integrations until the core workflow is stable.
14. Do not implement features marked out of scope without an explicit product decision.
15. Update this README when requirements or architectural decisions change.

### Recommended Implementation Order

1. Review the existing Factory architecture.
2. Define the database schema and tenant model.
3. Implement authentication and club membership.
4. Implement role-based access control.
5. Implement member management.
6. Implement groups.
7. Implement activities and bookings.
8. Implement attendance.
9. Implement announcements and email notifications.
10. Implement the member portal.
11. Implement basic membership plans and payment tracking.
12. Implement reports.
13. Complete security and regression testing.
14. Deploy a pilot environment.
15. Onboard the first clubs and collect feedback.

---

## 15. Key Product Decisions

The following decisions should guide the initial implementation.

| Decision | Initial approach |
|---|---|
| Target market | Small UK clubs |
| Initial platform | Responsive web application |
| Business model | Subscription |
| Architecture | Simple, modular application |
| Multi-tenancy | Multiple isolated clubs |
| Authentication | Secure account-based authentication |
| Permissions | Role-based access control |
| Payments | Manual payment recording initially |
| Communications | Email notifications |
| Membership management | Member profiles and club memberships |
| Activity management | Scheduled activities and bookings |
| Attendance | Explicit attendance records |
| Children's access | Parent or guardian accounts |
| AI features | Not required |
| Native mobile apps | Out of scope |
| Deployment | Follow existing AI MVP Factory conventions |

Decisions that may need revisiting after the pilot:

- Which club segment to prioritise.
- Whether online payments are essential.
- Whether pricing should depend on membership size.
- Whether parents or individual members should be the primary users.
- Which reports clubs use most frequently.
- Which integrations are genuinely required.

---

## 16. Definition of Done

A feature is considered complete when:

- Its requirements are implemented.
- Its access-control rules are enforced.
- Its validation and error handling are implemented.
- Relevant automated tests pass.
- Critical edge cases are handled.
- The user interface works on mobile and desktop.
- Documentation is updated where necessary.
- No secrets or sensitive data are exposed.
- The feature works in the target deployment environment.

The initial MVP is complete when all MUST requirements are implemented, critical acceptance criteria pass, and the application is ready for a controlled pilot.

---

## 17. Summary

ClubHub is a lightweight club management platform focused on five core workflows:

1. Manage members.
2. Organise activities.
3. Record attendance.
4. Communicate with members.
5. Track membership fees.

The initial objective is not to build a comprehensive club-management ecosystem.

It is to deliver a simple, reliable product that a small club can adopt quickly, use regularly, and potentially pay for.

Future development should be guided by real club feedback, retention, and willingness to pay.