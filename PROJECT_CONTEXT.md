# Placement Management System — Project Context

---

# START HERE FOR AI AGENTS

Welcome, AI Agent. Before writing or modifying any code in this repository, you must read the following core documents in sequence:

1. **[README.md](README.md)**: Baseline orientation, high-level stack, and AI protocol.
2. **[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)** *(this document)*: Project identity, current phase state, boundaries, and active milestone.
3. **[DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md)**: Engineering commandments, multi-tenancy rules, security rules, and code standards.
4. **[DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md)**: Live status tracking of what is done vs. what is not started.
5. **[ARCHITECTURE.md](ARCHITECTURE.md)**: Planned codebase layout, design patterns, auth flow, and tenant isolation architecture.
6. **Task-Specific Documentation in `docs/`**:
   - For business requirements: [docs/product-requirements.md](docs/product-requirements.md)
   - For user permissions: [docs/user-roles.md](docs/user-roles.md)
   - For user flows: [docs/workflows.md](docs/workflows.md)
   - For UI/UX patterns: [docs/ui-guidelines.md](docs/ui-guidelines.md)
   - For architectural rationale: [docs/decisions/](docs/decisions/)

> **Rule of Selective Inspection:**
> Never read all source files at once. Read the context and rules files first, then selectively view only the files directly pertinent to your specific task.

---

## 1. Project Identity

- **Project Name:** Placement Management System
- **Purpose:** A B2B multi-tenant SaaS platform empowering educational institutions (universities, colleges, autonomous institutes) to streamline their corporate outreach, manage company interactions, and intake hiring opportunities.
- **Product Vision:** Eliminate spreadsheets and disconnected communication tools across placement cells. Provide institutional leadership (PMO) with live outreach visibility, empower placement team members with frictionless call-logging workflows, and establish a structured pipeline for corporate relationships and job openings. Later phases will link this corporate pipeline directly into student placement lifecycles.

---

## 2. Current State

