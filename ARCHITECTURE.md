# Placement Management System — Architecture Specification

> **Status Notice:**
> The architectural patterns, file structures, and data flows described below represent the **PLANNED ARCHITECTURE** for the Placement Management System. No application features are currently implemented.

---

## 1. System Overview

The Placement Management System is a multi-tenant B2B SaaS web application designed to manage corporate outreach and hiring opportunity intake for educational institutions.

The application follows a decoupled client-server architecture:
- **Client Application:** Modern single-page application built with React, Vite, Tailwind CSS, and Redux Toolkit.
- **Server Application:** RESTful API service built with Node.js and Express.
- **Persistence Layer:** Document-based storage powered by MongoDB with Mongoose ODM.
- **Security Perimeter:** JWT-based stateless authentication coupled with database-level multi-tenant isolation.

```
┌─────────────────────────────────────────────────────────────┐
│                       Client (SPA)                          │
│               React + Redux Toolkit + Tailwind              │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON REST APIs
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server (Express REST)                    │
│                                                             │
│   Routes ──> Auth & Tenant Guard ──> Controllers            │
│                                           │                 │
│                                           ▼                 │
│                                    Business Services        │
│                                           │                 │
│                                           ▼                 │
│                                     Mongoose Models         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer (MongoDB)                   │
│         Logical Tenant Partitioning (organizationId)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure & Implementation Status

### 2.1 Frontend (`client/`)

```
client/
├── index.html                       # [IMPLEMENTED] HTML entry point
├── package.json                     # [IMPLEMENTED] React 18, Vite 5, Tailwind 3, RTK, RHF, Zod, Axios
├── vite.config.js                   # [IMPLEMENTED] Vite dev config with API proxy
├── tailwind.config.js               # [IMPLEMENTED] Tailwind styling configuration
├── postcss.config.js                # [IMPLEMENTED] PostCSS plugins
├── .env.example                     # [IMPLEMENTED] Client environment template
└── src/
    ├── main.jsx                     # [IMPLEMENTED] Application bootstrap & Redux Provider setup
    ├── App.jsx                      # [IMPLEMENTED] Foundation dev shell & live health monitor
    ├── index.css                    # [IMPLEMENTED] Tailwind directives & baseline typography
    ├── services/
    │   └── api.js                   # [IMPLEMENTED] Centralized Axios client & health check API call
    ├── store/
    │   └── index.js                 # [IMPLEMENTED] Redux Toolkit store baseline
    ├── components/                  # [SCAFFOLDED] Reusable UI primitives (common/, forms/, tables/)
    ├── layouts/                     # [SCAFFOLDED] Page wrappers per role (Auth, SuperAdmin, PMO, Team)
    ├── pages/                       # [SCAFFOLDED] Route views organized by domain
    ├── features/                    # [SCAFFOLDED] Domain-driven feature slices
    ├── hooks/                       # [SCAFFOLDED] Custom shared hooks
    ├── utils/                       # [SCAFFOLDED] Date formatters, file helpers, string utils
    ├── constants/                   # [SCAFFOLDED] Routes, role enums, status codes
    └── lib/                         # [SCAFFOLDED] Shared client utilities
```

### 2.2 Backend (`server/`)

```
server/
├── package.json                     # [IMPLEMENTED] Express 4, Mongoose 8, bcryptjs, jsonwebtoken, cookie-parser, cors
├── .env.example                     # [IMPLEMENTED] Server environment template (PORT, MONGODB_URI, JWT keys)
└── src/
    ├── server.js                    # [IMPLEMENTED] Entry point: DB connection & port listener
    ├── app.js                       # [IMPLEMENTED] Express app, CORS, cookie-parser, JSON parser, route mounting
    ├── config/
    │   ├── env.js                   # [IMPLEMENTED] Validated environment configuration & JWT settings
    │   └── db.js                    # [IMPLEMENTED] Mongoose connection manager & status reporter
    ├── controllers/
    │   ├── health.controller.js     # [IMPLEMENTED] Thin controller for GET /api/health
    │   └── auth.controller.js       # [IMPLEMENTED] Thin controller for login, me, logout, refresh
    ├── middleware/
    │   ├── auth.middleware.js       # [IMPLEMENTED] JWT verification & req.user attachment (requireAuth)
    │   ├── role.middleware.js       # [IMPLEMENTED] RBAC permission guard (requireRole)
    │   ├── tenant.middleware.js     # [IMPLEMENTED] Strict tenant isolation & tamper block (enforceTenantScope)
    │   ├── error.middleware.js      # [IMPLEMENTED] Global error handler with standard envelope
    │   └── notFound.middleware.js   # [IMPLEMENTED] 404 handler for unknown routes
    ├── routes/
    │   ├── index.js                 # [IMPLEMENTED] Main API router mounting /health, /auth, /security-test
    │   ├── health.routes.js         # [IMPLEMENTED] Health check route definition
    │   ├── auth.routes.js           # [IMPLEMENTED] Authentication routes (/login, /me, /logout, /refresh)
    │   └── security-test.routes.js  # [IMPLEMENTED] RBAC and tenant isolation verification endpoints
    ├── services/
    │   └── auth.service.js          # [IMPLEMENTED] Authentication business logic, token generation, user formatting
    ├── models/
    │   ├── Organization.js          # [IMPLEMENTED] Multi-tenant root entity model
    │   └── User.js                  # [IMPLEMENTED] User model with role validation and bcrypt hashing
    ├── utils/
    │   ├── apiResponse.js           # [IMPLEMENTED] Standardized response formatting helpers
    │   ├── token.js                 # [IMPLEMENTED] JWT signing, verification, and cookie helpers
    │   └── tenant.js                # [IMPLEMENTED] Multi-tenant query builders & assertion helpers
    └── validators/                  # [SCAFFOLDED] Request validation schemas
