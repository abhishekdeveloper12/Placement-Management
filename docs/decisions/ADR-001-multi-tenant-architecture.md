# ADR-001: Organization-Based Multi-Tenant Architecture

- **Status:** Accepted
- **Date:** 2026-10-01
- **Deciders:** Lead Software Architect
- **Technical Context:** Placement Management System (Phase 1)

---

## 1. Context and Problem Statement

The Placement Management System is a B2B SaaS platform serving multiple independent educational institutions (universities, colleges, and institutes). Each institution manages proprietary corporate relationships, recruiter contacts, confidential placement leads, and operational team metrics. 

We need an architectural model that supports:
1. Complete data privacy and isolation between institutions.
2. Cost-effective and operationally manageable infrastructure.
3. Centralized governance and cross-tenant visibility for the global platform administrator (`SUPER_ADMIN`).
4. Strict enforcement of data boundaries to prevent tenant data leakage.

---

## 2. Decision

We will implement an **Organization-Based Multi-Tenancy Architecture** using **logical document-level partitioning in a shared MongoDB database**.

### Core Architecture Rules:
1. **Root Tenant Entity:** The `Organization` entity serves as the root tenant boundary.
2. **Mandatory Tenant Reference:** Every tenant-owned document (`User`, `Company`, `Contact`, `Assignment`, `Interaction`, `FollowUp`, `JobOpportunity`, `Document`, `AuditLog`) must include an indexed, non-nullable `organizationId` referencing the owning `Organization`.
3. **Role-Based Tenant Scoping:**
   - **`SUPER_ADMIN`:** Global access across all organizations. Can query cross-tenant statistics and drill into organization-specific records. Has `organizationId: null`.
   - **`PMO` (Placement Officer):** Strictly scoped to their own `organizationId`. Can view and manage all records within their organization.
   - **`TEAM_MEMBER`:** Strictly scoped to their own `organizationId`, with operational focus further restricted to assigned companies, interactions, and opportunities.
4. **Backend Security Enforcement:**
   - The frontend is **never trusted** to supply the `organizationId` for authorization or data isolation.
   - For all tenant roles (`PMO` and `TEAM_MEMBER`), the `organizationId` is extracted server-side exclusively from the cryptographically signed JWT token / authenticated session.
   - All database read, update, and delete queries executed by tenant roles must programmatically inject `{ organizationId }` filtering at the service layer.

---

## 3. Alternatives Considered

### Alternative A: Database-per-tenant (Separate MongoDB Database for each institution)
- *Pros:* Physical isolation, simple drop-database operations.
- *Cons:* Heavy connection management overhead in Node.js/Mongoose, complex cross-tenant aggregation for Super Admin, high operational cost for smaller institutions, migration management friction across hundreds of databases.
- *Verdict:* Rejected as premature over-engineering for the current phase.

### Alternative B: Schema/Collection-per-tenant
- *Pros:* Logical isolation within one database.
- *Cons:* Dynamic collection creation complicates Mongoose schema compilation, indexing overhead, high maintenance burden.
- *Verdict:* Rejected.

### Alternative C: Shared Database, Logical Partitioning with `organizationId` (Selected)
- *Pros:* High scalability, low infrastructure cost, standard Mongoose models, straightforward compound indexing, simple deployment and backups, seamless cross-tenant analytics for Super Admin.
- *Cons:* Requires rigorous backend developer discipline and automated middleware to guarantee tenant filtering on every query.

---

## 4. Consequences & Security Safeguards

- **Positive:** Rapid onboarding of new organizations without database provisioning delays; efficient resource utilization; single migration pipeline.
- **Negative:** Risk of accidental data leakage if an engineer writes a query omitting `organizationId`.
- **Mitigating Guardrails:**
  - Mandatory `tenant.middleware.js` to establish verified tenant context on every request.
  - Development rule explicitly forbidding client-provided `organizationId`.
  - Comprehensive integration tests validating cross-tenant isolation and unauthorized access prevention.
