# ADR-002: Authentication Strategy, Role-Based Access Control, and Tenant Security Scoping

- **Status:** Accepted
- **Date:** 2026-10-01
- **Deciders:** Lead Software Architect
- **Technical Context:** Placement Management System (Phase 1 — Milestone 1.1)

---

## 1. Context and Problem Statement

The Placement Management System requires a secure authentication and authorization mechanism that supports:
1. Multi-tenant isolation for educational institutions (`PMO` and `TEAM_MEMBER`).
2. Global platform administration (`SUPER_ADMIN`) operating across tenants without data contamination.
3. Secure session management in browser environments that protects against Cross-Site Scripting (XSS) and token theft.
4. Prevention of tenant tampering or cross-tenant privilege escalation.

---

## 2. Decision

### 2.1 Token Protocol & Session Management
- **Short-Lived Access Tokens:** Issued as signed JSON Web Tokens (JWT) containing `id`, `role`, and `organizationId`, with a short lifespan (15 minutes). Sent via `Authorization: Bearer <token>` for API requests.
- **HTTP-Only Refresh Tokens:** Stored exclusively in secure, HTTP-only cookies (`placement_refresh_token`) scoped to `/api/auth`, with `SameSite: strict/lax` and `secure: true` in production. Refresh tokens have a 7-day lifespan and support token rotation.
- **Immediate Revocation via `tokenVersion`:** The `User` model includes an integer `tokenVersion`. Incrementing this field instantly invalidates all existing refresh tokens for that user.

### 2.2 Super Admin vs. Tenant User Scoping
- **`SUPER_ADMIN`:** Operates at the platform tier. `organizationId` is explicitly set to `null`. Fake or dummy organization IDs are strictly prohibited. The Mongoose model schema enforces that a `SUPER_ADMIN` must have `organizationId === null`.
- **`PMO` and `TEAM_MEMBER`:** Must belong to exactly one registered, active `Organization`. Schema validation strictly rejects tenant user documents where `organizationId` is missing or null.

### 2.3 Strict Server-Side Tenant Scoping
- For all operations initiated by `PMO` or `TEAM_MEMBER`, the `organizationId` is derived exclusively from the verified server-side `req.user.organizationId`.
- The multi-tenant middleware (`enforceTenantScope`) explicitly inspects client request bodies, query strings, and route parameters. If a tenant user attempts to supply an `organizationId` different from their own, the request is immediately rejected with HTTP 403 (`CROSS_TENANT_ACCESS_DENIED`).
- When omitted, `req.body.organizationId` is automatically overwritten with the authenticated user's `organizationId`.

### 2.4 User Email Uniqueness
- User emails are normalized to lowercase and enforced as globally unique at the database level (`{ email: 1 }, { unique: true }`).
- **Rationale:** Allows single-form login without requiring the user to know or input an institutional slug or organization code before authenticating.

---

## 3. Consequences

- **Security:** Complete elimination of client-dictated tenant scoping. Cross-tenant leakage is prevented before reaching any controller or service logic.
- **Session Safety:** Access tokens stored in memory/storage are short-lived. Long-term refresh credentials are inaccessible to client-side JavaScript.
- **Testing:** Proven via 13 automated security test cases in `server/src/scripts/verify-security.js` covering valid logins, invalid credentials, inactive accounts, inactive organizations, cross-tenant injection attempts, and unauthorized role elevation.
