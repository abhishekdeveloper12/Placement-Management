# User Roles & Permissions Matrix

This document defines the roles, operational responsibilities, and strict tenant boundaries within the Placement Management System.

---

## 1. Role Hierarchy & Tenant Boundaries

The system enforces three primary user roles:

```
┌────────────────────────────────────────────────────────┐
│                      SUPER_ADMIN                       │
│             Global Platform-Wide Visibility            │
└───────────────────────────┬────────────────────────────┘
                            │ Manages Tenants
                            ▼
┌────────────────────────────────────────────────────────┐
│            PMO / PLACEMENT_OFFICER (Tenant)            │
│          Scoped to Single Organization ID              │
└───────────────────────────┬────────────────────────────┘
                            │ Manages Team & Allocations
                            ▼
┌────────────────────────────────────────────────────────┐
│                  TEAM_MEMBER (Tenant)                  │
│       Scoped to Single Organization ID + Assignments   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Role Profiles

### 2.1 SUPER_ADMIN (Platform Administrator)

- **Scope:** Global / Cross-Tenant (`organizationId` is `null`).
- **Core Responsibilities:**
  - Register, configure, and maintain tenant educational organizations.
  - Oversee platform health, database performance, and global statistics.
  - Access cross-organizational analytics (e.g., aggregate company outreach numbers across institutes).
  - Inspect organization-wise company distribution to spot market trends and duplicate outreach across colleges.
- **Allowed Actions:**
  - Create, view, update, activate, and suspend Organizations (`GET`, `POST`, `PATCH /api/super-admin/organizations`).
  - Provision, view, update, activate, and suspend primary PMO users for organizations (`GET`, `POST`, `PATCH /api/super-admin/organizations/:organizationId/pmo`).
  - View, filter, create, edit, activate, and deactivate companies across all organizations (`GET`, `POST`, `PATCH /api/companies`).
  - View aggregate platform statistics and cross-tenant company metrics (`GET /api/companies/stats`).
  - View platform analytics and audit logs.
- **Restricted Actions:**
  - Does not conduct everyday placement calls or manage student-specific candidate files.

---

### 2.2 PMO / PLACEMENT_OFFICER (Organization Administrator)

- **Scope:** Strict Single Organization Boundary.
  - **Rule:** A PMO user can **only** read and write data belonging to their own `organizationId`. Under no circumstances can a PMO inspect or modify records belonging to another institution.
- **Core Responsibilities:**
  - Administer the institution's placement cell team members.
  - Ingest employer datasets via manual entry or bulk CSV/Excel import.
  - Allocate and distribute company accounts to placement calling executives.
  - Monitor team calling volume, interaction notes, and pending callbacks.
  - Review incoming job opportunities and Job Descriptions (JDs).
  - Shortlist qualified corporate leads for placement drives.
- **Allowed Actions:**
  - Create, view, edit, activate/deactivate, and manage `TEAM_MEMBER` accounts for their organization.
  - Create, import, edit, and archive companies within their tenant.
  - Assign and reassign companies to team members.
  - View all interactions, follow-ups, and notes logged by any team member in their organization.
  - Create and edit job opportunities; upload and review JDs.
  - Shortlist, hold, or decline captured job opportunities.
  - View organizational analytics, team performance dashboards, and institution audit logs.
- **Restricted Actions:**
  - Cannot access data of another organization.
  - Cannot create or modify other organizations.
  - Cannot access global platform-wide settings.

---

### 2.3 TEAM_MEMBER (Placement Calling Executive)

- **Scope:** Single Organization Boundary + Assignment Scope.
  - **Rule:** A Team Member belongs strictly to their own `organizationId`. Operationally, their daily workflow is focused on their specifically assigned companies and opportunities.
- **Core Responsibilities:**
  - Conduct outreach calls, emails, and meetings with assigned company HR/recruitment contacts.
  - Capture fast, low-friction interaction notes immediately during or after conversations.
  - Schedule follow-up calls and manage callback commitments.
  - Upload received Job Descriptions (JDs) and record preliminary hiring requirements.
- **Allowed Actions:**
  - View list of companies assigned to them.
  - View company contact information and past interaction history for assigned companies.
  - Record new interactions (call notes, outcomes, call duration).
  - Create and complete follow-up reminders for their accounts.
  - Create job opportunities resulting from their outreach.
  - Upload JD documents attached to opportunities.
- **Restricted Actions (Explicitly Prohibited):**
  - **Must NOT** manage users or invite new members.
  - **Must NOT** assign or reassign companies between team members.
  - **Must NOT** access or modify companies assigned to other team members without PMO delegation.
  - **Must NOT** access data of any other organization.
  - **Must NOT** modify organization settings or delete master records.
  - **Must NOT** perform bulk imports.

---

## 3. Permissions Matrix (Phase 1)

| Functional Area | Action | SUPER_ADMIN | PMO | TEAM_MEMBER |
| :--- | :--- | :---: | :---: | :---: |
| **Organizations** | Create / Edit / Suspend | ✅ Global | ❌ | ❌ |
| | View Details | ✅ Global | ✅ Own Org | ❌ |
| **User Management** | Manage Platform Admins | ✅ | ❌ | ❌ |
| | Manage Org Team Members | ✅ Global | ✅ Own Org | ❌ |
| **Company Registry** | View Companies | ✅ Global / Org-wise | ✅ Own Org | ✅ Assigned Only |
| | Add Single Company | ✅ Explicit Org Target | ✅ Own Org | ❌ |
| | Bulk Import (CSV/Excel) | ✅ Explicit Org Target | ✅ Own Org | ❌ |
| | Update Company Details | ✅ Global | ✅ Own Org | ✅ Assigned Only |
| **Assignments** | Assign / Reassign Companies | ❌ | ✅ Own Org | ❌ |
| | View Assigned Companies | ❌ | ✅ Own Org | ✅ Own List |
| **Outreach** | Log Interaction (Call/Email) | ❌ | ✅ Own Org | ✅ Assigned Only |
| | View Interaction History | ❌ | ✅ Own Org | ✅ Assigned Only |
| | Manage Follow-ups | ❌ | ✅ Own Org | ✅ Own Assigned |
| **Opportunities** | Create Job Opportunity | ❌ | ✅ Own Org | ✅ Assigned Only |
| | Upload Job Description (JD) | ❌ | ✅ Own Org | ✅ Assigned Only |
| | Shortlist Opportunity | ❌ | ✅ Own Org | ❌ |
| **Analytics** | View Global Platform Stats | ✅ | ❌ | ❌ |
| | View Org & Team Analytics | ✅ Global | ✅ Own Org | ✅ Personal Only |
| **Audit Logs** | View Audit Logs | ✅ Global | ✅ Own Org | ❌ |

---

## 4. Implemented Security & Middleware Enforcement

### 4.1 Server-Side Identity Derivation
- When a user logs in, their verified `id`, `role`, and `organizationId` are embedded into a signed JWT access token.
- `requireAuth` extracts this token from `Authorization: Bearer <token>`, looks up the active user record in MongoDB, verifies account and organization active statuses, and sets `req.user`.
- Client requests cannot alter `req.user.id`, `req.user.role`, or `req.user.organizationId`.

### 4.2 Role Enforcement (`requireRole`)
- Protects route handlers by matching `req.user.role` against authorized roles (e.g. `requireRole('SUPER_ADMIN')` or `requireRole('PMO', 'SUPER_ADMIN')`).
- Violations immediately return HTTP `403 Forbidden` (`FORBIDDEN_ROLE`).

### 4.3 Tenant Isolation (`enforceTenantScope`)
- **SUPER_ADMIN:** Evaluated as global platform scope (`organizationId === null`). Allowed to inspect all tenants or specify a target `organizationId` parameter for cross-tenant administration.
- **PMO & TEAM_MEMBER:** Strictly bound to `req.user.organizationId`.
  - If a tenant user provides an `organizationId` in request parameters, query string, or JSON body that does not match their assigned organization, the request is blocked with HTTP `403 Forbidden` (`CROSS_TENANT_ACCESS_DENIED`).
  - If omitted, `req.body.organizationId` is automatically defaulted to `req.user.organizationId`.
  - All subsequent database queries construct filter clauses containing `{ organizationId: req.user.organizationId }`.
