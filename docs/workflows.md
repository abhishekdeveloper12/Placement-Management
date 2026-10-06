# Operational Workflows Specification (Phase 1)

This document maps out the core end-to-end operational workflows for Phase 1 of the Placement Management System. Student-facing workflows are intentionally excluded.

---

## Workflow 1: Super Admin → Organization Registration → PMO Provisioning → PMO Login

```
┌──────────────┐     1. Registers Org      ┌──────────────────┐     2. Opens Details      ┌────────────────┐
│ SUPER_ADMIN  │ ────────────────────────> │   Organization   │ ────────────────────────> │  Org Profile   │
└──────────────┘                           │ (Tenant Record)  │                           │  & PMO Card    │
                                           └──────────────────┘                           └───────┬────────┘
                                                                                                  │ 3. Provisions PMO
                                                                                                  ▼
┌──────────────┐                           ┌──────────────────┐                           ┌────────────────┐
│  PMO Portal  │ <──────────────────────── │  Token & Profile │ <──────────────────────── │  Primary PMO   │
│ (Outreach)   │        5. PMO Login       │  (Safe Session)  │     4. Secure Credentials │  Credentials   │
└──────────────┘                           └──────────────────┘                           └────────────────┘
```
1. **Super Admin Action:** Navigates to Platform Administration → Organizations → "Register Organization".
2. **Organization Registration:** Inputs institution name, unique uppercase code (slug), contact email, phone, and campus address. Status defaults to `ACTIVE`.
3. **Inspect Organization Details:** Super Admin navigates to `/super-admin/organizations/:id` to review institution profile and status.
4. **Primary PMO Provisioning:** Super Admin clicks "Provision Primary PMO" and inputs PMO full name, corporate email address, contact phone, and secure password (conforming to 8-character complexity policy).
5. **System Validation:** Backend verifies that the organization is active, ensures no existing PMO is assigned (one-primary-PMO rule), validates email uniqueness, hashes the password via bcrypt (12 rounds), records audit events, and binds `role = 'PMO'` and `organizationId = org._id`.
6. **PMO Login & Access:** The provisioned PMO logs in at `/login` with their credentials, receives a short-lived access token and HTTP-only refresh token, and is routed to `/pmo`.

---

## Workflow 2: PMO → Team Member Onboarding & Account Management

```
┌──────────────┐     1. Provisions Member    ┌──────────────────┐     3. Receives Token    ┌────────────────┐
│     PMO      │ ──────────────────────────> │   Team Member    │ ───────────────────────> │  Team Member   │
│ (Org Admin)  │                             │  Account & Hash  │                          │   Workspace    │
└──────┬───────┘                             └────────┬─────────┘                          └────────────────┘
       │                                              │
       │ 2. Audit Trail Logged                        │ 4. Status Toggle / Session Invalidation
       ▼                                              ▼
┌──────────────┐                             ┌──────────────────┐
│   AuditLog   │                             │  Instant Access  │
│  Collection  │                             │  Block on Suspend│
└──────────────┘                             └──────────────────┘
```
1. **PMO Action:** PMO logs in, navigates to `/pmo/team-members`, and clicks "+ Add Team Member".
2. **Account Provisioning:** Enters full name, corporate email address, contact phone, password (meeting 8-character complexity policy with uppercase, lowercase, digit, and symbol), and initial status (`ACTIVE` or `INACTIVE`).
3. **Strict Tenant & Role Guardrail:**
   - Server-side controllers strictly derive `organizationId` from `req.user.organizationId`. Client-supplied organization IDs or roles are ignored or rejected.
   - The user is guaranteed the role `TEAM_MEMBER`.
   - The password is encrypted via 12-round bcrypt hashing.
   - Audit trail records `TEAM_MEMBER_CREATED`.
4. **Member Profile Inspection & Updates:**
   - PMO can view the full roster with search, status filtering, and pagination.
   - PMO can view individual member profiles at `/pmo/team-members/:id`.
   - PMO can edit contact details, full name, or perform an optional password reset via the Edit modal.
5. **Account Status & Session Revocation:**
   - PMO can deactivate a team member with a single confirmation dialog.
   - Deactivation or password reset immediately increments `tokenVersion`, invalidating any active JWT sessions for that member.
   - Inactive team members are rejected at login with `403 ACCOUNT_INACTIVE`.