```

---

## 3. Backend Layering Pattern

All backend code must strictly follow this unidirectional execution flow:

```
[ Incoming HTTP Request ]
          │
          ▼
   1. Route Layer               (Maps URI + HTTP Verb)
          │
          ▼
   2. Middleware Layer          (Auth check, Role check, Tenant derivation, Payload validation)
          │
          ▼
   3. Controller Layer (THIN)   (Extracts verified input, invokes Service, sets HTTP status)
          │
          ▼
   4. Service Layer (THICK)     (Contains ALL business logic, transactions, tenant queries)
          │
          ▼
   5. Model Layer               (Mongoose schemas, validations, database queries)
          │
          ▼
[ Formatted API Response ]
```

### Thin Controllers Principle
Controllers are strictly HTTP adapters:
- Read parameters: `req.body`, `req.params`, `req.query`, `req.user`.
- Call one or more service methods: `await companyService.createCompany(...)`.
- Send response: `return res.status(201).json({ success: true, data: result })`.
- Controllers **never** interact with Mongoose models directly.

---

## 4. Multi-Tenancy Architecture

### 4.1 Logical Isolation Model
Multi-tenancy is implemented through logical row/document-level partitioning in a shared MongoDB database. Every tenant-specific collection contains a mandatory, indexed `organizationId` attribute referencing the `Organization` document.

### 4.2 Security Rules for Multi-Tenancy
1. **Zero Client Trust:** The frontend must never dictate tenant scope. Any `organizationId` submitted in headers, query parameters, or request bodies by non-super-admin users is ignored.
2. **Server-Side Token Derivation:**
   - When a user logs in, their verified `organizationId` and `role` are embedded in the signed JWT payload.
   - The `auth.middleware.js` verifies the token and populates `req.user`.
   - The `tenant.middleware.js` attaches `req.tenantId = req.user.organizationId` for tenant users.
3. **Database Scoping in Services:**
   - Services automatically append `{ organizationId: req.tenantId }` to all database read, update, and delete queries.
   - For example:
     ```javascript
     // Correct Pattern:
     const companies = await Company.find({ organizationId: tenantId, status: 'Active' });
     ```
4. **SUPER_ADMIN Exemption:**
   - `SUPER_ADMIN` does not belong to any single organization tenant (`organizationId: null`).
   - `SUPER_ADMIN` may explicitly query specific organizations by supplying an `orgId` parameter in administrative routes.

---

## 5. Authentication & Authorization

### 5.1 Authentication Flow [PLANNED]
- **Protocol:** JSON Web Tokens (JWT).
- **Credentials:** Email and securely hashed password (Argon2 or bcrypt with salt rounds >= 12).
- **Session Tokens:** Short-lived access tokens (e.g., 15-30 minutes) combined with secure, HTTP-only refresh tokens.
- **Revocation:** Refresh tokens stored or tracked with a token version in the `User` document to allow instant session revocation.

### 5.2 Authorization & Role-Based Access Control (RBAC) [PLANNED]
Access control is enforced at the route level via reusable middlewares:
- `requireAuth`: Ensures valid token is present and user account is active.
- `requireRole(['SUPER_ADMIN', 'PMO'])`: Ensures the authenticated user possesses an allowed role.
- `requireOwnershipOrAssignment`: Verifies that a `TEAM_MEMBER` is only operating on records assigned to them.

| Role | Organization Scope | Data Permissions |
| :--- | :--- | :--- |
| `SUPER_ADMIN` | Global (All Organizations) | Read/Write Orgs, View cross-tenant companies, Platform analytics |
| `PMO` | Own Organization Only | Full Read/Write within own organization |
| `TEAM_MEMBER` | Own Organization Only | Read/Write assigned companies, interactions, opportunities |

---

## 6. Document & File Handling Architecture [PLANNED]

### 6.1 Requirements
During corporate outreach, company HR representatives frequently share Job Descriptions (JDs), brochures, and eligibility criteria sheets in PDF, DOCX, or image formats.

### 6.2 Storage Strategy
- The application will utilize a **Storage Service Provider abstraction** (`storage.service.js`).
- The storage interface defines:
  - `uploadFile(fileStream, metadata)`
  - `getFileUrl(documentId)`
  - `deleteFile(documentId)`
- **Future Integration:** Production deployments will connect to Cloudflare R2 or an S3-compatible object storage bucket.
- **Document Metadata:** Files uploaded will create a `Document` record in MongoDB referencing `organizationId`, `uploadedBy`, `companyId`, `opportunityId`, and the object storage key.
- **Current Status:** Document storage is planned and architected, but not yet implemented.
