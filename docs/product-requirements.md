# Product Requirements Document (PRD) — Phase 1

**Project:** Placement Management System  
**Phase:** Phase 1 — Corporate Outreach & Opportunity Intake  
**Target Users:** Educational Institutions, Placement Offices (PMO), Corporate Outreach Executives, Platform Super Administrators  

---

## 1. Executive Summary & Problem Statement

Educational institutions face major challenges orchestrating corporate placement campaigns:
- Outreach data is fragmented across ad-hoc spreadsheets, personal call logs, and disparate email inboxes.
- Placement leadership (PMO) lacks real-time visibility into which companies have been contacted, who is working on what, and which employers are actively hiring.
- Placement calling executives are burdened with excessive administrative friction during outreach calls, leading to incomplete call logging.
- Opportunities and Job Descriptions (JDs) get lost before they can be systematically reviewed and matched to students.

**The Solution:** A dedicated, multi-tenant B2B SaaS platform that manages the entire employer-side placement lifecycle—from bulk company intake and team assignment to low-friction HR outreach logging, JD ingestion, and PMO opportunity shortlisting.

---

## 2. Scope Matrix

### 2.1 In-Scope: Phase 1 (Corporate Outreach & Opportunity Engine)
1. **Authentication & Role-Based Access Control (RBAC):** Secure login, token management, and strict role guards (`SUPER_ADMIN`, `PMO`, `TEAM_MEMBER`).
2. **Organization Management (Multi-Tenancy):** Super Admin onboarding and administrative lifecycle for educational institutions.
3. **PMO Team Management:** User creation, role assignment, and active status tracking within an institution.
4. **Company Master Registry:** Tenant-scoped company database with contact details, status flags, and tier classifications.
5. **Bulk Company Import:** CSV/Excel file ingestion with column mapping, data validation, and duplicate prevention.
6. **Company Assignment:** PMO allocation and reallocation of companies to team members (single and bulk).
7. **Quick HR Outreach Workflow:** Ultra-fast call-logging form tailored for active phone conversations.
8. **Interaction History:** Chronological timeline of all calls, emails, and meetings per company.
9. **Follow-up Management:** Callback reminders, overdue alerts, and scheduled interaction queues.
10. **Job Opportunity Management:** Capture immediate job parameters (roles, compensation, location, eligibility).
11. **Job Description (JD) Management:** Secure file upload abstraction for receiving and viewing JDs.
12. **PMO Shortlisting:** Workflow for PMO to review, filter, approve, and shortlist viable opportunities.
13. **PMO Dashboard & Team Analytics:** Performance metrics, call volumes, conversion rates, and coverage charts.
14. **Super Admin Platform Visibility:** Cross-tenant overview, organization-wise company metrics, and platform health.
15. **Audit Logs:** Immutable audit records of critical configuration and data changes.
16. **Security & Tenant Isolation:** Server-side identity enforcement, rate limiting, and zero-trust tenant handling.

### 2.2 Out-of-Scope: Phase 2 (Student Placement Lifecycle — FUTURE)
The following capabilities are explicitly deferred to subsequent phases and must **not** be implemented in Phase 1:
- Student database, profile management, and resume parsing.
- Academic eligibility calculation and automated student-to-job matching.
- Student application submission, tracking, and student portal.
- Campus placement drive scheduling, exam halls, and coordinator logistics.
- Multi-round interview tracking and panel feedback.
- Offer letter generation, acceptance tracking, and placement compliance reporting.

---

## 3. Detailed Functional Requirements (Phase 1)

### FR-01: Multi-Tenant Organization Management
- `SUPER_ADMIN` can create, view, update, and suspend educational organizations.
- Each organization has a unique name, slug, contact information, and active status.
- Data across organizations must remain completely isolated at the database and API layer.

### FR-02: User & Team Management
- `PMO` can invite or create `TEAM_MEMBER` and additional `PMO` accounts within their own organization.
- `PMO` can activate, deactivate, or update user profiles.
- Users must belong strictly to their assigned organization (`organizationId`), except `SUPER_ADMIN` who is platform-wide.

### FR-03: Company Master & Bulk Import
- Each organization maintains its own private company directory.
- `PMO` can create individual company records or upload bulk CSV/Excel files.
- Bulk import must support column mapping (Name, Website, Industry, Location, HR Contact Name, HR Email, HR Phone).
- Import engine must perform normalization and detect duplicates within the tenant before committing.

### FR-04: Company Assignment
- `PMO` can assign one or more unassigned companies to designated team members.
- `PMO` can reassign companies when workload balancing or personnel changes occur.
- Team members view a dedicated list of their assigned companies.

### FR-05: High-Speed HR Outreach Call Logger
- Calling interface must load instantly and require minimal clicks during a call.
- Rapid capture fields:
  - Call Status / Outcome (e.g., Interested, Not Hiring, Call Later, Invalid Number).
  - Quick Notes (1-2 sentences).
  - Next Follow-up Date/Time (if callback requested).
  - Hiring Flag (Yes / No / Tentative).
- If the company is hiring, team member can quickly record preliminary job info and note whether a JD will follow.

### FR-06: Interaction Timeline & Follow-ups
- Every touchpoint (call, meeting, email) creates an immutable interaction entry.
- Follow-ups display on a prioritized queue ordered by due date, highlighting overdue calls.

### FR-07: Job Opportunity & JD Management
- When an employer expresses hiring interest, a Job Opportunity can be created.
- Key details: Job Title, Positions, Degree Requirements, Salary/Stipend, Location.
- Upload capability for Job Description documents (PDF/DOCX).

### FR-08: PMO Opportunity Shortlisting
- Central opportunity workbench for the PMO.
- Filter opportunities by salary, degree, industry, and status.
- Ability to change status to `Shortlisted`, `On Hold`, or `Declined`.

### FR-09: Analytics & Reporting
- **PMO Dashboard:**
  - Total companies assigned vs. contacted.
  - Outreach conversion rate (Contacted → Interested → Opportunities Captured).
  - Daily/weekly team member call volume and activity leaderboards.
  - Active opportunities breakdown.
- **Super Admin Dashboard:**
  - Active organizations count.
  - Cross-tenant company intake statistics.
  - Global system activity levels.

### FR-10: Security & Audit Logging
- Changes to critical entities (assignments, opportunities, users, organizations) record an audit log entry.
- All tenant APIs must strictly validate that the user's authenticated `organizationId` matches the target resource.