6. **Outreach Workspace Access:** Active team members log in at `/login` and access their role-protected workspace (`/team-member`).

---

## Workflow 2.5: PMO & Super Admin → Company Master Management

```
┌──────────────┐     1. Creates / Edits      ┌──────────────────┐     3. Audit Logged      ┌────────────────┐
│ PMO / ADMIN  │ ──────────────────────────> │  Company Master  │ ───────────────────────> │    AuditLog    │
│ (Org / Super)│                             │   & HR Contact   │                          │   Collection   │
└──────┬───────┘                             └────────┬─────────┘                          └────────────────┘
       │                                              │
       │ 2. Scoped & Deduplicated                     │ 4. Accessible in Roster & Details
       ▼                                              ▼
┌──────────────┐                             ┌──────────────────┐
│ Deterministic│                             │ Company Profile  │
│ Duplicate Check                            │ & Contact Details│
└──────────────┘                             └──────────────────┘
```
1. **Initiation:** PMO or Super Admin navigates to `/pmo/companies` or `/super-admin/companies` and clicks "+ Add Company".
2. **Company Registration & HR Contact Payload:** Submits company name, industry sector, website URL, LinkedIn profile, location (city, state, country, campus address), placement notes, status, and optional primary HR contact details (name, designation, email, phone).
3. **Tenant Scoping & Multi-Tenant Boundaries:**
   - For PMO: `organizationId` is strictly assigned from `req.user.organizationId`. Client-supplied tenant IDs are ignored.
   - For Super Admin: Organization dropdown is required and validated against active institutions.
4. **Deterministic Duplicate Prevention:**
   - Server computes `normalizedName` (lowercased, stripped punctuation). If an exact normalized name exists within the same organization, creation is rejected with `409 DUPLICATE_COMPANY`.
   - Normalizes website URL. If duplicate website exists within the same organization, creation is rejected with `409 DUPLICATE_COMPANY_WEBSITE`.
   - Identical company names across different educational organizations are explicitly permitted.
5. **Updates & Status Lifecycle:**
   - User can edit company details, notes, or primary contact.
   - Status can be toggled between `ACTIVE` and `INACTIVE`. Deactivation preserves historical records while preventing new assignments.
6. **Audit Trail Logging:** All creation, update, and status toggle actions write structured audit events (`COMPANY_CREATED`, `COMPANY_UPDATED`, `COMPANY_ACTIVATED`, `COMPANY_DEACTIVATED`).

---

## Workflow 3: PMO & Super Admin → Company Bulk Import

```
┌──────────────┐     1. Uploads Spreadsheet   ┌──────────────────┐     2. Non-Destructive    ┌────────────────┐
│ PMO / ADMIN  │ ───────────────────────────> │  File Parser &   │ ────────────────────────> │ Validation &   │
│              │      (.csv, .xls, .xlsx)     │  Header Mapping  │        Validation         │ Preview Table  │
└──────────────┘                              └──────────────────┘                           └───────┬────────┘
                                                                                                     │ 3. Confirms Import
                                                                                                     ▼
┌──────────────┐                              ┌──────────────────┐                           ┌────────────────┐
│ Error Report │ <─────────────────────────── │  CompanyImport   │ <──────────────────────── │ Batch Insert   │
│  CSV Export  │      5. Download Skipped     │   History Log    │      4. Saves Valid Rows   │ Into Database  │
└──────────────┘                              └──────────────────┘                           └────────────────┘
```
1. **Initiation & Template Download:** PMO or Super Admin navigates to Bulk Company Import (`/pmo/companies/import` or `/super-admin/companies/import`). Downloads standard CSV or Excel template.
2. **File Drag & Drop Upload:** Uploads `.csv`, `.xls`, or `.xlsx` spreadsheet file (max 10MB). Super Admin explicitly selects target educational organization.
3. **Deterministic Column Header Mapping:** Backend auto-detects column headers against field synonyms (Company Name, Industry, Website, LinkedIn, Location, HR Name, HR Email, etc.). User can override header mappings if necessary.
4. **Non-Destructive Validation & Preview:**
   - Server parses spreadsheet rows and evaluates required fields (Company Name is required).
   - Validates HR email syntax.
   - Performs in-file deduplication against earlier rows in the uploaded file.
   - Performs database deduplication against existing `Company` records in the target organization using `normalizedName` and website URL.
   - Categorizes every row as `VALID`, `DUPLICATE`, or `INVALID` and returns summary KPI cards + filterable row preview table with clear reason tooltips.
