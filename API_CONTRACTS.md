# Placement Management System — API Contracts Specification

> **NOTICE: PLANNED — NOT IMPLEMENTED**
> The endpoint groups and route outlines documented below represent the **planned REST API surface** for the Placement Management System. Detailed JSON request/response payloads and validation schemas will be finalized and documented as each endpoint is implemented.

---

## 1. API Architecture Principles

- **Base Path:** `/api/v1`
- **Format:** RESTful JSON over HTTPS
- **Authentication:** Bearer JWT in `Authorization` header or secure HTTP-only cookies
- **Tenant Context:** Evaluated and enforced server-side via authenticated token claims; client-supplied tenant identifiers are prohibited for tenant operations.
- **Standard Response Envelopes:**
  - Success: `{ "success": true, "data": ..., "message": "...", "meta": { ... } }`
  - Error: `{ "success": false, "error": { "code": "...", "message": "...", "details": [...] } }`

---

## 2. Implemented Endpoints

### 2.1 System Health (`/api/health`)

#### `GET /api/health`
- **Description:** Verifies that the API server is operational, reports runtime environment, active database connection state, and current server timestamp.
- **Authentication:** Public (No authentication required)
- **Response Format:**
  ```json
  {
    "success": true,
    "message": "Placement Management System API is running",
    "environment": "development",
    "database": "connected",
    "timestamp": "2026-10-01T07:16:52.667Z"
  }
  ```
- **Database States Reported:**
  - `connected`: Active connection to MongoDB.
  - `disconnected`: MongoDB service unreachable or offline.
  - `unconfigured`: Missing `MONGODB_URI` environment variable.
- **Status Codes:**
  - `200 OK`: Server running and responsive.

### 2.2 Authentication & Identity (`/api/auth`)

#### `POST /api/auth/login`
- **Description:** Authenticates user via email and password. Returns a short-lived JWT access token and user profile; issues an HTTP-only refresh token cookie.
- **Authentication:** Public
- **Request Body:**
  ```json
  {
    "email": "pmo@apex.edu",
    "password": "PmoApex@123"
  }
  ```
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": {
        "id": "6abe14e89e11ba73212372a6",
        "name": "Apex PMO Lead",
        "email": "pmo@apex.edu",
        "role": "PMO",
        "status": "ACTIVE",
        "organizationId": "6abe14e89e11ba73212372a0",
        "organization": {
          "id": "6abe14e89e11ba73212372a0",
          "name": "Apex Institute of Technology",
          "code": "APEX"
        }
      }
    }
  }
  ```
- **Error Codes:**
  - `400 Bad Request` (`VALIDATION_ERROR`): Missing email or password.
  - `401 Unauthorized` (`INVALID_CREDENTIALS`): Generic invalid email/password.
  - `403 Forbidden` (`ACCOUNT_INACTIVE`): Account disabled.
  - `403 Forbidden` (`ORGANIZATION_INACTIVE`): Organization suspended.

#### `GET /api/auth/me`
- **Description:** Returns the safe profile and organization details of the currently authenticated user.
- **Authentication:** Bearer JWT in `Authorization` header
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "User profile retrieved successfully",
    "data": {
      "id": "6abe14e89e11ba73212372a6",
      "name": "Apex PMO Lead",
      "email": "pmo@apex.edu",
      "role": "PMO",
      "status": "ACTIVE",
      "organizationId": "6abe14e89e11ba73212372a0",
      "organization": {
        "id": "6abe14e89e11ba73212372a0",
        "name": "Apex Institute of Technology",
        "code": "APEX"
      }
    }
  }
  ```
- **Error Codes:**
  - `401 Unauthorized` (`AUTHENTICATION_REQUIRED`, `TOKEN_INVALID`): Missing or invalid access token.

#### `POST /api/auth/logout`
- **Description:** Clears the HTTP-only refresh token session cookie and invalidates client session.
- **Authentication:** Public / Authenticated
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

#### `POST /api/auth/refresh`
- **Description:** Rotates refresh token cookie and issues a fresh short-lived access token.
- **Authentication:** Valid `placement_refresh_token` HTTP-only cookie
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "Token refreshed successfully",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": { ... }
    }
  }
  ```

### 2.3 Super Admin & PMO Management (`/api/super-admin`)

All endpoints in this group require an active session and the `SUPER_ADMIN` role:
- Headers: `Authorization: Bearer <accessToken>`
- Unauthorized requests return `401 UNAUTHENTICATED`
- Non-Super Admin roles (`PMO`, `TEAM_MEMBER`) return `403 FORBIDDEN_ROLE`

#### `GET /api/super-admin/dashboard/stats`
- **Description:** Returns aggregate platform metrics for the Super Admin dashboard.
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "Platform dashboard statistics retrieved successfully",
    "data": {
      "totalOrganizations": 4,
      "activeOrganizations": 3,
      "inactiveOrganizations": 1,
      "totalPmos": 3,
      "activePmos": 3
    }
  }
  ```