- **Current Development Phase:** Phase 1 — Corporate Outreach & Placement Management Engine
- **Current Milestone:** Milestone 1.8 — Interaction & Follow-Up Management Module (COMPLETED)
- **Implemented Work:**
  - Complete AI memory and documentation system initialized.
  - Full-stack technical foundation implemented:
    - Frontend: React + Vite + Tailwind CSS + Redux Toolkit + centralized Axios API client.
    - Backend: Node.js + Express layered structure (Routes, Controllers, Middleware, Utils).
    - Database: Mongoose connection manager with live connection status inspection (`connected`, `disconnected`, `unconfigured`).
    - API: `GET /api/health` reporting server health, environment, and DB connectivity.
  - Authentication, RBAC, and Tenant Isolation foundation implemented:
    - Models: `Organization`, `User`, `AuditLog`.
    - Auth APIs: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/refresh`.
    - Middlewares: `requireAuth`, `requireRole`, `enforceTenantScope`.
    - Security verification: 13 security test cases passed.
  - Super Admin Organization & PMO Management implemented:
    - Organization lifecycle APIs: `GET /api/super-admin/dashboard/stats`, `GET /api/super-admin/organizations`, `POST /api/super-admin/organizations`, `GET /api/super-admin/organizations/:id`, `PATCH /api/super-admin/organizations/:id`, `PATCH /api/super-admin/organizations/:id/status`.
    - PMO management APIs: `GET /api/super-admin/organizations/:organizationId/pmo`, `POST /api/super-admin/organizations/:organizationId/pmo`, `PATCH /api/super-admin/organizations/:organizationId/pmo`, `PATCH /api/super-admin/organizations/:organizationId/pmo/status`.
    - Frontend UI: Super Admin dashboard, Organization Directory with search/filter/pagination, Organization Details, PMO Onboarding & Status Management.
    - Automated tests: 21 automated Super Admin test cases passed.
  - PMO Team Member Management implemented:
    - Team Member APIs: `GET /api/pmo/dashboard/stats`, `GET /api/pmo/team-members`, `POST /api/pmo/team-members`, `GET /api/pmo/team-members/:id`, `PATCH /api/pmo/team-members/:id`, `PATCH /api/pmo/team-members/:id/status`.
    - Multi-tenant isolation: Scoped strictly to `req.user.organizationId` server-side; client role or tenant overrides strictly prevented. Cross-tenant lookups return 404 (resource hiding).
    - Session management: Deactivation or password change invalidates `tokenVersion`.
    - Audit logging: All team member creation, modification, and status toggles tracked in `AuditLog`.
    - Frontend UI: PMO Dashboard metrics, Team Member Directory (search, filter, pagination, Add/Edit modals, status confirm dialog), Team Member Detail page.
    - Automated tests: 18 automated PMO test cases passed.
  - Company Master Directory implemented:
    - Models: `Company` (with normalized name, tenant scoping, compound indexes) and `Contact` (primary HR recruiter contact).
    - Company APIs: `GET /api/companies/stats`, `GET /api/companies`, `POST /api/companies`, `GET /api/companies/:id`, `PATCH /api/companies/:id`, `PATCH /api/companies/:id/status`.
    - Multi-tenant isolation: PMO queries strictly locked to `req.user.organizationId`; Super Admin possesses intentional global visibility with optional org filter. Cross-tenant requests return 404 (resource hiding).
    - Duplicate prevention: Deterministic check on `normalizedName` and website within the same tenant. Duplicate company names across different organizations are explicitly allowed.
    - Audit logging: All company creation, updates, activations, and deactivations tracked in `AuditLog`.
    - Frontend UI: Company Master Directory (search, filters for industry/city/status/organization, pagination, Add/Edit modals with primary contact fields, status confirm dialog) and Company Detail Page.
    - Automated tests: 16 automated Company Master test cases passed.
  - Bulk Company Import Engine implemented:
    - Support for `.csv`, `.xls`, and `.xlsx` spreadsheet uploads with memory stream parsing via SheetJS.
    - Downloadable sample templates in CSV and XLSX formats.
    - Auto-detection and custom column header mapping.
    - Non-destructive row validation against required fields, email formatting, in-file duplicates, and database duplicates.
    - Preview envelope with summary KPI cards (Total, Valid, Duplicate, Invalid) and row-level preview table.
    - Batch insertion of valid rows into `Company` and primary `Contact` documents.
    - `CompanyImport` model tracking job execution, counters, and row-level error reports.
    - Downloadable CSV error reports for skipped/failed rows.
    - Frontend UI: Multi-step Import Wizard (Upload & Template -> Column Mapping -> Validation & Preview -> Execution & Results) and Import History tab.
    - Automated tests: 9 automated Bulk Import test cases passed.
  - Company Assignment & Lead Allocation implemented:
    - Model: `Assignment` schema with partial unique index on `{ organizationId: 1, companyId: 1, status: 'ACTIVE' }` enforcing single active owner constraint at database level.
    - APIs: `POST /api/pmo/assignments/assign` (single assign/reassign), `POST /api/pmo/assignments/bulk-assign` (bulk assign/reassign), `POST /api/pmo/assignments/unassign`, `GET /api/companies/:companyId/assignments` (read-only history timeline), `GET /api/team-member/companies` (Team Member roster), `GET /api/team-member/companies/:id` (Team Member company detail).
    - Security & Resource Hiding: Team members are strictly restricted to companies actively assigned to them (`status: 'ACTIVE'`). Unassigned companies return `404 COMPANY_NOT_FOUND`.
    - Frontend UI: Reusable Assign/Reassign/Unassign modals, Bulk Assignment modal with row selection and completion reports, Company Detail current assignment card & timeline history table, Team Member assigned companies roster & detail views.
    - Automated tests: 10 automated Assignment test cases passed.
  - Quick HR Outreach & Call Capture implemented:
    - Models: `Interaction` schema with `callDetails` subdocument and `FollowUp` schema for scheduled callback tasks.
    - APIs: `POST /api/team-member/companies/:companyId/interactions` (call logging & questionnaire capture), `GET /api/team-member/companies/:companyId/interactions` (history timeline), `GET /api/team-member/companies/:companyId/outreach-summary` (summary card metrics), `GET /api/pmo/interactions` (PMO org-wide interaction log).
    - Security: Strict assignment verification (`company.organizationId === user.organizationId` AND active `Assignment` exists for `user.id`). Unassigned or cross-member attempts return 404.
    - Inline Contact Management: Updates existing `Contact` or inline creates new primary HR contact during call workflow, emitting `HR_CONTACT_UPDATED` or `HR_CONTACT_CREATED` audit logs.
    - Automated Follow-up Scheduling: `nextAction === 'FOLLOW_UP'` requires `followUpDate` and automatically provisions a pending `FollowUp` record, emitting `FOLLOW_UP_CREATED` audit log.
    - Frontend UI: `QuickCallModal` with 2-3 minute questionnaire, conditional field disclosure when `hiringStatus === 'NO'`, inline contact editing, Call HR button on company roster & details, outreach summary card, and call history table.
    - Automated tests: 10 automated Quick Outreach test cases passed.
  - Interaction & Follow-Up Management implemented:
    - Model: Updated `FollowUp` Mongoose schema with `completedAt` timestamp and computed `isOverdue` property in `toJSON`.
    - APIs: `GET /api/team-member/follow-ups/stats`, `GET /api/team-member/follow-ups`, `GET /api/team-member/follow-ups/:id`, `POST /api/team-member/follow-ups`, `PATCH /api/team-member/follow-ups/:id/complete`, `PATCH /api/team-member/follow-ups/:id/cancel`, `GET /api/team-member/interactions`, `GET /api/team-member/interactions/:id`, `GET /api/pmo/follow-ups/stats`, `GET /api/pmo/follow-ups`, `GET /api/pmo/follow-ups/:id`, `GET /api/pmo/interactions`, `GET /api/pmo/interactions/:id`.
    - Derived Overdue state: Dynamic computation avoiding desynchronization background cron jobs.
    - Security & Tenant Isolation: Strict team member scope (`assignedTo === req.user.id`) and PMO scope (`organizationId === req.user.organizationId`). Cross-member/tenant requests return 404.
    - Audit Trail: Emits `FOLLOW_UP_CREATED`, `FOLLOW_UP_COMPLETED`, and `FOLLOW_UP_CANCELLED` audit logs.
    - Frontend UI: Team Member Follow-Up Task Management page with tab filters, manual follow-up creation modal, mark complete with notes modal, cancel modal; Team Member Interaction Audit Log page with search & outcome filters and view details modal; PMO Follow-Up Monitoring page with team member selector & organization stats; PMO Interaction Audit Log page with team member filter & details modal.
    - Automated tests: 11 automated Follow-up test cases passed (97/97 total backend tests passed).
- **Unimplemented Work:**
  - Job Opportunities & JD Intake module (Milestone 1.9).
  - Shortlisting & analytics.

---

## 3. Technology Stack

- **Frontend:**
  - Library/Tooling: React (v18+), Vite, JavaScript (ESNext)
  - Styling: Tailwind CSS
  - Routing: React Router (v6+)
  - State Management: Redux Toolkit (global state), React local state
  - Forms & Validation: React Hook Form, Zod
  - Data Visualization: Recharts
- **Backend:**
  - Runtime & Framework: Node.js, Express.js (ES Modules / clean JavaScript)
  - Validation: Express validator or Zod-based request validation
- **Database:**
  - Database: MongoDB
  - Object Data Modeling: Mongoose
- **Security & Authentication:**
  - Password Hashing: bcrypt or Argon2
  - Token Protocol: JSON Web Tokens (JWT) with HTTP-only cookies / secure session tokens
  - Authorization: Role-Based Access Control (RBAC) + Tenant Scoping
- **File Storage (Future):**
  - Cloudflare R2 / S3-compatible storage (*Planned, not implemented*)

---

## 4. User Roles

1. **SUPER_ADMIN (Platform Administrator)**
   - Global multi-tenant visibility across all organizations.
   - Onboards and manages organizations.
   - Views aggregate platform statistics and cross-tenant company data.
2. **PMO / PLACEMENT_OFFICER (Organization Administrator)**
   - Scoped strictly to their own organization (`organizationId`).
   - Manages team members, imports companies, assigns companies to team members.
   - Tracks outreach activity, reviews captured job opportunities, and shortlists active leads.
3. **TEAM_MEMBER (Operational Placement Staff)**
   - Scoped to their own organization and assigned companies.
   - Conducts corporate/HR outreach, records quick interaction notes, captures immediate hiring details.
   - Uploads/attaches Job Descriptions (JDs) and creates opportunities.

---

## 5. Multi-Tenancy Rules

1. **Logical Separation:** Data is stored in a shared database where every tenant-owned record contains a mandatory reference to `organizationId`.
2. **Never Trust the Client:** The client/frontend must **never** supply `organizationId` for authorization or data filtering in tenant user contexts.
3. **Server-Side Identity Derivation:** For `PMO` and `TEAM_MEMBER`, `organizationId` must be extracted exclusively from verified server-side JWT claims or session data.
4. **Leak Prevention:** Backend database queries for tenant operations must explicitly include `{ organizationId }` filtering.
5. **SUPER_ADMIN Exception:** Only `SUPER_ADMIN` can query across tenant boundaries or pass explicit tenant filters for administrative review.

---

## 6. Core Product Workflow (Phase 1)

```
[ SUPER_ADMIN ]
      │ Creates & manages
      ▼