5. **Batch Execution & Commit:** User reviews preview and clicks "Confirm Import (Import X Valid Rows)". Backend inserts valid rows into `Company` and primary `Contact` collections, writes `AuditLog` events, and records a `CompanyImport` document.
6. **Import History & Error Report Export:** User views execution report. If any rows were skipped or failed, user can download a detailed CSV error report listing row numbers and exact failure explanations. Past import history is tracked in the Import History tab.

---

## Workflow 4: PMO → Company Assignment & Reassignment

```
┌──────────────┐     1. Filters Roster       ┌──────────────────┐     2. Single / Bulk      ┌────────────────┐
│     PMO      │ ──────────────────────────> │ Company Directory│ ────────────────────────> │ Assignment     │
│ (Org Admin)  │    (Assigned/Unassigned)    │  & Action Modal  │      Allocation Modal     │ Engine         │
└──────┬───────┘                             └──────────────────┘                           └───────┬────────┘
       │                                                                                            │ 3. Database Index
       │ 5. Read-Only History Timeline Preserved                                                    ▼
┌──────▼───────┐                             ┌──────────────────┐                           ┌────────────────┐
│ Assignment   │ <────────────────────────── │ Single Active    │ <──────────────────────── │ Active         │
│ Lineage Audit│     4. Historical Records   │ Owner Constraint │      Allocates Target     │ Calling Queue  │
└──────────────┘        Marked ENDED         └──────────────────┘       Team Member         └────────────────┘
```
1. **Filter & Select Companies:** PMO navigates to `/pmo/companies` and filters by `Assignment Status` (`ALL`, `ASSIGNED`, `UNASSIGNED`) or specific team member. Selects single company or checks multiple companies for bulk operation.
2. **Single & Bulk Allocation:**
   - **Single Assign / Reassign:** Clicks "Assign" or "Reassign" on company row or details card. Selects target active `TEAM_MEMBER` and inputs optional instructions/notes.
   - **Bulk Allocation:** Clicks "Assign Selected (X)", selects target Team Member, and submits. The system processes all selected companies in a single transaction-safe operation, returning a live breakdown (`Assigned`, `Reassigned`, `Already Assigned`, `Failed`).
3. **Single Active Owner Rule & Database Enforcement:**
   - At any point in time, a company has at most ONE active assignment (`status: 'ACTIVE'`).
   - The MongoDB partial unique index `{ organizationId: 1, companyId: 1, status: 1 }` (`status: 'ACTIVE'`) strictly guarantees database-level uniqueness against race conditions or duplicate clicks.
4. **Reassignment & Unassignment Lineage:**
   - When a company is reassigned or unassigned, the previous active assignment transitions to `status: 'ENDED'` with an `unassignedAt` timestamp.
   - Assignments are never deleted or overwritten, maintaining a complete read-only audit history of who managed each corporate account over time.
5. **Team Member Queue & Resource Hiding Security:**
   - Assigned companies immediately appear in the target Team Member's calling workspace (`/team-member/companies`).
   - Team members are strictly restricted to viewing only companies actively assigned to them (`status: 'ACTIVE'`). Access attempts to unassigned or cross-assigned accounts return `404 COMPANY_NOT_FOUND`.

---

## Workflow 5: Team Member → Company Call Execution

```
┌────────────────┐     Selects Assigned     ┌──────────────────┐     Initiates Call     ┌────────────────┐
│  Team Member   │ ───────────────────────> │  Company Details │ ─────────────────────> │ Corporate HR / │
│                │      From Queue          │   & Contact Card │                        │   Recruiter    │
└────────────────┘                          └──────────────────┘                        └────────────────┘
```
1. **Queue Inspection:** Team Member views their daily dashboard containing "Assigned Companies" and "Today's Follow-ups".
2. **Contact Card Review:** Opens a company record to review past touchpoints, company website, and primary HR phone/email.
3. **Outreach Initiation:** Dials the recruiter or initiates email outreach.

---

## Workflow 6: Team Member → Quick HR Questionnaire & Call Capture