#### `GET /api/super-admin/dashboard`
- **Description:** Returns comprehensive global multi-tenant analytics including cross-tenant KPI aggregates, institution performance matrix, charts datasets, and platform-wide activity timeline.
- **Query Parameters:**
  - `dateRange` (optional: `7d`, `30d`, `90d`, `custom`, default: `30d`)
  - `startDate` (optional: `YYYY-MM-DD` string when `dateRange=custom`)
  - `endDate` (optional: `YYYY-MM-DD` string when `dateRange=custom`)
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "Super Admin Global Dashboard Analytics retrieved successfully",
    "data": {
      "organizations": { "total": 4, "active": 3, "inactive": 1 },
      "users": { "total": 12, "pmos": 4, "teamMembers": 8, "activeUsers": 12 },
      "companies": { "total": 45, "assigned": 30, "unassigned": 15, "contacted": 18, "coveragePercentage": 40 },
      "hiring": { "totalOpportunities": 12, "hiringNow": 5, "shortlisted": 4 },
      "organizationPerformance": [
        {
          "organizationId": "6abe14e89e11ba73212372a0",
          "name": "Apex Institute of Technology",
          "code": "APEX",
          "teamMembers": 4,
          "companies": 20,
          "interactions": 45,
          "opportunities": 6,
          "shortlistedOpportunities": 3,
          "coveragePercentage": 65
        }
      ],
      "charts": {
        "monthlyInteractions": [{ "date": "2026-10-01", "interactions": 15 }],
        "hiringStatusDistribution": [{ "status": "HIRING_PLANNED", "count": 5 }]
      },
      "recentActivity": [
        {
          "id": "60d5ec49b1a7d62b9c8b4567",
          "action": "INTERACTION_LOGGED",
          "summary": "Phone Call logged for TechCorp",
          "userName": "Rahul Sharma",
          "organizationName": "Apex Institute of Technology",
          "createdAt": "2026-10-03T09:30:00.000Z"
        }
      ]
    }
  }
  ```

#### `GET /api/super-admin/organizations/:organizationId/analytics`
- **Description:** Retrieves organization-specific drill-down performance analytics for Super Admin inspection.
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "Organization drill-down analytics retrieved successfully",
    "data": {
      "organization": { "id": "6abe14e89e11ba73212372a0", "name": "Apex Institute of Technology", "code": "APEX" },
      "kpis": {
        "teamMembers": 4,
        "companies": 20,
        "assignedCompanies": 15,
        "contactedCompanies": 12,
        "totalInteractions": 45,
        "opportunities": 6,
        "shortlistedOpportunities": 3,
        "coveragePercentage": 60
      },
      "teamPerformance": [
        {
          "user": { "id": "6abe14e89e11ba73212372b1", "name": "Rahul Sharma", "email": "rahul@apex.edu" },
          "assignedCompanies": 5,
          "contactedCompanies": 4,
          "totalInteractions": 15,
          "followUpsPending": 2,
          "coveragePercentage": 80
        }
      ],
      "charts": {
        "hiringStatusDistribution": [{ "status": "HIRING_PLANNED", "count": 3 }],
        "monthlyInteractions": [{ "date": "2026-10-01", "interactions": 10 }]
      }
    }
  }
  ```

