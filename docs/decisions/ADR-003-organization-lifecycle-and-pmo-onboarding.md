# ADR-003: Super Admin Organization Lifecycle & PMO Onboarding Architecture

## Status
Accepted

## Date
2026-10-01

## Context
Educational institutions joining the Placement Management System require onboarding by platform administrators (`SUPER_ADMIN`). Each institution represents a root tenant boundary with its own administrative leadership (`PMO`) and placement team staff.

We needed to establish the architectural patterns for:
1. Organization creation and lifecycle state transitions (`ACTIVE` vs. `INACTIVE`).
2. Primary Placement Officer (`PMO`) account provisioning and association.
3. Enforcement of tenancy and security constraints during onboarding.
4. Cascading impact of organization status changes on tenant users.
5. Traceability and audit logging of platform-level mutations.

## Decision

### 1. Two-Stage Decoupled Onboarding Workflow
We decided to decouple **Organization Registration** from **PMO User Provisioning**:
- **Stage 1 (Register Organization):** Super Admin registers legal institution details (`name`, unique `code`, `email`, `phone`, `address`).
- **Stage 2 (Provision Primary PMO):** Super Admin navigates to the organization details page and provisions the institution's primary PMO with corporate credentials.

*Rationale:* This prevents messy transactional rollback scenarios (e.g. email conflicts or weak passwords failing during bulk org setup) and accommodates real-world enterprise onboarding where the institutional agreement is finalized before the primary officer's credentials are confirmed.

### 2. Single Primary PMO Constraint (Phase 1)
For Phase 1, each organization is constrained to exactly one primary PMO:
- Attempting to create a second PMO returns HTTP `409 Conflict` (`DUPLICATE_PRIMARY_PMO`).
- Future phases may introduce secondary PMOs or delegates, but Phase 1 enforces a single organizational owner to eliminate ambiguity in assignment ownership and reporting.

### 3. Cascading Status Deactivation
- When an organization is set to `INACTIVE`, all PMO and Team Member users belonging to that organization are immediately denied access at the authentication middleware layer (`ORGANIZATION_INACTIVE`), even if their individual account status is `ACTIVE`.
- When an organization is inactive, new PMO provisioning is strictly rejected with HTTP `400 Bad Request` (`ORGANIZATION_INACTIVE`).

### 4. Immediate Session Revocation on Security Events
- When a PMO is deactivated (`status: 'INACTIVE'`) or their password is reset, their `tokenVersion` counter is atomically incremented.
- This immediately invalidates outstanding JWT refresh tokens and forces session termination across all active browser sessions.

### 5. Immutable Organization Codes
- Organization codes (slugs) are normalized to uppercase alphanumeric format (2–20 characters) and indexed uniquely.
- Organization codes are immutable post-creation to prevent tenant routing degradation, foreign key drift, and log corruption.

### 6. Synchronous Audit Logging
- Every mutation performed by a Super Admin (`ORGANIZATION_CREATED`, `ORGANIZATION_UPDATED`, `ORGANIZATION_ACTIVATED`, `ORGANIZATION_DEACTIVATED`, `PMO_CREATED`, `PMO_UPDATED`, `PMO_ACTIVATED`, `PMO_DEACTIVATED`) generates an immutable document in the `AuditLog` collection.
- The `performedBy` field strictly records the authenticated actor from `req.user.id` and never trusts client-submitted actor attributes.
- Failures in audit logging are logged as system errors but never crash the core business transaction.

## Consequences

### Positive
- Clear operational separation of concerns between institutional registration and personnel credentialing.
- Bulletproof multi-tenant isolation where suspended colleges cannot accidentally leak outreach activity.
- Complete audit trail of administrative actions for compliance and accountability.
- Seamless frontend UX with dedicated management screens, accessible modals, and reactive status indicators.

### Negative / Trade-offs
- Setting up a tenant requires two distinct UI actions (Register Organization -> Provision PMO). However, this mirrors real-world administrative workflows and ensures validation isolation.