```
┌────────────────┐     1. Clicks Call HR     ┌────────────────────┐     2. Confirms / Edits  ┌────────────────┐
│  Team Member   │ ─────────────────────────> │   Quick Call Modal │ ───────────────────────> │  Primary HR    │
│  (Active Owner)│    From Roster / Details   │     Questionnaire  │      Contact Details   │  Recruiter     │
└──────┬─────────┘                            └─────────┬──────────┘                          └────────────────┘
       │                                                │
       │ 5. Saved to Timeline & Summary                 │ 3. Submits Response in < 2-3 Mins
       ▼                                                ▼
┌────────────────┐                            ┌────────────────────┐                          ┌────────────────┐
│ Company Roster │ <───────────────────────── │  Interaction &     │ ───────────────────────> │ Scheduled      │
│ & History Table│    4. Logged Audit Events  │  callDetails Saved │   If Next Action =     │ FollowUp Task  │
└────────────────┘                            └────────────────────┘    FOLLOW_UP             └────────────────┘
```
> **Core UX Principle:** Minimize friction during active telephone calls. The questionnaire takes 2–3 minutes max, using progressive conditional disclosure.
1. **Initiate Outreach:** Team Member opens an assigned company and clicks "Call HR / Record Outreach".
2. **HR Contact Confirmation / Inline Edit:** Renders primary HR recruiter details (Name, Designation, Email, Phone, LinkedIn). Team Member can inline edit contact fields or add a new primary contact without leaving the call capture modal.
3. **Questionnaire Capture:**
   - **Currently Hiring?** (`YES`, `HIRING_PLANNED`, `NO`, `NOT_SURE`).
   - **Conditional Disclosure:** If `NO`, unnecessary hiring detail inputs are hidden, focusing on summary notes and next action. If `YES`/`HIRING_PLANNED`, captures Hiring Profiles, Candidate Type (`FRESHERS`/`EXPERIENCED`/`BOTH`), Approx. Openings, Opportunity Type (`FULL_TIME`/`INTERNSHIP`/`INTERNSHIP_PPO`/`MULTIPLE`), PPO Availability (if internship), Location, Work Mode (`ONSITE`/`HYBRID`/`REMOTE`), Package/Stipend, Bond, and Specific Requirement notes.
   - **HR Conversation Notes:** Text summary of recruiter response.
   - **Next Action Step:** (`FOLLOW_UP`, `WAITING_FOR_JD`, `NO_ACTION`, `OTHER`).
   - **Follow-up Date:** Mandatory date picker if `Next Action = FOLLOW_UP`.
4. **Server Validation & Security Enforcement:**
   - Server verifies that `company.organizationId` matches `req.user.organizationId` AND an active `Assignment` exists for `req.user.id` (`status: 'ACTIVE'`). Unassigned company attempts return `404 COMPANY_NOT_FOUND`.
   - Validates `followUpDate` when `nextAction = FOLLOW_UP`.
5. **Database Persistence & Audit Trail:**
   - Saves `Interaction` record with populated `callDetails`.
   - Inline creates/updates `Contact` record, writing `HR_CONTACT_CREATED` or `HR_CONTACT_UPDATED` audit log.
   - If `nextAction = FOLLOW_UP`, automatically provisions `FollowUp` task (`status: 'PENDING'`), writing `FOLLOW_UP_CREATED` audit log.
   - Writes `INTERACTION_CREATED` audit log.
6. **Workspace Update:** Immediately refreshes the company's Outreach Summary Card (`Last Contacted`, `Last Call Outcome`, `Next Scheduled Follow-up`) and chronological Interaction Log table.

---

## Workflow 7: HR → Job Description (JD) Reception

```
┌────────────────┐     Emails / Shares JD     ┌──────────────────┐     Receives Document     ┌────────────────┐
│   Company HR   │ ─────────────────────────> │   Team Member    │ ────────────────────────> │ File Stored &  │
│                │     via Email / Link       │   Or PMO Inbox   │                           │ Ready to Ingest│
└────────────────┘                            └──────────────────┘                           └────────────────┘
```
1. **Outreach Follow-Through:** Following a positive call, the HR manager emails or shares a Job Description document (PDF/Word).
2. **Document Inspection:** Team Member or PMO opens the document and verifies that it contains student hiring criteria.

---

## Workflow 8: Team Member / PMO → Job Opportunity Creation [IMPLEMENTED]

