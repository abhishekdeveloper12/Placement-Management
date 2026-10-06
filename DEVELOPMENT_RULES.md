# Placement Management System — Development Rules

This document defines the strict engineering standards, security constraints, and coding practices for all engineers and AI agents working on this repository.

---

## 1. Codebase Integrity & Discipline

1. **Inspect Existing Code First:** Always inspect and understand existing files and utilities before writing new code.
2. **Preserve Working Functionality:** Never rewrite or refactor working code unless explicitly requested or directly required for the current task.
3. **Avoid Duplication (DRY):** Never create duplicate components, services, helper functions, or models if reusable abstractions already exist.
4. **Justify External Dependencies:** Do not introduce new third-party libraries or npm packages without clear technical justification.
5. **Architectural Consistency:** Do not deviate from the established layered architecture without documenting the reason and updating [ARCHITECTURE.md](ARCHITECTURE.md).
6. **No Silent Deletions:** Never silently remove or bypass existing features, security checks, or test cases.
7. **Keep Complexity Minimal (KISS):** Do not over-engineer solutions or create premature abstractions. Build strictly what the current milestone requires.
8. **No Fake Production Data:** Do not create fake or hardcoded mock datasets in production paths unless explicitly requested for seed or demonstration scripts.
9. **Zero Broken Builds:** Run relevant validation, linting, build, or test checks after changes. Fix any errors introduced by the current task before finishing.
10. **Synchronize Documentation:** Whenever an implementation alters data structures, endpoints, or workflows, immediately update [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [API_CONTRACTS.md](API_CONTRACTS.md), and [DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md).

---

## 2. Security & Multi-Tenancy Guardrails

11. **No Hardcoded Secrets:** Never hardcode credentials, API tokens, JWT secrets, database connection strings, or keys in source code. Always use environment variables.
12. **No Hardcoded Identifiers:** Never hardcode user IDs, organization IDs, role strings, or entity IDs in application code or tests.
13. **NEVER Trust Client-Supplied `organizationId`:**
    - For `PMO` and `TEAM_MEMBER`, the `organizationId` **must always** be derived server-side from the authenticated, cryptographically signed token / session.
    - Any `organizationId` parameter sent in client query strings, request bodies, or headers for tenant-scoped operations must be ignored or explicitly validated against the token claim.
14. **Backend Enforces Tenant Isolation:** Never rely on frontend filtering to isolate tenant data. All database queries for tenant operations must explicitly include `{ organizationId }`.
15. **Backend Enforces Role-Based Authorization:** Every private API route must pass through an authentication middleware and a role-guard middleware before invoking controller logic.
16. **Assignment Isolation for Team Members:** Team members must only access companies, interactions, and opportunities explicitly assigned to them or created by them within their organization, unless specific team-level visibility is granted by PMO configuration.
17. **Input Sanitization & Validation:** All incoming API request payloads (`body`, `query`, `params`) must be validated against strict schemas (e.g., Zod, express-validator) before reaching business logic.
18. **Safe Error Handling:** Catch and handle all exceptions cleanly. Never leak internal database stack traces, connection strings, or sensitive environment details in HTTP error responses.

---

## 3. Backend Architectural Standards

19. **Strict Layering Pattern:**
    ```
    Routes  ──>  Middleware  ──>  Controllers  ──>  Services  ──>  Models / DB
    ```
20. **Thin Controllers:**
    - Controllers are only responsible for extracting request data, calling the appropriate service, and sending back formatted HTTP responses.
    - Controllers must contain **zero direct database queries** and **zero business logic**.
21. **Thick Services:**
    - All business rules, transactions, orchestration, and business validations reside in the `services/` directory.
    - Services are modular, testable, and independent of HTTP request/response objects (`req`, `res`).
22. **Isolated Database Access:**
    - Direct Mongoose schema operations should be confined to services or dedicated repository layers.
    - Soft-deletion strategies and tenant scoping hooks must be respected.
23. **Uniform API Responses:** All REST responses must conform to a predictable response envelope:
    ```json
    {
      "success": true,
      "data": {},
      "message": "Optional user-friendly message",
      "meta": { "page": 1, "limit": 25, "total": 100 }
    }
    ```
    And for errors:
    ```json
    {
      "success": false,
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Human-readable description",
        "details": []
      }
    }
    ```

---

## 4. Frontend Architectural Standards

24. **No Business Logic in Views:** React presentational components should focus purely on UI rendering. Complex transformation logic, side-effects, and API calls belong in custom hooks, Redux thunks, or service modules.
25. **Component Reusability:** Build and reuse atomic UI components (Buttons, Modals, Inputs, Data Tables, Badges, Dropdowns) located in `src/components/common/`.
26. **Complete State Lifecycle Handling:** Every data-fetching UI view must gracefully handle four distinct states:
    - **Loading:** Skeletons or spinners.
    - **Empty:** Helpful empty states with actionable next steps.
    - **Error:** Clear, non-technical feedback with retry mechanisms.
    - **Success:** Responsive, clean presentation of data.
27. **Frictionless Call Logging:** The UI workflow for Team Members logging company calls must prioritize speed:
    - Minimize required fields during active calling.
    - Provide rapid keyboard shortcuts or quick-select tags (e.g., "Interested", "Follow-up Needed", "Wrong Number", "Not Hiring").
    - Defer detailed requirement gathering to the JD upload / opportunity review step.

---

## 5. Documentation & Change Management

28. **Database Schema Governance:** Any change to Mongoose models or collections requires updating [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) prior to merging.
29. **API Contract Governance:** Any new endpoint or change in request/response format requires updating [API_CONTRACTS.md](API_CONTRACTS.md).
30. **Architecture Decision Records (ADRs):** Significant architectural or design choices (e.g., auth mechanism, caching strategy, queueing system, file storage abstraction) must be formally recorded in `docs/decisions/` with context, alternatives considered, and consequences.
31. **Mandatory Mutation Audit Events:** Important business mutations (create, update, status toggle, assign, shortlist, document upload) must produce appropriate audit events via `AuditService` containing sanitized diff snapshots (`oldValue` and `newValue`). Credentials, passwords, secrets, and JWT tokens must never be recorded.
