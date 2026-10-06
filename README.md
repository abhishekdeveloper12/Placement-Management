# Placement Management System

A multi-tenant SaaS platform built for educational institutions and placement cells to orchestrate corporate outreach, streamline company management, and capture hiring opportunities efficiently.

---

## 1. Project Purpose & Scope

The **Placement Management System** enables educational organizations (universities, colleges, training institutes) to manage employer relationships, corporate outreach campaigns, and job opportunities across multiple operational tiers.

### Current Phase Focus: Corporate Outreach & Opportunity Intake (Phase 1)
Phase 1 focuses exclusively on the company-side placement workflow:
- Multi-tenant organization onboarding & management
- Role-based operational hierarchies (Super Admin, PMO, Team Members)
- Master company records and bulk import (CSV/Excel)
- Dynamic company assignment and outreach tracking
- Rapid HR call interaction capture (low-friction questionnaire)
- Job Description (JD) ingestion and opportunity creation
- PMO opportunity review, filtering, and shortlisting
- Team outreach performance metrics and analytics

> **Future Phase (Out of Scope for Phase 1):** Student directory, eligibility criteria, student job matching, student applications, placement drives, interview rounds, offers, and final placement records. These modules are intentionally decoupled and will be introduced in subsequent phases.

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React, Vite, JavaScript, Tailwind CSS, React Router, Redux Toolkit, React Hook Form, Zod, Recharts |
| **Backend** | Node.js, Express.js, JavaScript |
| **Database** | MongoDB, Mongoose ODM |
| **Authentication** | JWT-based authentication, bcrypt/Argon2 password hashing, secure refresh-token/session strategy |
| **File Storage** | Cloudflare R2 / S3-compatible Object Storage (*Architecture planned; implementation deferred*) |

---

## 3. High-Level Architecture Overview

The system is designed as a decoupled, multi-tenant web application:

- **Client (`client/`)**: Single Page Application (SPA) with role-tailored dashboards and modular layouts.
- **Server (`server/`)**: Express REST API structured in layers (`Routes → Controllers → Services → Models`) to keep controllers thin and encapsulate business logic.
- **Tenant Isolation**: Multi-tenancy is enforced at the database and service layer. Every organization-owned entity references its `organizationId`. For tenant-scoped roles (PMO, Team Member), the `organizationId` is derived exclusively from the authenticated server-side session token—never trusted from client payloads.
- **Global Administration**: The `SUPER_ADMIN` role possesses platform-wide governance to oversee tenant organizations and view cross-organizational analytics.

For in-depth architectural specifications, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 4. Development Setup (Placeholder)

> **Current Status:** Phase 0 (Project Initialization). Source code scaffolding and dependencies will be initialized in subsequent steps.

When ready for environment setup:
- Node.js (v18+ or LTS recommended)
- MongoDB instance (Local or Atlas)
- Configuration will use environment-specific `.env` files (e.g., `client/.env`, `server/.env`)

Detailed setup instructions will be updated upon environment initialization.

---

## 5. Project Documentation Map

This project maintains a living persistent context system for developers and AI agents:

| Document | Purpose |
| :--- | :--- |
| [README.md](README.md) | Entry point, overview, tech stack, and AI protocol |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Primary AI context file: current state, phase boundaries, milestones, and principles |
| [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) | Strict engineering rules, security guidelines, and architectural guardrails |
| [DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md) | Living status tracker of completed, in-progress, and planned modules |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Architectural blueprints, folder structures, auth, and multi-tenancy design |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Planned data entities, relationships, attributes, and index strategies |
| [API_CONTRACTS.md](API_CONTRACTS.md) | Planned REST endpoint groups and specifications |
| [docs/product-requirements.md](docs/product-requirements.md) | Comprehensive Phase 1 product specification |
| [docs/user-roles.md](docs/user-roles.md) | Role boundaries, permissions matrix, and access models |
| [docs/workflows.md](docs/workflows.md) | Detailed operational workflows across all user roles |
| [docs/ui-guidelines.md](docs/ui-guidelines.md) | Design philosophy, usability standards, and fast-call UX patterns |
| [docs/decisions/](docs/decisions/) | Architecture Decision Records (ADRs) |

---

## 6. AI DEVELOPMENT PROTOCOL

Before starting ANY future development task, any AI coding agent MUST follow this protocol:

1. **Read README.md** to refresh baseline system principles.
2. **Read PROJECT_CONTEXT.md completely** to understand current state, phase boundaries, and active milestones.
3. **Read DEVELOPMENT_RULES.md completely** and adhere strictly to all engineering constraints.
4. **Read DEVELOPMENT_PROGRESS.md completely** to verify what is implemented vs. not started.
5. **Read ARCHITECTURE.md completely** to maintain consistent structural patterns.
6. **Read relevant documentation under `docs/`** for the specific feature domain (e.g., `docs/workflows.md`, `docs/ui-guidelines.md`).
7. **Inspect the existing source code** related to the requested task. Do NOT rewrite or duplicate existing modules.
8. **Identify dependencies and possible impact** across frontend and backend boundaries.
9. **Create a short implementation plan** before writing code.
10. **Implement only the requested scope** — do not introduce premature optimizations or unrequested features.
11. **Run relevant validation/build/tests** to ensure zero regressions.
12. **Update project documentation** (e.g., `DEVELOPMENT_PROGRESS.md`, `API_CONTRACTS.md`, `DATABASE_SCHEMA.md`) whenever implementation changes require it.

> **CRITICAL DIRECTIVE:**
> The AI must **NOT** blindly read every source file for every task.
> It must read the global context documents first, and then inspect only the source files directly relevant to the current task.