```
┌────────────────┐     Enters Key Details     ┌────────────────────┐     Attaches JD File     ┌────────────────┐
│ Team Member /  │ ─────────────────────────> │ Job Opportunity    │ ───────────────────────> │  Opportunity   │
│      PMO       │                            │   Capture Form     │                          │  Saved (Lead)  │
└────────────────┘                            └────────────────────┘                          └────────────────┘
```
1. **Opportunity Entry:** From the company profile, clicks "Add Job Opportunity".
2. **Essential Parameter Capture:**
   - Job Designation (e.g., "Associate Software Engineer")
   - Employment Type (Full-time / Internship)
   - Target Disciplines / Degrees (e.g., B.Tech CS, IT, MCA)
   - Compensation Details (CTC Range, Stipend, Benefits)
   - Job Location(s)
   - Estimated Intake / Vacancy Count
3. **JD File Attachment:** Uploads the raw JD file (stored via the document storage abstraction).
4. **Status Assignment:** Opportunity status is set to `Captured`.

---

## Workflow 9: PMO → Opportunity Shortlisting & Qualification [IMPLEMENTED]

```
┌──────────────┐     Reviews Captured     ┌────────────────────┐     Qualifies / Holds     ┌────────────────┐
│     PMO      │ ───────────────────────> │ Opportunity Review │ ────────────────────────> │  Shortlisted   │
│              │       Pipeline           │     Workbench      │                           │ Opportunities  │
└──────────────┘                          └────────────────────┘                           └────────────────┘
```
1. **Workbench Access:** PMO opens the "Opportunities Workbench".
2. **Filtering & Inspection:** Filters opportunities across departments, compensation tiers, and dates.
3. **JD Review:** Views attached JD documents and compensation specifications.
4. **Qualification Decision:**
   - **Shortlist:** Approves the opening for upcoming placement drives (`Status: Shortlisted`).
   - **On Hold:** Requests further clarification from team member / employer.
   - **Decline:** Rejects unsuitable opportunities (e.g., unaccredited bond requirements).

---

## Workflow 10: PMO → Team Coverage & Performance Analytics [IMPLEMENTED]

```
┌──────────────┐     Opens Dashboard     ┌────────────────────┐     Monitors KPIs &     ┌────────────────┐
│     PMO      │ ──────────────────────> │  Analytics Suite   │ ──────────────────────> │ Reallocates or │
│              │                         │     (Recharts)     │     Identifies Bottlenecks│ Takes Action   │
└──────────────┘                         └────────────────────┘                         └────────────────┘
```
1. **Analytics Dashboard:** PMO visits the institutional analytics page.
2. **Key Metric Evaluation:**
   - Calling Coverage (% of assigned companies contacted this week).
   - Team Member Leaderboard (Calls made, follow-ups completed, opportunities generated).
   - Pipeline Funnel (Assigned → Contacted → Interested → Opportunity Captured → Shortlisted).
   - Category Breakdown (Hiring by Industry and Tier).
3. **Operational Adjustment:** Based on coverage gaps, PMO reallocates dormant accounts or triggers targeted outreach drives.

---

## Workflow 11: Super Admin → Organization-Wise Company Visibility

```
┌──────────────┐     Selects Platform     ┌────────────────────┐     Drills into Org     ┌────────────────┐
│ SUPER_ADMIN  │ ───────────────────────> │  Global Directory  │ ──────────────────────> │ Tenant Company │
│              │      Aggregates          │    & Analytics     │                         │   Breakdown    │
└──────────────┘                          └────────────────────┘                         └────────────────┘
```
1. **Platform Audit:** Super Admin logs into the platform governance console.
2. **Global Company Directory:** Views aggregate numbers across all institutions.
3. **Tenant Drill-down:** Selects a specific educational organization to inspect their active company count, outreach velocity, and duplicate employer coverage across colleges.
4. **Platform Health Check:** Monitors system utilization and audit events.

---

## Workflow 12: System Mutation → Business Operation Success → Immutable Audit Trail Recording [IMPLEMENTED]