[ Organization ]
      │ Administered by
      ▼
[ PMO / Placement Officer ]
      ├── Creates Team Members
      ├── Imports Companies (Excel / CSV)
      └── Assigns Companies to Team Members
            │
            ▼
      [ Team Member ]
            │ Conducts HR Call (Frictionless Quick-Log)
            ├── Records Interaction & Follow-Up
            └── Ingests Job Description (JD) / Opportunity
                  │
                  ▼
            [ PMO Review ]
                  ├── Evaluates captured opportunities
                  ├── Shortlists qualified hiring leads
                  └── Monitors team outreach coverage & metrics
```

---

## 7. Planned Modules & Implementation Status Tracker

| Module | Scope / Description | Status |
| :--- | :--- | :--- |
| **Documentation & Context** | Persistent AI context, architecture, schemas, and rules | **IMPLEMENTED** |
| **Client Scaffolding** | Vite + React + Tailwind + Redux Toolkit boilerplate | **IMPLEMENTED** |
| **Server Scaffolding** | Express + Mongoose boilerplate & layered structure | **IMPLEMENTED** |
| **Database Connection** | MongoDB connection & status monitoring | **IMPLEMENTED** |
| **Centralized API Client** | Axios client with interceptors & proxy config | **IMPLEMENTED** |
| **Database & Models** | `Organization` & `User` schemas with tenant scoping & indexes | **IMPLEMENTED** |
| **Authentication & RBAC** | JWT auth, role guard middleware, tenant resolver, auth shell | **IMPLEMENTED** |
| **Organization Management** | Super Admin org onboarding & lifecycle | **PLANNED** |
| **User & Team Management** | PMO team member onboarding & role assignment | **PLANNED** |
| **Company Master & Directory**| Master company registry per tenant | **PLANNED** |
| **Bulk Import (CSV/Excel)** | Parse, validate, deduplicate, and bulk insert companies | **PLANNED** |
| **Company Assignment** | PMO allocation of companies to team members | **PLANNED** |
| **HR Call Logging (Fast UX)** | Quick-response interaction form for calling staff | **PLANNED** |
| **Interaction History** | Chronological audit trail of calls, emails, notes | **PLANNED** |
| **Follow-up Management** | Scheduled callbacks and reminder queues | **PLANNED** |
| **Job Opportunity Management**| Capture opening details, roles, stipends, packages | **PLANNED** |
| **JD Ingestion & Storage** | File upload abstraction & metadata tracking | **PLANNED** |
| **PMO Shortlisting** | Opportunity status progression (Open, Shortlisted, Closed) | **PLANNED** |
| **Analytics & Dashboards** | Role-tailored metrics (PMO coverage, Super Admin stats) | **PLANNED** |
| **Audit Logs** | Security and modification log per organization | **PLANNED** |
| **Student Lifecycle** | Students, drives, exams, interviews, offers | **FUTURE PHASE** |

---

## 8. Architectural Principles

1. **Separation of Concerns:** Strict separation between presentation (client), routing/controllers, business services, and database persistence.
2. **Thin Controllers, Thick Services:** Controllers only parse HTTP requests, invoke services, and return responses. Business rules, validation orchestration, and multi-tenant scoping live inside services.
3. **Explicit Multi-Tenant Scoping:** Every query and mutation for tenant users must be scoped to the authenticated user's `organizationId`.
4. **Rapid Outreach UX:** Placement calling staff speak with busy corporate recruiters. UI forms for call notes must be instant, minimal, and keyboard-friendly, offloading complex JD details to post-call file uploads.
5. **Decoupled File Storage:** File handling must use an abstract storage interface so that local development and production cloud object storage (e.g. Cloudflare R2) can be swapped seamlessly.

---

## 9. Important Decisions

- **ADR-001:** Enforce organization-based multi-tenancy at the data and service layer. Refer to [docs/decisions/ADR-001-multi-tenant-architecture.md](docs/decisions/ADR-001-multi-tenant-architecture.md).
- **Phase Decoupling:** Student lifecycle features are explicitly excluded from Phase 1 to ensure laser focus on the corporate outreach engine.

---

## 10. Known Constraints

- Must run on standard Node.js LTS and MongoDB environments without exotic infrastructure dependencies.
- CSV/Excel imports must be memory-efficient and handle duplicate detection gracefully.
- Frontend must maintain smooth performance when rendering tables with thousands of company records.

---

## 11. Known Issues

- None at present. All 34 automated security and Super Admin verification tests passing cleanly.

---

## 12. Next Milestone

**Phase 1 — Milestone 1.3: Master Company Directory & Bulk CSV/Excel Import Engine**
- Company Mongoose model with multi-tenant partitioning (`organizationId`, `normalizedName` unique index).
- Bulk company import processor supporting CSV and Excel spreadsheets with validation, error reports, and deduplication.
- PMO company directory UI with search, multi-criteria filters, and company detail views.
- Company contact management (HR / recruiters).