#### `GET /api/super-admin/organizations`
- **Description:** Paginated, searchable, and filterable directory of all registered institutions.
- **Query Parameters:**
  - `page` (default: 1)
  - `limit` (default: 20, max: 100)
  - `search` (optional substring match on name, code, or email)
  - `status` (optional: `ACTIVE` or `INACTIVE`)
  - `sortBy` (optional: `createdAt`, `name`, `code`, `status`)
  - `sortOrder` (optional: `asc` or `desc`, default: `desc`)
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "Organizations retrieved successfully",
    "data": [
      {
        "id": "6abe14e89e11ba73212372a0",
        "name": "Apex Institute of Technology",
        "code": "APEX",
        "email": "contact@apex.edu",
        "phone": "+91-9876543210",
        "address": "Tech Corridor, Bangalore",
        "status": "ACTIVE",
        "createdAt": "2026-10-01T07:16:52.667Z",
        "pmo": {
          "id": "6abe14e89e11ba73212372a6",
          "name": "Apex PMO Lead",
          "email": "pmo@apex.edu",
          "phone": "+91-9876543211",
          "status": "ACTIVE"
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

#### `POST /api/super-admin/organizations`
- **Description:** Registers a new educational institution.
- **Request Body:**
  ```json
  {
    "name": "Zenith Institute of Engineering",
    "code": "ZENITH",
    "email": "contact@zenith.edu",
    "phone": "+91-9876543210",
    "address": "Knowledge Park, Pune",
    "status": "ACTIVE"
  }
  ```
- **Error Codes:**
  - `400 VALIDATION_ERROR`: Missing name, code, or email.
  - `400 INVALID_ORGANIZATION_CODE`: Code does not conform to `^[A-Z0-9_-]{2,20}$`.
  - `400 INVALID_EMAIL_FORMAT`: Malformed contact email.
  - `409 DUPLICATE_ORGANIZATION_CODE`: Organization with code already exists.

#### `GET /api/super-admin/organizations/:id`
- **Description:** Retrieves organization profile, associated PMO details, and entity counts.
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "Organization details retrieved successfully",
    "data": {
      "id": "6abe14e89e11ba73212372a0",
      "name": "Apex Institute of Technology",
      "code": "APEX",
      "email": "contact@apex.edu",
      "phone": "+91-9876543210",
      "address": "Tech Corridor, Bangalore",
      "status": "ACTIVE",
      "userCount": 2,
      "companyCount": 0,
      "pmo": {
        "id": "6abe14e89e11ba73212372a6",
        "name": "Apex PMO Lead",
        "email": "pmo@apex.edu",
        "phone": "+91-9876543211",
        "status": "ACTIVE",
        "lastLoginAt": "2026-10-01T08:00:00.000Z",
        "createdAt": "2026-10-01T07:16:52.667Z"
      }
    }
  }
  ```

#### `PATCH /api/super-admin/organizations/:id`
- **Description:** Updates institution name, contact email, phone, or address. Code is immutable.
- **Request Body:**
  ```json
  {
    "name": "Apex University of Technology",
    "phone": "+91-9999988888"
  }
  ```

#### `PATCH /api/super-admin/organizations/:id/status`
- **Description:** Toggles institution active status between `ACTIVE` and `INACTIVE`. Deactivating an institution instantly blocks all of its users from accessing the system.
- **Request Body:**
  ```json
  {
    "status": "INACTIVE"
  }
  ```

#### `GET /api/super-admin/organizations/:organizationId/pmo`
- **Description:** Retrieves the primary PMO assigned to an organization. Returns `null` if unassigned.

#### `POST /api/super-admin/organizations/:organizationId/pmo`
- **Description:** Provisions the initial primary PMO for an active organization.
- **Request Body:**
  ```json
  {
    "name": "Dr. Ramesh Kumar",
    "email": "pmo@zenith.edu",
    "phone": "+91-9888877777",
    "password": "ZenithPmo@123",
    "status": "ACTIVE"
  }
  ```
- **Error Codes:**
  - `400 ORGANIZATION_INACTIVE`: Cannot provision PMO for an inactive organization.
  - `400 WEAK_PASSWORD`: Password does not meet 8-char, uppercase, lowercase, number, symbol policy.
  - `409 DUPLICATE_PRIMARY_PMO`: Organization already has a primary PMO assigned.
  - `409 EMAIL_ALREADY_EXISTS`: User email already in use.

#### `PATCH /api/super-admin/organizations/:organizationId/pmo`
- **Description:** Updates PMO name, phone, status, or resets password (invalidates existing sessions).

#### `PATCH /api/super-admin/organizations/:organizationId/pmo/status`
- **Description:** Activates or deactivates the PMO account. Deactivation immediately invalidates active sessions.

---

### 2.3 PMO — Team Member Management (`/api/pmo`)

All endpoints in this group require:
- `Authorization: Bearer <access_token>`
- User Role: `PMO`
- Implicit Tenant Boundary: Strict scoping to `req.user.organizationId`. Client-supplied tenant IDs or roles are ignored or rejected. Cross-tenant lookups return `404 TEAM_MEMBER_NOT_FOUND` to prevent resource enumeration.

#### `GET /api/pmo/dashboard/stats`
- **Description:** Retrieves real-time summary statistics for the PMO dashboard.
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "PMO dashboard stats retrieved successfully",
    "data": {
      "totalTeamMembers": 3,
      "activeTeamMembers": 2,
      "inactiveTeamMembers": 1
    }
  }
  ```

#### `GET /api/pmo/team-members`
- **Description:** Returns a paginated, searchable list of operational team members within the PMO's institution.
- **Query Parameters:**
  - `page` (default: 1)
  - `limit` (default: 10, max: 100)
  - `search` (optional substring match on `name` or `email`)
  - `status` (optional: `ACTIVE` or `INACTIVE`)
  - `sortBy` (optional: `createdAt`, `name`, `email`, `lastLoginAt`)
  - `sortOrder` (optional: `asc` or `desc`, default: `desc`)
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "Team members retrieved successfully",
    "data": [
      {
        "id": "6abe2b1dd805cae1391b21bc",
        "name": "Jane Doe",
        "email": "jane.doe@apex.edu",
        "role": "TEAM_MEMBER",
        "phone": "+91-9876543212",
        "status": "ACTIVE",
        "organizationId": "6abe2acee6ff0a60bec10935",
        "lastLoginAt": "2026-10-01T08:30:00.000Z",
        "createdAt": "2026-10-01T08:00:00.000Z",
        "updatedAt": "2026-10-01T08:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

#### `POST /api/pmo/team-members`
- **Description:** Onboards an operational team member under the PMO's institution.
- **Security Rule:** Always forced to `role: 'TEAM_MEMBER'` and `organizationId: req.user.organizationId`.
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane.doe@apex.edu",
    "phone": "+91-9876543212",
    "password": "Password123!",
    "status": "ACTIVE"
  }
  ```
- **Response Format (201 Created):** Returns user profile without `passwordHash`.
- **Error Codes:**
  - `400 VALIDATION_ERROR`: Missing name, email, or password.
  - `400 WEAK_PASSWORD`: Password does not meet complexity requirements (min 8 chars, uppercase, lowercase, number, special char).
  - `409 EMAIL_ALREADY_EXISTS`: Email address is already registered in the system.

#### `GET /api/pmo/team-members/:id`
- **Description:** Retrieves full profile details for a specific team member.
- **Response Format (200 OK):** Returns team member object.
- **Error Codes:**
  - `404 TEAM_MEMBER_NOT_FOUND`: Member not found or belongs to another organization (resource hiding).

#### `PATCH /api/pmo/team-members/:id`
- **Description:** Updates team member name, email, phone, status, or resets password.
- **Request Body:**
  ```json
  {
    "name": "Jane Doe Updated",
    "email": "jane.updated@apex.edu",
    "phone": "+91-9876543213",
    "password": "NewSecurePassword123!",
    "status": "ACTIVE"
  }
  ```
- **Security Rule:** Resetting the password updates `tokenVersion`, immediately invalidating all active sessions.

#### `PATCH /api/pmo/team-members/:id/status`
- **Description:** Activates or deactivates a team member.
- **Request Body:**
  ```json
  {
    "status": "INACTIVE"
  }
  ```
- **Security Rule:** Deactivation updates `tokenVersion`, instantly terminating any active sessions. Deactivated team members are rejected at login with `403 ACCOUNT_INACTIVE`.

---

### 2.4 Company Master (`/api/companies`)

All endpoints in this group require:
- `Authorization: Bearer <access_token>`
- Permitted User Roles: `SUPER_ADMIN` or `PMO`
- Tenant Rules:
  - For `PMO`: `organizationId` is strictly derived server-side from `req.user.organizationId`. Client-supplied tenant IDs are ignored or rejected. Cross-tenant lookups return `404 COMPANY_NOT_FOUND` to prevent resource enumeration.
  - For `SUPER_ADMIN`: Possesses intentional global visibility. Supports optional `organizationId` query filtering.

#### `GET /api/companies/stats`
- **Description:** Retrieves real-time company metrics (Total, Active, Inactive, and Organization coverage for Super Admin).
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "Company statistics retrieved successfully",
    "data": {
      "totalCompanies": 12,
      "activeCompanies": 10,
      "inactiveCompanies": 2
    }
  }
  ```

#### `GET /api/companies`
- **Description:** Returns a paginated, searchable, and filterable list of master company records.
- **Query Parameters:**
  - `page` (default: 1)
  - `limit` (default: 20, max: 100)
  - `search` (optional substring match on companyName, industry, city, or location)
  - `status` (optional: `ACTIVE` or `INACTIVE`)
  - `industry` (optional exact/substring match)
  - `city` (optional substring match)
  - `organizationId` (optional, Super Admin only)
  - `hiringStatus` (optional: `HIRING_NOW`, `HIRING_PLANNED`, `NOT_HIRING` — dynamically evaluated against the latest interaction/feedback per company; when active, returns companies sorted by latest feedback date DESC)
  - `sortBy` (optional: `createdAt`, `latestFeedbackDate`, `lastContactedAt`, `companyName`, `industry`, `city`, `status`)
  - `sortOrder` (optional: `asc` or `desc`, default: `desc`)
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "Companies retrieved successfully",
    "data": [
      {
        "id": "6abe2e032b9a20e5efbe67fa",
        "companyName": "Acme Technologies Pvt. Ltd.",
        "normalizedName": "acmetechnologiespvtltd",
        "industry": "Information Technology",
        "website": "https://www.acme-tech.com",
        "linkedin": "https://linkedin.com/company/acme-tech",
        "country": "India",
        "state": "Karnataka",
        "city": "Bangalore",
        "location": "Electronic City Phase 1",
        "remarks": "Key recruitment partner",
        "status": "ACTIVE",
        "organizationId": {
          "id": "6abe2acee6ff0a60bec10935",
          "name": "Apex Institute of Technology",
          "code": "APEX"
        },
        "primaryContact": {
          "id": "6abe2e032b9a20e5efbe67fc",
          "name": "Sarah Connor",
          "designation": "Head of Talent Acquisition",
          "email": "sarah@acme-tech.com",
          "phone": "+91 98765 43210"
        },
        "createdAt": "2026-10-01T09:55:00.000Z",
        "updatedAt": "2026-10-01T09:55:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

#### `GET /api/companies/export`
- **Description:** Exports the PMO Central Company Database into a structured Excel workbook (`.xlsx`) with optional historical outreach logs and full filtering capabilities. Triggers audit log entry `COMPANY_DATA_EXPORTED`.
- **Query Parameters:**
  - `exportScope`: `ALL` (default) or `FILTERED` (applies current filter parameters)
  - `includeHistory`: `true` (default) or `false` (includes Sheet 2 "Outreach History")
  - `search`, `source`, `allocation`, `assignedTo`, `outreachStatus`, `hiringStatus`, `status`, `city`: (Same filters as `GET /api/companies`)
- **Response Format:** Binary Excel Spreadsheet (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`). File download filename: `Company_Database_<org_code>_<YYYY-MM-DD>.xlsx`.

#### `POST /api/companies`
- **Description:** Registers a new employer in the Company Master.
- **Request Body:**
  ```json
  {
    "organizationId": "6abe2acee6ff0a60bec10935", // Required for Super Admin, ignored for PMO
    "companyName": "Acme Technologies Pvt. Ltd.",
    "industry": "Information Technology",
    "website": "https://www.acme-tech.com",
    "linkedin": "https://linkedin.com/company/acme-tech",
    "country": "India",
    "state": "Karnataka",
    "city": "Bangalore",
    "location": "Electronic City Phase 1",
    "remarks": "Key corporate partner",
    "status": "ACTIVE",
    "primaryContact": {
      "name": "Sarah Connor",
      "designation": "Head of Talent",
      "email": "sarah@acme-tech.com",
      "phone": "+91 98765 43210"
    }
  }
  ```
- **Error Codes:**
  - `400 COMPANY_NAME_REQUIRED`: Missing company name.
  - `409 DUPLICATE_COMPANY`: A company with a similar normalized name already exists in this organization.
  - `409 DUPLICATE_COMPANY_WEBSITE`: A company with the same website already exists in this organization.

#### `GET /api/companies/:id`
- **Description:** Retrieves full company details, primary contact, and system audit metadata.
- **Error Codes:**
  - `404 COMPANY_NOT_FOUND`: Company not found or belongs to another organization (resource hiding).

#### `PATCH /api/companies/:id`
- **Description:** Updates company profile details, location, notes, and primary HR contact information.
- **Security Rule:** Cannot modify `organizationId` or `createdBy`. Updates `updatedBy` to authenticated user.

#### `PATCH /api/companies/:id/status`
- **Description:** Activates or deactivates a company record.
- **Request Body:**
  ```json
  {
    "status": "INACTIVE"
  }
  ```

### 2.5 Bulk Company Import (`/api/companies/import`)

All endpoints in this group require `SUPER_ADMIN` or `PMO` role:
- Headers: `Authorization: Bearer <accessToken>`

#### `GET /api/companies/import/template`
- **Description:** Downloads sample company import template spreadsheet in CSV or XLSX format.
- **Query Parameters:** `format` (`csv` or `xlsx`, default: `csv`)
- **Response Format:** File attachment buffer (`Content-Disposition: attachment; filename="company_import_template.csv"`)

#### `POST /api/companies/import/upload`
- **Description:** Uploads spreadsheet file (`.csv`, `.xls`, `.xlsx`), parses column headers, maps fields, performs non-destructive validation against existing organization data, and returns summary KPI cards and row preview table.
- **Request Format:** `multipart/form-data`
  - `file`: Spreadsheet file (Required, max 10MB)
  - `organizationId`: Target organization ID (Required for Super Admin, ignored for PMO)
  - `columnMapping`: Optional JSON string of custom header mappings
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "File parsed and validated successfully",
    "data": {
      "organizationId": "6abe2acee6ff0a60bec10935",
      "fileName": "companies.csv",
      "rawHeaders": ["Company Name", "Industry", "Website", "HR Name", "HR Email"],
      "detectedMapping": {
        "companyName": "Company Name",
        "industry": "Industry",
        "website": "Website",
        "hrName": "HR Name",
        "hrEmail": "HR Email"
      },
      "totalRows": 100,
      "validRowsCount": 92,
      "duplicateRowsCount": 5,
      "invalidRowsCount": 3,
      "preview": [
        {
          "rowNumber": 2,
          "status": "VALID",
          "reasons": [],
          "data": { "companyName": "TechCorp Global", "industry": "Software", ... }
        }
      ]
    }
  }
  ```

#### `POST /api/companies/import/execute`
- **Description:** Executes batch insertion of valid rows into `Company` and primary `Contact` collections, logs `AuditLog` events, and records `CompanyImport` history document.
- **Request Body:**
  ```json
  {
    "organizationId": "6abe2acee6ff0a60bec10935",
    "fileName": "companies.csv",
    "fileType": "CSV",
    "rows": [ ... valid row preview objects ... ]
  }
  ```
- **Response Format (200 OK):** Returns created `CompanyImport` record.

#### `GET /api/companies/import/history`
- **Description:** Returns paginated import history logs for an organization.
- **Query Parameters:** `page`, `limit`, `organizationId` (Super Admin only)

#### `GET /api/companies/import/history/:id`
- **Description:** Retrieves specific import record details including execution counters and row-level error reports.

#### `GET /api/companies/import/history/:id/error-report`
- **Description:** Downloads CSV error report of skipped/failed rows with row numbers and specific failure reasons.

---

### 2.6 Company Assignment & Reassignment (`/api/pmo/assignments`)

All endpoints in this group require:
- `Authorization: Bearer <access_token>`
- Permitted User Roles: `SUPER_ADMIN` or `PMO`
- Single Active Assignment Rule: Each company can have at most one active assignment (`status: 'ACTIVE'`). Historical assignments are preserved as `status: 'ENDED'`.
- Tenant Rules: `organizationId` is strictly derived server-side from `req.user.organizationId` (PMO) or supplied in payload/query (Super Admin). PMO cannot assign companies or team members outside their organization.

#### `POST /api/pmo/assignments/assign`
- **Description:** Assigns or reassigns a single company to a target Team Member within the organization.
- **Request Body:**
  ```json
  {
    "companyId": "6abe2e032b9a20e5efbe67fa",
    "assignedTo": "6abe14e89e11ba73212372a8",
    "notes": "Primary account for IT placements"
  }
  ```
- **Response Format (200 OK / 201 Created):** Returns created active `Assignment` object.
- **Error Codes:**
  - `400 COMPANY_ID_REQUIRED`: Missing company ID.
  - `400 TEAM_MEMBER_REQUIRED`: Missing target team member ID.
  - `404 COMPANY_NOT_FOUND`: Company not found or belongs to another organization.
  - `404 TEAM_MEMBER_NOT_FOUND`: Team member not found, inactive, or belongs to another organization.

#### `POST /api/pmo/assignments/bulk-assign`
- **Description:** Bulk assigns or reassigns multiple companies to a single target Team Member in a single transaction-safe operation.
- **Request Body:**
  ```json
  {
    "companyIds": ["6abe2e032b9a20e5efbe67fa", "6abe2e032b9a20e5efbe67fb"],
    "assignedTo": "6abe14e89e11ba73212372a8",
    "notes": "Q4 Bulk allocation"
  }
  ```
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "Bulk assignment processing complete",
    "data": {
      "totalSelected": 2,
      "assigned": 1,
      "reassigned": 1,
      "alreadyAssigned": 0,
      "failed": 0,
      "failures": []
    }
  }
  ```

#### `POST /api/pmo/assignments/unassign`
- **Description:** Unassigns a company from its current active Team Member, transitioning the active assignment record to `status: 'ENDED'` with an `unassignedAt` timestamp.
- **Request Body:**
  ```json
  {
    "companyId": "6abe2e032b9a20e5efbe67fa",
    "notes": "Account returned to pool"
  }
  ```

#### `GET /api/companies/:companyId/assignments`
- **Description:** Retrieves the complete read-only assignment history for a given company, ordered chronologically newest first.
- **Response Format (200 OK):** Returns array of historical `Assignment` records populated with assignee and assignor details.

---

### 2.7 Team Member Workspace (`/api/team-member/companies`)

All endpoints in this group require:
- `Authorization: Bearer <access_token>`
- Permitted User Roles: `TEAM_MEMBER`
- Strict Resource Hiding Security: Team members can ONLY access companies currently actively assigned to them (`status: 'ACTIVE'`). Unassigned companies or companies assigned to other team members return `404 COMPANY_NOT_FOUND`.

#### `GET /api/team-member/companies`
- **Description:** Retrieves paginated list of companies actively assigned to the authenticated Team Member, filtered by outreach status tabs (`TO_CONTACT`, `CONTACTED`, `FOLLOW_UP_DUE`, `ALL`) with live counts.
- **Query Parameters:** `page`, `limit`, `search`, `industry`, `city`, `outreachStatus` (`TO_CONTACT` [default], `CONTACTED`, `FOLLOW_UP_DUE`, `ALL`), `sortBy`, `sortOrder`
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "6abe14e89e11ba73212372d1",
        "companyName": "Acme Tech Solutions",
        "industry": "Software",
        "outreachStatus": "TO_CONTACT",
        "lastContactedAt": null,
        "lastOutcome": null,
        "totalInteractions": 0,
        "primaryContact": { ... }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 35,
      "totalPages": 2,
      "counts": {
        "all": 40,
        "toContact": 35,
        "contacted": 5,
        "followUpDue": 2
      }
    }
  }
  ```

#### `GET /api/team-member/companies/:id`
- **Description:** Retrieves full company details for an assigned company.
- **Response Format (200 OK):** Returns detailed company object with primary contact and assignment details.
- **Error Codes:**
  - `404 COMPANY_NOT_FOUND`: Returned if the company does not exist or is NOT actively assigned to the requesting Team Member (enforces resource hiding security principle).

---

### 2.8 Quick HR Outreach & Call Capture (`/api/team-member/companies/:companyId/interactions`)

All endpoints in this group require:
- `Authorization: Bearer <access_token>`
- Permitted User Roles: `TEAM_MEMBER` (for call recording), `PMO` / `SUPER_ADMIN` (for org-wide interaction review)
- Strict Assignment Security: A Team Member can record an outreach call ONLY for a company actively assigned to them (`status: 'ACTIVE'`). Access to unassigned companies returns `404 COMPANY_NOT_FOUND`.

#### `POST /api/team-member/companies/:companyId/interactions`
- **Description:** Records a quick HR phone call questionnaire, updates or inline creates primary HR recruiter contact info, and schedules an automated `FollowUp` task if next action is `FOLLOW_UP`.
- **Request Body:**
  ```json
  {
    "hiringStatus": "YES",
    "profiles": ["MERN Developer", "Frontend Engineer"],
    "candidateType": "FRESHERS",
    "openings": 15,
    "opportunityType": "FULL_TIME",
    "ppoAvailable": "NOT_SURE",
    "location": "Noida, Gurgaon",
    "workMode": "HYBRID",
    "salaryOrStipend": "₹6.5 LPA",
    "bond": "NO",
    "specificRequirement": "Minimum 60% in B.Tech CS/IT",
    "hrResponse": "Spoke with Ms. Anjali. Hiring 15 MERN devs. Will email JD tomorrow.",
    "nextAction": "WAITING_FOR_JD",
    "followUpDate": null,
    "interactionDate": "2026-10-01T10:30:00.000Z",
    "contact": {
      "name": "Ms. Anjali Sharma",
      "designation": "Head of Talent Acquisition",
      "email": "anjali@techcorp.com",
      "phone": "+91 98765 43210"
    }
  }
  ```
- **Validation Rules:**
  - `nextAction = FOLLOW_UP` requires a valid `followUpDate`. Missing date returns `400 FOLLOWUP_DATE_REQUIRED`.
  - Unassigned company call attempt returns `404 COMPANY_NOT_FOUND`.
- **Response Format (201 Created):** Returns `{ interaction, followUp, contact }`.

#### `GET /api/team-member/outreach/stats`
- **Description:** Retrieves real-time KPI metrics for the authenticated Team Member's outreach workspace (Assigned Companies, Contacted Companies, Total Calls, Feedback Submissions, Coverage Percentage, Follow-up Queue breakdown).
- **Authentication:** Bearer JWT in `Authorization` header (`TEAM_MEMBER` role)
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "Outreach statistics retrieved successfully",
    "data": {
      "assignedCompanies": 40,
      "contactedCompanies": 28,
      "uncontactedCompanies": 12,
      "totalCalls": 35,
      "feedbackSubmitted": 35,
      "followUpsDueToday": 4,
      "upcomingFollowUps": 8,
      "overdueFollowUps": 2,
      "coveragePercentage": 70
    }
  }
  ```

#### `GET /api/team-member/outreach`
- **Description:** Retrieves paginated outreach call history and complete submitted HR feedback records logged by the authenticated Team Member across all assigned companies. Supports search across company/HR names, date range filters, interaction type, and hiring status.
- **Authentication:** Bearer JWT in `Authorization` header (`TEAM_MEMBER` role)
- **Query Parameters:** `page`, `limit`, `search`, `interactionType`, `hiringStatus`, `fromDate`, `toDate`
- **Response Format (200 OK):** Returns paginated array of interaction objects containing populated `companyId`, `contactId`, `userId`, `callDetails`, and `followUp`.

#### `GET /api/team-member/companies/:companyId/interactions`
- **Description:** Retrieves paginated chronological interaction timeline for an assigned company.

#### `GET /api/team-member/companies/:companyId/outreach-summary`
- **Description:** Retrieves lightweight outreach summary card data (`lastContactedAt`, `lastOutcome`, `totalInteractions`, `nextFollowUp`).

#### `GET /api/pmo/interactions`
- **Description:** Retrieves organization-wide interaction log history for PMO oversight.

---

## 3. Planned Endpoint Groups (Not Implemented Yet)

### 3.1 Password Recovery (`/api/auth`)
- `POST /api/auth/forgot-password` — Initiate password recovery
- `POST /api/auth/reset-password` — Complete password recovery

### 2.3 Users & Team Management (`/api/v1/users`)
- `GET    /api/v1/users` — List team members within tenant (PMO / Super Admin)
- `POST   /api/v1/users` — Invite/create a new team member or PMO user
- `GET    /api/v1/users/:id` — Retrieve user profile
- `PATCH  /api/v1/users/:id` — Update user details or active status
- `DELETE /api/v1/users/:id` — Deactivate user account

### 2.4 Companies (`/api/v1/companies`)
- `GET    /api/v1/companies` — Query company directory with filters, search, and pagination
- `POST   /api/v1/companies` — Add a new master company record
- `POST   /api/v1/companies/import` — Bulk import companies via CSV/Excel
- `GET    /api/v1/companies/:id` — Retrieve company profile, contacts, and interaction history
- `PATCH  /api/v1/companies/:id` — Update company profile details or tier
- `DELETE /api/v1/companies/:id` — Archive/deactivate company record

### 2.5 Contacts (`/api/v1/companies/:companyId/contacts`)
- `GET    /api/v1/companies/:companyId/contacts` — List corporate contacts for a company
- `POST   /api/v1/companies/:companyId/contacts` — Add a recruiter or HR contact
- `PATCH  /api/v1/companies/:companyId/contacts/:contactId` — Update contact information
- `DELETE /api/v1/companies/:companyId/contacts/:contactId` — Remove contact record

### 2.6 Assignments (`/api/v1/assignments`)
- `GET    /api/v1/assignments` — List current company allocations
- `POST   /api/v1/assignments` — Allocate company to a team member (PMO)
- `POST   /api/v1/assignments/bulk` — Bulk assign companies to team members (PMO)
- `PATCH  /api/v1/assignments/:id/reassign` — Reassign company to another member
- `DELETE /api/v1/assignments/:id` — Revoke assignment

### 2.7 Interactions & Call Logging (`/api/v1/interactions`)
- `GET    /api/v1/interactions` — List interaction activity feed
- `POST   /api/v1/interactions` — Fast-log HR call notes, outcome, and status
- `GET    /api/v1/companies/:companyId/interactions` — Retrieve interaction history for a company
- `GET    /api/v1/interactions/:id` — View interaction details

### 2.8 Follow-ups (`/api/v1/follow-ups`)
- `GET    /api/v1/follow-ups` — List upcoming and pending follow-ups for user / team
- `POST   /api/v1/follow-ups` — Schedule a new callback or follow-up reminder
- `PATCH  /api/v1/follow-ups/:id` — Mark follow-up as completed, rescheduled, or cancelled

### 2.9 Job Opportunities & JD Management (`/api/opportunities`) [IMPLEMENTED]
- **Description:** Complete REST endpoints for recording hiring opportunities, managing JD documents, and tracking compensation and candidate requirements.
- **Authorization:**
  - `TEAM_MEMBER`: Restricted to companies assigned to the user (`assignedTo === req.user.id`). Cross-member lookups return `404 OPPORTUNITY_NOT_FOUND`.
  - `PMO`: Organization-wide CRUD access for all companies in institution.
  - `SUPER_ADMIN`: Global read/write access across all institutions.
- **Endpoints:**
  - `GET /api/opportunities` — Query job opportunities with search (`search`), hiring status (`hiringStatus`), type (`opportunityType`), company (`companyId`), creator (`createdBy`), shortlisted status (`shortlisted=true|false`), and pagination.
  - `GET /api/opportunities/:id` — Retrieve full opportunity details including populated company, creator, shortlistedByUser, and attached JD document.
  - `POST /api/opportunities` — Create a new job opportunity.
  - `PATCH /api/opportunities/:id` — Update job opportunity requirements, compensation, openings, or hiring status.
  - `DELETE /api/opportunities/:id` — Mark opportunity as `CLOSED` and record audit trail.
  - `PATCH /api/opportunities/:id/shortlist` — Shortlist, unshortlist, or update PMO review note (`PMO` & `SUPER_ADMIN` only). Idempotent operation emitting `OPPORTUNITY_SHORTLISTED`, `OPPORTUNITY_UNSHORTLISTED`, or `PMO_REVIEW_NOTE_UPDATED` audit logs. Attempts by `TEAM_MEMBER` return `403 FORBIDDEN`. Cross-tenant access returns `404 OPPORTUNITY_NOT_FOUND`.
  - `POST /api/opportunities/:id/jd` — Upload or replace JD document attachment (multipart/form-data with `jd` file, accepts PDF, DOC, DOCX up to 15 MB).
  - `DELETE /api/opportunities/:id/jd` — Unlink and remove attached JD document.
  - `GET /api/opportunities/:id/jd` — Securely view/stream/download JD document file with strict tenant and assignment authorization enforcement.

### 2.10 Documents (`/api/documents`) [IMPLEMENTED via /api/opportunities/:id/jd]
- `POST   /api/opportunities/:id/jd` — Upload a Job Description (JD) document
- `GET    /api/opportunities/:id/jd` — Retrieve document and stream file securely
- `DELETE /api/opportunities/:id/jd` — Remove attached JD document record

### 2.11 Analytics & Dashboards (`/api/pmo/dashboard`) [IMPLEMENTED]
- **Description:** Returns organization-level PMO analytics, company metrics, team performance table, hiring status distribution, outreach timeline series, follow-up queue counts, and recent activity log.
- **Authorization:** `PMO` and `SUPER_ADMIN` only. `TEAM_MEMBER` receives `403 FORBIDDEN`. Scoped strictly to `req.user.organizationId`.
- **Query Parameters:**
  - `dateRange`: `'7d'`, `'30d'`, `'90d'`, `'all'`, `'custom'` (default: `'30d'`)
  - `startDate`, `endDate`: ISO date strings (required when `dateRange === 'custom'`)
  - `teamMemberId`: optional User ID to filter operational metrics for a specific member
- **Response Format (200 OK):**
  ```json
  {
    "success": true,
    "message": "PMO dashboard analytics retrieved successfully",
    "data": {
      "dateRangeInfo": { "dateRange": "30d", "startDate": "2026-09-03T00:00:00.000Z", "endDate": "2026-10-03T23:59:59.999Z" },
      "companies": { "totalCompanies": 50, "assignedCompanies": 35, "unassignedCompanies": 15, "contactedCompanies": 25, "notContactedCompanies": 25 },
      "hiring": { "currentlyHiring": 8, "hiringPlanned": 5, "notHiring": 10, "onHold": 2, "closed": 1, "shortlistedOpportunities": 6, "totalOpportunities": 26 },
      "followUps": { "today": 4, "upcoming": 12, "overdue": 3, "totalPending": 19 },
      "teamPerformance": [
        { "teamMember": { "id": "65...", "name": "Rahul", "email": "rahul@test.com" }, "assigned": 20, "contacted": 14, "pending": 6, "currentlyHiring": 5, "followUps": 4, "coverage": 70.0 }
      ],
      "charts": {
        "hiringStatusDistribution": [ ... ],
        "opportunityTypeDistribution": [ ... ],
        "teamCoverage": [ ... ],
        "outreachActivity": [ ... ]
      },
      "recentActivity": [ ... ]
    }
  }
  ```

### 2.12 Audit Logs & System Activity (`/api/audit-logs`) [IMPLEMENTED]
- **Description:** Centralized, secure audit log API providing traceability for system mutations, user provisioning, corporate outreach actions, opportunity updates, and administrative changes.
- **Authorization:** `SUPER_ADMIN` and `PMO` roles only. `TEAM_MEMBER` requests return `403 FORBIDDEN`.
- **Tenant Security:** For `PMO`, requests are automatically scoped to `req.user.organizationId` server-side; client attempts to override `organizationId` parameter are strictly ignored or rejected. Cross-tenant lookups return `404 AUDIT_LOG_NOT_FOUND`.
- **Endpoints:**
  - `GET /api/audit-logs` — Query paginated, searchable, and filtered audit records.
    - **Query Parameters:**
      - `page` (default: 1)
      - `limit` (default: 25, max: 100)
      - `search` (substring match on action, entity type, actor name/email, organization name/code, or entity ID)
      - `entityType` (optional: `Organization`, `User`, `Company`, `Assignment`, `Interaction`, `FollowUp`, `JobOpportunity`, `Document`)
      - `action` (optional: uppercase action string e.g. `COMPANY_CREATED`, `OPPORTUNITY_SHORTLISTED`)
      - `startDate`, `endDate` (optional ISO date range filters)
      - `organizationId` (SUPER_ADMIN only: optional organization ID filter or `'global'` for platform actions)
      - `sortBy` (default: `timestamp`)
      - `sortOrder` (default: `desc`)
    - **Response Format (200 OK):**
      ```json
      {
        "success": true,
        "message": "Audit logs retrieved successfully",
        "data": [
          {
            "id": "60d5ec49b1a7d62b9c8b4567",
            "organizationId": { "id": "60d5ec49b1a7d62b9c8b4500", "name": "Apex Institute", "code": "APEX" },
            "performedBy": { "id": "60d5ec49b1a7d62b9c8b4501", "name": "Rahul Sharma", "email": "rahul@apex.edu", "role": "PMO" },
            "action": "COMPANY_CREATED",
            "entityType": "Company",
            "entity": "Company",
            "entityId": "60d5ec49b1a7d62b9c8b4599",
            "oldValue": null,
            "newValue": { "companyName": "Google India", "industry": "Technology" },
            "metadata": { "companyName": "Google India" },
            "timestamp": "2026-10-03T11:00:00.000Z"
          }
        ],
        "meta": { "page": 1, "limit": 25, "total": 45, "totalPages": 2 }
      }
      ```
  - `GET /api/audit-logs/:id` — Retrieve detailed single audit log record including actor, organization, metadata, and mutation snapshot (`oldValue` / `newValue`).

### 2.13 In-App Notifications & Follow-Up Reminders (`/api/notifications`) [IMPLEMENTED]
- **Description:** Real-time operational alerts, follow-up reminders, company assignment updates, and opportunity shortlisting notices.
- **Authorization:** Authenticated users (`SUPER_ADMIN`, `PMO`, `TEAM_MEMBER`).
- **Tenant & Recipient Scoping:** `organizationId` and `recipientId` are strictly derived server-side from `req.user`. Client overrides of recipient or organization are strictly forbidden. Cross-recipient mark as read attempts return `404 NOTIFICATION_NOT_FOUND`.
- **Endpoints:**
  - `GET /api/notifications` — Retrieve paginated notification list for authenticated user.
    - **Query Parameters:** `page` (default: 1), `limit` (default: 20, max: 100), `isRead` (optional: `true` | `false`). Automatically triggers `checkAndGenerateFollowUpReminders` for due/overdue follow-ups.
    - **Response Format (200 OK):**
      ```json
      {
        "success": true,
        "message": "Notifications retrieved successfully",
        "data": [
          {
            "id": "60d5ec49b1a7d62b9c8b4568",
            "type": "FOLLOW_UP_DUE",
            "title": "Follow-Up Due Today",
            "message": "Follow-up for Acme Corp is scheduled for today.",
            "entity": "FollowUp",
            "entityId": "60d5ec49b1a7d62b9c8b4512",
            "isRead": false,
            "readAt": null,
            "metadata": { "companyName": "Acme Corp" },
            "createdAt": "2026-10-03T12:00:00.000Z"
          }
        ],
        "meta": { "page": 1, "limit": 20, "totalDocs": 5, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false },
        "unreadCount": 3
      }
      ```
  - `GET /api/notifications/unread-count` — Returns current unread notification count `{ unreadCount: 3 }`.
  - `PATCH /api/notifications/:id/read` — Marks a single notification as read for authenticated user.
  - `PATCH /api/notifications/read-all` — Marks all unread notifications for authenticated user as read.

### 2.14 Job Role Master Management (`/api/pmo/job-roles` & `/api/job-roles/active`) [IMPLEMENTED]
- **Description:** PMO management of organization-specific Job Role Master data for HR call feedback collection, recruitment profile selection, and historical snapshot recording.
- **Tenant Scoping:** `organizationId` is strictly derived server-side from `req.user.organizationId`.
- **Endpoints:**
  - `GET /api/pmo/job-roles` — PMO query of all job roles in organization with active usage count.
    - **Authorization:** `PMO` role required.
    - **Query Parameters:** `search` (name/description filter), `status` (`ACTIVE` | `INACTIVE` | `ALL`).
    - **Response Format (200 OK):**
      ```json
      {
        "success": true,
        "message": "Job roles retrieved successfully",
        "data": [
          {
            "id": "60d5ec49b1a7d62b9c8b4590",
            "name": "Fullstack React Developer",
            "description": "MERN Stack development profile",
            "status": "ACTIVE",
            "usedCount": 12,
            "createdBy": { "id": "60d5ec49b1a7d62b9c8b4501", "name": "PMO Admin" },
            "updatedBy": { "id": "60d5ec49b1a7d62b9c8b4501", "name": "PMO Admin" },
            "createdAt": "2026-10-06T05:00:00.000Z",
            "updatedAt": "2026-10-06T05:00:00.000Z"
          }
        ]
      }
      ```
  - `GET /api/job-roles/active` — Active job roles dropdown provider for call outreach feedback forms.
    - **Authorization:** Authenticated users (`PMO`, `TEAM_MEMBER`).
    - **Response Format (200 OK):** Array of active `{ id, name, description }` objects.
  - `POST /api/pmo/job-roles` — Create new job role for organization.
    - **Authorization:** `PMO` role required.
    - **Request Body:** `{ "name": "Data Analyst Trainee", "description": "Python, SQL, Tableau" }`
    - **Error Codes:** `409 CONFLICT` if a role with matching normalized name already exists in organization.
  - `PUT /api/pmo/job-roles/:id` — Update job role name and description.
  - `PATCH /api/pmo/job-roles/:id/status` — Toggle job role status (`ACTIVE` | `INACTIVE`).