```
┌─────────────────┐     1. Invokes Mutation    ┌─────────────────────┐     2. Mutates Data    ┌──────────────────┐
│ User / PMO / SA │ ─────────────────────────> │   Business Service  │ ─────────────────────> │ Primary MongoDB  │
└─────────────────┘                            │ (Company/Opp/User)  │                        │    Collection    │
                                               └──────────┬──────────┘                        └──────────────────┘
                                                          │
                                                          │ 3. Operation Succeeds
                                                          ▼
                                               ┌─────────────────────┐     4. Writes Record   ┌──────────────────┐
                                               │    Audit Service    │ ─────────────────────> │     AuditLog     │
                                               │ (Sanitizes & Diff)  │                        │    Collection    │
                                               └─────────────────────┘                        └──────────────────┘
```

1. **Principle of Execution:** Every important business mutation (create, update, status change, shortlist, document upload) executes inside its respective business service.
2. **Business Operation Verification:** Audit logs are recorded **only after** the underlying business operation or database transaction successfully completes. Failed or unauthorized operations never emit success audit logs.
3. **Automatic Sanitization & Diff Generation:** The centralized `AuditService` automatically sanitizes pre/post states to redact passwords, JWTs, keys, and tokens, generating a minimal diff snapshot (`oldValue` vs `newValue`).
4. **Administrative Inspection:**
   - **PMO:** Navigates to `/pmo/audit-logs` to inspect an organization-scoped, searchable audit table with side-by-side state mutation diff inspection.
   - **Super Admin:** Navigates to `/super-admin/audit-logs` for cross-tenant global audit inspection and institutional filtering.

---

## Workflow 13: System & Business Events → In-App Notifications & Follow-Up Reminders [IMPLEMENTED]

```
┌─────────────────┐     1. Triggers Action     ┌─────────────────────┐     2. Generates Alert   ┌──────────────────┐
│ Business Event  │ ─────────────────────────> │ NotificationService │ ───────────────────────> │   Notification   │
│ (Assign/Short)  │    (Or Due Reminder)     │ (Deduplication Check│                          │    Collection    │
└─────────────────┘                            └──────────┬──────────┘                          └──────────────────┘
                                                          │
                                                          │ 3. 60s Polling / Dropdown Fetch
                                                          ▼
                                               ┌─────────────────────┐     4. Clicking Item     ┌──────────────────┐
                                               │   Header Bell /     │ ───────────────────────> │ Target Entity    │
                                               │ Notifications Center│     Direct Navigation    │ Workspace View   │
                                               └─────────────────────┘                          └──────────────────┘
```

1. **Triggering Event Sources:**
   - **Follow-Up Reminders:** Dynamic check on `checkAndGenerateFollowUpReminders` generates `FOLLOW_UP_DUE` (for today) and `FOLLOW_UP_OVERDUE` (past due date) notifications for assigned team members. Uses deterministic `deduplicationKey` to prevent duplicate notifications on repeated queries.
   - **Company Assignment:** PMO assigning or reassigning a company generates `COMPANY_ASSIGNED` or `COMPANY_REASSIGNED` notifications for the assignee.
   - **Opportunity Shortlisting:** PMO shortlisting a job opportunity generates `OPPORTUNITY_SHORTLISTED` for the team member who created the opportunity.
   - **JD Upload:** Uploading a JD document generates `JD_RECEIVED` notifications.
2. **Delivery & UI Integration:**
   - `<NotificationBell />` in top application header displays an unread count badge with 60-second periodic polling.
   - Opening the dropdown renders recent alerts with action buttons to mark read.
   - Clicking an alert marks it as read and redirects the user directly to the relevant entity (e.g. company workspace, opportunity detail page, or follow-up queue).
   - `/notifications` full-page center provides filter tabs (`All`, `Unread`, `Follow-ups`, `Assignments`, `Opportunities`), full pagination, and "Mark All as Read" capabilities.

---

## Workflow 15: PMO → Feedback-Driven Currently Hiring Engine [IMPLEMENTED]

```
┌─────────────────┐     1. Logs Outreach Call   ┌───────────────────────┐     2. Dynamic Grouping     ┌─────────────────┐
│ Team Member /   │ ──────────────────────────> │   Interaction Model   │ ──────────────────────────> │ PMO Analytics   │
│ PMO User        │   (Hiring Status = YES)     │ (Historical Timeline) │    (Latest Per Company)   │ Engine (Agg)    │
└─────────────────┘                             └───────────────────────┘                             └────────┬────────┘
                                                                                                               │
                                                                                                               │ 3. Updates Operational View
                                                                                                               ▼
┌─────────────────┐                             ┌───────────────────────┐                             ┌─────────────────┐
│ Company Database│ <────────────────────────── │  Feedback Details     │ <────────────────────────── │ PMO Currently   │
│ Filtered Roster │      5. Clicks "View        │  Modal (HR Details)   │      4. Clicks Card         │ Hiring KPI Card │
└─────────────────┘         Feedback"           └───────────────────────┘                             └─────────────────┘
```
1. **Source of Truth:** Driving the Currently Hiring section strictly from the latest HR outreach feedback recorded by Team Members or PMOs (`Interaction` outcome `HIRING_NOW` or `callDetails.hiringStatus = 'YES'`). No manual flags or stale data.
2. **Latest Feedback Rule:** Evaluates ONLY the most recent interaction per company (sorted by `interactionDate` DESC). If a company's newest call indicates `HIRING NOW`, it appears under Currently Hiring. If a subsequent call records `NOT_HIRING`, the company automatically leaves the Currently Hiring view while preserving historical call records.
3. **PMO Dashboard Card:** Displays unique currently hiring companies count, total open roles (sum of openings from active hiring feedback), and hiring planned count. Clicking the card routes to `/pmo/companies?hiringStatus=HIRING_NOW`.
4. **Sorted Newest Feedback First:** The filtered Company Database displays unique hiring companies sorted by latest feedback timestamp descending, displaying the Team Member/PMO who collected the feedback, feedback date/time, openings count, target profiles, and a "View Feedback" button.
5. **Modal Feedback Drill-down:** Clicking "View Feedback" opens a detailed modal presenting full HR conversation notes, candidate requirements, openings, candidate type, work mode, package, and scheduled follow-up.

---

## Workflow 16: PMO → Organization Job Role Master & Multi-Select Profile Feedback [IMPLEMENTED]

```
┌─────────────────┐     1. Manages Master      ┌───────────────────────┐     2. Multi-Select Picker  ┌─────────────────┐
│       PMO       │ ──────────────────────────> │   JobRole Collection  │ ──────────────────────────> │ Quick Call Form │
│  (Role Admin)   │    (Create/Edit/Status)     │  (Org-Scoped Master)  │    (Active Roles Only)    │  (Outreach Log) │
└─────────────────┘                             └───────────────────────┘                             └────────┬────────┘
                                                                                                               │
                                                                                                               │ 3. Records Interaction & Snapshots
                                                                                                               ▼
┌─────────────────┐                             ┌───────────────────────┐                             ┌─────────────────┐
│ Excel Export    │ <────────────────────────── │ Historical Call Log   │ <────────────────────────── │ Interaction     │
│ (Readable Names)│      5. Formatted Export    │ (Preserves Snapshot)  │      4. Preserves Snapshot│ Collection      │
└─────────────────┘                             └───────────────────────┘                             └─────────────────┘
```

1. **PMO Master Administration:**
   - PMO navigates to `/pmo/job-roles` to manage predefined job roles for their organization (e.g. "Fullstack React Developer", "Data Analyst Trainee", "DevOps Engineer").
   - PMO can add, edit, or deactivate/activate job roles with live usage counts (`usedCount`).
   - Duplicate names within the same organization are prevented via lowercase `normalizedName` compound unique index. Cross-organization duplicate names are explicitly permitted for multi-tenant isolation.
2. **Team Member Outreach Feedback Selection:**
   - When Team Members log an HR call in `<QuickCallModal />`, free-text profile entry is replaced with a searchable multi-select Job Roles picker.
   - Only active job roles (`status = 'ACTIVE'`) belonging to the user's organization are selectable.
3. **Structured Role & Historical Snapshot Preservation:**
   - Backend validates submitted `jobRoleIds` (ensures they are `ACTIVE` and belong to user's `organizationId`).
   - Stores structured role IDs (`jobRoleIds`) and historical snapshot objects (`jobRoleSnapshots` = `[{ roleId, name }]`).
   - Historical call records retain the exact role name at the time of outreach, even if PMO renames or deactivates the role in the master table later.
4. **Excel Export & Pill Badge Display:**
   - Call feedback logs and Excel exports format selected job roles as clean, readable comma-separated string names (never raw ObjectIds).


