# Placement Management System — Database Schema Specification

> **NOTICE: PLANNED SCHEMA — NOT IMPLEMENTED YET**
> The entities, attributes, relationships, and index definitions outlined in this document represent the planned MongoDB/Mongoose data model. No database connections, schemas, or models currently exist in the codebase.

---

## 1. Data Model Overview

The database design implements a **shared-database, logical-partitioning multi-tenant model**.
Every tenant-bound entity contains a mandatory `organizationId` reference.

All core database schemas contain an explicit database-level marker:
- `isTestData`: Boolean (default: `false`, indexed). Normal operational data defaults to `false`. Explicit test seed data sets `isTestData = true`.

```
┌─────────────────┐
│  Organization   │  (isTestData: false / true)
└────────┬────────┘
         │ 1:N
         ├───> User (PMO, Team Member)  (isTestData: false / true)
         ├───> Company  (isTestData: false / true)
         │       │ 1:N
         │       ├───> Contact (HR / Recruiter)  (isTestData: false / true)
         │       ├───> Assignment (Team Member)  (isTestData: false / true)
         │       ├───> Interaction (Call / Email / Meeting)  (isTestData: false / true)
         │       │       └───> FollowUp  (isTestData: false / true)
         │       └───> JobOpportunity  (isTestData: false / true)
         │               └───> Document (JD)  (isTestData: false / true)
         ├───> Document (Shared Files)  (isTestData: false / true)
         └───> AuditLog  (isTestData: false / true)
```

---

## 2. Implemented Entities

### 2.1 `Organization` [IMPLEMENTED]
- **Purpose:** Represents an educational institution (college, university, educational trust) using the platform.
- **Organization Ownership:** Root tenant boundary entity.
- **Important Fields:**
  - `_id`: ObjectId (Primary Key)
  - `name`: String (required, trimmed, 2-150 chars)
  - `code`: String (required, unique, uppercase, trimmed, alphanumeric, 2-20 chars, e.g. "APEX")
  - `email`: String (required, lowercase, trimmed, validated email)
  - `phone`: String (optional, trimmed)
  - `address`: Mixed / Object (optional address details)
  - `status`: String (enum: `ACTIVE`, `INACTIVE`; default: `ACTIVE`)
  - `createdAt`: Date (auto-managed via timestamps)
  - `updatedAt`: Date (auto-managed via timestamps)
- **Implemented Indexes:**
  - `{ code: 1 }` (unique)
  - `{ status: 1 }`
  - `{ name: 1 }`

---

### 2.2 `User` [IMPLEMENTED]
- **Purpose:** System users across all operational levels (Super Admin, PMO, Team Member).
- **Organization Ownership:**
  - For `PMO` and `TEAM_MEMBER`: strictly belongs to an `organizationId` (required, validated).
  - For `SUPER_ADMIN`: `organizationId` is strictly `null` (global platform scope).
- **Important Fields:**
  - `_id`: ObjectId
  - `organizationId`: ObjectId (ref: `Organization`, null for Super Admin, required for PMO/Team Member)
  - `name`: String (required, trimmed, 2-100 chars)
  - `email`: String (required, unique, lowercase, trimmed, validated email)
  - `passwordHash`: String (required, bcrypt 12-round salt, excluded by default in queries and JSON)
  - `role`: String (enum: `SUPER_ADMIN`, `PMO`, `TEAM_MEMBER`, required)
  - `phone`: String (optional, trimmed)
  - `status`: String (enum: `ACTIVE`, `INACTIVE`; default: `ACTIVE`)
  - `lastLoginAt`: Date (optional, updated on successful login)
  - `tokenVersion`: Number (default: 0, for instant session invalidation)
  - `createdAt`: Date
  - `updatedAt`: Date
- **Implemented Indexes:**
  - `{ email: 1 }` (unique)
  - `{ organizationId: 1, role: 1 }`
  - `{ organizationId: 1, status: 1 }`
  - `{ organizationId: 1, role: 1, status: 1 }` (compound index for fast PMO team member status queries)
  - `{ role: 1 }`
  - `{ status: 1 }`
- **Instance Methods:**
  - `comparePassword(candidatePassword)`: Compares candidate password with stored bcrypt hash.
- **Static Methods:**
  - `hashPassword(plainPassword)`: Generates 12-round bcrypt hash.

---

### 2.3 `AuditLog` [IMPLEMENTED & ENHANCED]
- **Purpose:** Immutable audit record of platform administrative mutations, organization lifecycle changes, user provisioning, corporate outreach actions, job opportunity management, and entity mutations.
- **Organization Ownership:** References `Organization._id` (nullable for Super Admin platform-wide actions).
- **Important Fields:**
  - `_id`: ObjectId (Primary Key)
  - `organizationId`: ObjectId (ref: `Organization`, nullable)
  - `performedBy`: ObjectId (ref: `User`, required, authenticated actor)
  - `action`: String (required, uppercase, e.g. `ORGANIZATION_CREATED`, `ORGANIZATION_UPDATED`, `ORGANIZATION_STATUS_CHANGED`, `PMO_CREATED`, `PMO_UPDATED`, `PMO_STATUS_CHANGED`, `TEAM_MEMBER_CREATED`, `TEAM_MEMBER_UPDATED`, `TEAM_MEMBER_STATUS_CHANGED`, `COMPANY_CREATED`, `COMPANY_UPDATED`, `COMPANY_STATUS_CHANGED`, `COMPANY_IMPORT_STARTED`, `COMPANY_IMPORT_COMPLETED`, `COMPANY_ASSIGNED`, `COMPANY_REASSIGNED`, `COMPANY_UNASSIGNED`, `INTERACTION_CREATED`, `INTERACTION_UPDATED`, `FOLLOW_UP_CREATED`, `FOLLOW_UP_COMPLETED`, `FOLLOW_UP_CANCELLED`, `OPPORTUNITY_CREATED`, `OPPORTUNITY_UPDATED`, `OPPORTUNITY_STATUS_CHANGED`, `OPPORTUNITY_SHORTLISTED`, `OPPORTUNITY_UNSHORTLISTED`, `PMO_REVIEW_NOTE_UPDATED`, `JD_UPLOADED`, `JD_REPLACED`, `JD_DELETED`)
  - `entityType`: String (required, e.g. `Organization`, `User`, `Company`, `Assignment`, `Interaction`, `FollowUp`, `JobOpportunity`, `Document`)
  - `entityId`: ObjectId (optional target entity ID)
  - `oldValue`: Mixed / Object (sanitized pre-mutation diff snapshot)
  - `newValue`: Mixed / Object (sanitized post-mutation diff snapshot)
  - `metadata`: Mixed / Object (supplemental details, title, file names, counters)
  - `timestamp`: Date (default: `Date.now`)
- **Virtual Aliases:** `entity` (alias for `entityType`), `userId` (alias for `performedBy`).
- **Implemented Indexes:**
  - `{ organizationId: 1, timestamp: -1 }`
  - `{ action: 1 }`
  - `{ performedBy: 1, timestamp: -1 }`
  - `{ entityType: 1, timestamp: -1 }`
  - `{ entityId: 1, timestamp: -1 }`
  - `{ timestamp: -1 }`
- **Retention Strategy:** Retention policy is not yet automated; full immutable audit history is preserved for complete compliance and security traceability.

---

### 2.4 `Company` [IMPLEMENTED]
- **Purpose:** Central master record of an employer or corporate recruitment partner.
- **Organization Ownership:** Scoped strictly to `organizationId`. Each organization maintains its own isolated master company database.
- **Relationships:** References `Organization._id`, `User._id` (createdBy, updatedBy). Has many Contacts. Parent for future Assignments, Interactions, FollowUps, and JobOpportunities.
- **Important Fields:**
  - `_id`: ObjectId (Primary Key)
  - `organizationId`: ObjectId (ref: `Organization`, required)
  - `companyName`: String (required, trimmed, max 150 chars)
  - `normalizedName`: String (required, trimmed, lowercase, stripped punctuation for deterministic duplicate detection)
  - `industry`: String (optional, trimmed, max 100 chars)
  - `website`: String (optional, trimmed, lowercase)
  - `linkedin`: String (optional, trimmed)
  - `country`: String (default: "India")
  - `state`: String (optional)
  - `city`: String (optional)
  - `location`: String (optional, campus location/address)
  - `remarks`: String (optional, placement cell notes)
  - `status`: String (enum: `ACTIVE`, `INACTIVE`; default: `ACTIVE`)
  - `source`: String (enum: `MANUAL_PMO`, `BULK_IMPORT`, `TEAM_MEMBER_SELF_ADDED`, `OTHER`; default: `MANUAL_PMO`)
  - `isTestData`: Boolean (default: false, index: true — safe test data isolation tag)
  - `createdBy`: ObjectId (ref: `User`, required)
  - `updatedBy`: ObjectId (ref: `User`, default: null)
  - `createdAt`: Date (timestamp)
  - `updatedAt`: Date (timestamp)
- **Implemented Indexes:**
  - `{ organizationId: 1, normalizedName: 1 }` (unique: true — tenant-scoped duplicate name prevention)
  - `{ organizationId: 1, status: 1 }`
  - `{ organizationId: 1, industry: 1 }`
  - `{ organizationId: 1, city: 1 }`

---

### 2.5 `Contact` [IMPLEMENTED]
- **Purpose:** Corporate recruiters, HR managers, and talent acquisition contacts for an employer.
- **Organization Ownership:** Scoped strictly to `organizationId` and bound to `companyId`.
- **Important Fields:**
  - `_id`: ObjectId (Primary Key)
  - `organizationId`: ObjectId (ref: `Organization`, required)
  - `companyId`: ObjectId (ref: `Company`, required)
  - `name`: String (required, max 100 chars)
  - `designation`: String (optional)
  - `email`: String (optional, lowercase)
  - `phone`: String (optional)
  - `linkedin`: String (optional)
  - `isPrimary`: Boolean (default: false)
  - `createdAt`: Date
  - `updatedAt`: Date
- **Implemented Indexes:**
  - `{ organizationId: 1, companyId: 1 }`
  - `{ companyId: 1, isPrimary: 1 }`

---

### 2.7 `Assignment` [IMPLEMENTED]
- **Purpose:** Records the allocation of a company to a specific operational team member for corporate outreach. Enforces single active assignment per company while maintaining complete historical lineage.
- **Organization Ownership:** Scoped strictly to `organizationId`.
- **Important Fields:**
  - `_id`: ObjectId (Primary Key)
  - `organizationId`: ObjectId (ref: `Organization`, required)
  - `companyId`: ObjectId (ref: `Company`, required)
  - `assignedTo`: ObjectId (ref: `User`, required, Team Member)
  - `assignedBy`: ObjectId (ref: `User`, required, PMO)
  - `assignedAt`: Date (default: `Date.now`)
  - `unassignedAt`: Date (default: `null`, set when reassigned or unassigned)
  - `status`: String (enum: `ACTIVE`, `ENDED`; default: `ACTIVE`)
  - `source`: String (enum: `PMO_ASSIGNED`, `BULK_IMPORT`, `TEAM_MEMBER_SELF_ADDED`, `OTHER`; default: `PMO_ASSIGNED`)
  - `isTestData`: Boolean (default: false, index: true)
  - `notes`: String (optional instructions from PMO, max 500 chars)
  - `createdAt`: Date
  - `updatedAt`: Date
- **Implemented Indexes:**
  - `{ organizationId: 1, companyId: 1, status: 1 }` (unique: true, partialFilterExpression: { status: 'ACTIVE' } — database-level single active owner constraint)
  - `{ organizationId: 1, assignedTo: 1, status: 1 }`
  - `{ companyId: 1, status: 1 }`

---

### 2.8 `Interaction` [IMPLEMENTED]
- **Purpose:** Logs corporate outreach phone calls, recruiter conversation notes, outcomes, and quick hiring questionnaires.
- **Organization Ownership:** Scoped strictly to `organizationId`.
- **Relationships:** References `Organization._id`, `Company._id`, `Contact._id` (optional), and `User._id` (conductedBy).
- **Important Fields:**
  - `_id`: ObjectId (Primary Key)
  - `organizationId`: ObjectId (ref: `Organization`, required)
  - `companyId`: ObjectId (ref: `Company`, required)
  - `contactId`: ObjectId (ref: `Contact`, default: null)
  - `userId`: ObjectId (ref: `User`, required, Team Member)
  - `interactionType`: String (enum: `PHONE_CALL`, `EMAIL`, `MEETING`; default: `PHONE_CALL`)
  - `outcome`: String (enum: `HIRING_NOW`, `HIRING_PLANNED`, `NOT_HIRING`, `NOT_SURE`, `WAITING_FOR_JD`, `FOLLOW_UP_REQUIRED`, `NO_RESPONSE`)
  - `notes`: String (HR conversation summary & notes)
  - `interactionDate`: Date (default: `Date.now`)
  - `nextAction`: String (enum: `FOLLOW_UP`, `WAITING_FOR_JD`, `NO_ACTION`, `OTHER`)
  - `followUpDate`: Date (optional, default: null)
  - `callDetails`: Object (`hiringStatus`, `profiles`, `candidateType`, `openings`, `opportunityType`, `ppoAvailable`, `location`, `workMode`, `salaryOrStipend`, `bond`, `specificRequirement`, `hrResponse`)
  - `createdAt`: Date
  - `updatedAt`: Date
- **Implemented Indexes:**
  - `{ organizationId: 1, companyId: 1, interactionDate: -1 }`
  - `{ organizationId: 1, userId: 1, interactionDate: -1 }`
  - `{ organizationId: 1, outcome: 1 }`

---

### 2.9 `FollowUp` [IMPLEMENTED]
- **Purpose:** Tracks scheduled callbacks and action items resulting from outreach interactions.
- **Organization Ownership:** Scoped strictly to `organizationId`.
- **Relationships:** References `Organization._id`, `Company._id`, `Interaction._id` (optional), and `User._id` (assigned user).
- **Important Fields:**
  - `_id`: ObjectId (Primary Key)
  - `organizationId`: ObjectId (ref: `Organization`, required)
  - `companyId`: ObjectId (ref: `Company`, required)
  - `assignedTo`: ObjectId (ref: `User`, required, Team Member)
  - `interactionId`: ObjectId (ref: `Interaction`, optional)
  - `dueDate`: Date (required)
  - `reason`: String (trimmed note)
  - `status`: String (enum: `PENDING`, `COMPLETED`, `CANCELLED`; default: `PENDING`)
  - `notes`: String
  - `createdAt`: Date
  - `updatedAt`: Date
- **Implemented Indexes:**
  - `{ organizationId: 1, assignedTo: 1, dueDate: 1, status: 1 }`
  - `{ organizationId: 1, companyId: 1, dueDate: 1 }`

---

## 3. Planned Entities (Not Implemented Yet)

### 3.1 `Company`
- **Purpose:** Master record of a recruiting corporation or prospective employer.
- **Organization Ownership:** Scoped to `organizationId`.
- **Relationships:** References `Organization._id`. Has many Contacts, Assignments, Interactions, and JobOpportunities.
- **Important Fields:**
  - `_id`: ObjectId
  - `organizationId`: ObjectId (ref: `Organization`, required)
  - `name`: String (required, e.g., "Acme Corp")
  - `normalizedName`: String (required, for duplicate detection, e.g., "acmecorp")
  - `website`: String (optional)
  - `industry`: String (e.g., "Information Technology", "Banking", "Manufacturing")
  - `location`: Object (city, state, country)
  - `tier`: String (enum: `Tier 1`, `Tier 2`, `Tier 3`, `Unclassified`; default: `Unclassified`)
  - `status`: String (enum: `New`, `Assigned`, `Contacted`, `Interested`, `Not Interested`, `Blacklisted`; default: `New`)
  - `source`: String (enum: `Manual`, `Bulk Import`, `Referral`)
  - `importBatchId`: String (optional, tracks bulk import provenance)
  - `createdAt`: Date
  - `updatedAt`: Date
- **Planned Indexes:**
  - `{ organizationId: 1, normalizedName: 1 }` (duplicate prevention per tenant)
  - `{ organizationId: 1, status: 1 }`
  - `{ organizationId: 1, industry: 1 }`

---

### 2.4 `Contact`
- **Purpose:** Individual recruiters, HR managers, and corporate contacts associated with a company.
- **Organization Ownership:** Scoped to `organizationId`.
- **Relationships:** References `Organization._id` and `Company._id`.
- **Important Fields:**
  - `_id`: ObjectId
  - `organizationId`: ObjectId (ref: `Organization`, required)
  - `companyId`: ObjectId (ref: `Company`, required)
  - `name`: String (required)
  - `designation`: String (e.g., "Head of Campus Talent")
  - `email`: String (optional)
  - `phone`: String (optional)
  - `linkedinUrl`: String (optional)
  - `isPrimary`: Boolean (default: false)
  - `createdAt`: Date
  - `updatedAt`: Date
- **Planned Indexes:**
  - `{ organizationId: 1, companyId: 1 }`
  - `{ organizationId: 1, email: 1 }`

---

### 2.5 `Assignment`
- **Purpose:** Records the allocation of a company to a specific placement team member for outreach.
- **Organization Ownership:** Scoped to `organizationId`.
- **Relationships:** References `Organization._id`, `Company._id`, and `User._id` (assignee and assignor).
- **Important Fields:**
  - `_id`: ObjectId
  - `organizationId`: ObjectId (ref: `Organization`, required)
  - `companyId`: ObjectId (ref: `Company`, required)
  - `assignedTo`: ObjectId (ref: `User`, required, Team Member)
  - `assignedBy`: ObjectId (ref: `User`, required, PMO)
  - `assignedAt`: Date (default: Date.now)
  - `status`: String (enum: `Active`, `Reassigned`, `Completed`; default: `Active`)
  - `notes`: String (optional instructions from PMO)
- **Planned Indexes:**
  - `{ organizationId: 1, companyId: 1, status: 1 }`
  - `{ organizationId: 1, assignedTo: 1, status: 1 }`

---

### 2.6 `Interaction`
- **Purpose:** Logs outreach touchpoints (phone calls, emails, video meetings) between team members and company representatives.
- **Organization Ownership:** Scoped to `organizationId`.
- **Relationships:** References `Organization._id`, `Company._id`, `Contact._id` (optional), and `User._id` (team member).
- **Important Fields:**
  - `_id`: ObjectId
  - `organizationId`: ObjectId (ref: `Organization`, required)
  - `companyId`: ObjectId (ref: `Company`, required)
  - `contactId`: ObjectId (ref: `Contact`, optional)
  - `conductedBy`: ObjectId (ref: `User`, required)
  - `type`: String (enum: `Phone Call`, `Email`, `Virtual Meeting`, `In-Person Meeting`; default: `Phone Call`)
  - `outcome`: String (enum: `Hiring - JD Expected`, `Hiring - Opportunity Captured`, `Follow-up Required`, `Not Hiring This Year`, `Wrong Contact / Invalid Number`, `No Response / Left Voicemail`)
  - `quickNotes`: String (rapid summary notes captured during the call)
  - `conductedAt`: Date (default: Date.now)
  - `createdAt`: Date
- **Planned Indexes:**
  - `{ organizationId: 1, companyId: 1, conductedAt: -1 }`
  - `{ organizationId: 1, conductedBy: 1, conductedAt: -1 }`

---

### 2.7 `FollowUp`
- **Purpose:** Tracks scheduled callbacks and action items resulting from outreach interactions.
- **Organization Ownership:** Scoped to `organizationId`.
- **Relationships:** References `Organization._id`, `Company._id`, `Interaction._id`, and `User._id` (assigned user).
- **Important Fields:**
  - `_id`: ObjectId
  - `organizationId`: ObjectId (ref: `Organization`, required)
  - `companyId`: ObjectId (ref: `Company`, required)
  - `interactionId`: ObjectId (ref: `Interaction`, optional)
  - `assignedTo`: ObjectId (ref: `User`, required)
  - `scheduledDate`: Date (required)
  - `reminderNote`: String (required)
  - `status`: String (enum: `Pending`, `Completed`, `Overdue`, `Cancelled`; default: `Pending`)
  - `completedAt`: Date (optional)
- **Planned Indexes:**
  - `{ organizationId: 1, assignedTo: 1, scheduledDate: 1, status: 1 }`
  - `{ organizationId: 1, scheduledDate: 1, status: 1 }`

---

---

### 2.8 `JobOpportunity` [IMPLEMENTED]
- **Purpose:** Captures concrete hiring requirements, job openings, compensation, and internship prospects received from an employer.
- **Organization Ownership:** Scoped to `organizationId`.
- **Relationships:** References `Organization._id`, `Company._id`, `User._id` (createdBy, updatedBy), `Document._id` (jdDocumentId), and `Interaction._id` (interactionId).
- **Important Fields:**
  - `_id`: ObjectId
  - `organizationId`: ObjectId (ref: `Organization`, required)
  - `companyId`: ObjectId (ref: `Company`, required)
  - `title`: String (required, trimmed, 2-150 chars)
  - `opportunityType`: String (enum: `FULL_TIME`, `INTERNSHIP`, `INTERNSHIP_PPO`, `MULTIPLE`, required)
  - `candidateType`: String (enum: `FRESHERS`, `EXPERIENCED`, `BOTH`, required)
  - `openings`: String (optional, e.g. "10", "Approx 15")
  - `location`: String (optional, e.g. "Bangalore, Remote")
  - `workMode`: String (enum: `ON_SITE`, `HYBRID`, `REMOTE`, '')
  - `salary`: String (optional, e.g. "₹6–8 LPA")
  - `stipend`: String (optional, e.g. "₹15,000/month")
  - `bond`: String (optional, e.g. "1 Year")
  - `specialRequirement`: String (optional criteria)
  - `hiringStatus`: String (enum: `HIRING_NOW`, `HIRING_PLANNED`, `NOT_HIRING`, `ON_HOLD`, `CLOSED`; default: `HIRING_NOW`)
  - `source`: String (enum: `HR_CALL`, `HR_EMAIL`, `HR_WHATSAPP`, `LINKEDIN`, `WEBSITE`, `REFERRAL`, `MANUAL`, `OTHER`; default: `MANUAL`)
  - `interactionId`: ObjectId (ref: `Interaction`, optional)
  - `jdDocumentId`: ObjectId (ref: `Document`, optional)
  - `isShortlisted`: Boolean (default: false)
  - `shortlistedAt`: Date (default: null)
  - `shortlistedBy`: ObjectId (ref: `User`, default: null)
  - `pmoReviewNote`: String (trim, default: '')
  - `createdBy`: ObjectId (ref: `User`, required)
  - `updatedBy`: ObjectId (ref: `User`, default: null)
  - `createdAt`: Date
  - `updatedAt`: Date
- **Implemented Indexes:**
  - `{ organizationId: 1, hiringStatus: 1 }`
  - `{ organizationId: 1, companyId: 1 }`
  - `{ organizationId: 1, opportunityType: 1 }`
  - `{ organizationId: 1, isShortlisted: 1 }`
  - `{ organizationId: 1, hiringStatus: 1, isShortlisted: 1 }`
  - `{ organizationId: 1, createdAt: -1 }`

---

### 2.9 `Document` [IMPLEMENTED]
- **Purpose:** Stores metadata for uploaded corporate documents, such as Job Descriptions (JD), brochures, and placement MOUs.
- **Organization Ownership:** Scoped to `organizationId`.
- **Relationships:** References `Organization._id`, `Company._id`, `JobOpportunity._id` (optional), and `User._id` (uploadedBy).
- **Important Fields:**
  - `_id`: ObjectId
  - `organizationId`: ObjectId (ref: `Organization`, required)
  - `companyId`: ObjectId (ref: `Company`, required)
  - `opportunityId`: ObjectId (ref: `JobOpportunity`, optional)
  - `uploadedBy`: ObjectId (ref: `User`, required)
  - `originalFileName`: String (required)
  - `mimeType`: String (required)
  - `fileSize`: Number (in bytes)
  - `storageKey`: String (required, object storage path)
  - `storageProvider`: String (enum: `LOCAL`, `CLOUDFLARE_R2`, `S3`; default: `LOCAL`)
  - `documentType`: String (enum: `JOB_DESCRIPTION`, `COMPANY_BROCHURE`, `MOU`, `OTHER`; default: `JOB_DESCRIPTION`)
  - `createdAt`: Date
  - `updatedAt`: Date
- **Implemented Indexes:**
  - `{ organizationId: 1, companyId: 1 }`
  - `{ organizationId: 1, storageKey: 1 }`
  - `{ opportunityId: 1 }`

---

### 2.10 `AuditLog`
- **Purpose:** Immutable audit record of critical system activities, data changes, and authentication events.
- **Organization Ownership:** Scoped to `organizationId` (or null for platform-wide Super Admin events).
- **Relationships:** References `Organization._id` and `User._id`.
- **Important Fields:**
  - `_id`: ObjectId
  - `organizationId`: ObjectId (ref: `Organization`, nullable for Super Admin actions)
  - `performedBy`: ObjectId (ref: `User`, required)
  - `action`: String (required, e.g., `COMPANY_IMPORT`, `USER_INVITED`, `OPPORTUNITY_SHORTLISTED`, `ROLE_CHANGED`)
  - `entityType`: String (required, e.g., `Company`, `JobOpportunity`, `User`)
  - `entityId`: ObjectId (optional)
  - `metadata`: Object (diff snapshot, IP address, user agent)
  - `timestamp`: Date (default: Date.now)
- **Implemented Indexes:**
  - `{ organizationId: 1, timestamp: -1 }`
  - `{ organizationId: 1, action: 1 }`
  - `{ performedBy: 1, timestamp: -1 }`

---

### 2.11 `Notification` [IMPLEMENTED]
- **Purpose:** In-app operational alerts, task follow-up reminders, assignment notices, and shortlist updates.
- **Organization & Recipient Scope:** Scoped strictly to `organizationId` and `recipientId`.
- **Relationships:** References `Organization._id`, `User._id` (recipientId), and generic entity ID (entityId).
- **Important Fields:**
  - `_id`: ObjectId
  - `organizationId`: ObjectId (ref: `Organization`, required)
  - `recipientId`: ObjectId (ref: `User`, required)
  - `type`: String (enum: `FOLLOW_UP_DUE`, `FOLLOW_UP_OVERDUE`, `COMPANY_ASSIGNED`, `COMPANY_REASSIGNED`, `OPPORTUNITY_SHORTLISTED`, `JD_RECEIVED`, required)
  - `title`: String (required, max 120 chars)
  - `message`: String (required, max 500 chars)
  - `entity`: String (enum: `FollowUp`, `Company`, `JobOpportunity`, `Assignment`, `System`, required)
  - `entityId`: ObjectId (optional reference ID)
  - `isRead`: Boolean (default: false)
  - `readAt`: Date (default: null)
  - `metadata`: Object (extra context like companyName, jobTitle)
  - `deduplicationKey`: String (optional, sparse unique index for reminder deduplication)
  - `createdAt`: Date
  - `updatedAt`: Date
- **Implemented Indexes:**
  - `{ organizationId: 1, recipientId: 1, isRead: 1, createdAt: -1 }`
  - `{ deduplicationKey: 1 }` (unique: true, sparse: true)

---

### 2.12 `JobRole` [IMPLEMENTED]
- **Purpose:** Organization-specific master list of job roles managed by PMO for structured HR call feedback and profiles.
- **Organization Ownership:** Scoped strictly to `organizationId`.
- **Relationships:** References `Organization._id`, `User._id` (createdBy, updatedBy).
- **Important Fields:**
  - `_id`: ObjectId
  - `organizationId`: ObjectId (ref: `Organization`, required)
  - `name`: String (required, trimmed, 2-100 chars, e.g., "Fullstack React Developer")
  - `normalizedName`: String (required, lowercase trimmed name used for compound unique index)
  - `description`: String (optional, max 500 chars)
  - `status`: String (enum: `ACTIVE`, `INACTIVE`; default: `ACTIVE`)
  - `createdBy`: ObjectId (ref: `User`, required)
  - `updatedBy`: ObjectId (ref: `User`, required)
  - `isTestData`: Boolean (default: false)
  - `createdAt`: Date
  - `updatedAt`: Date
- **Implemented Indexes:**
  - `{ organizationId: 1, normalizedName: 1 }` (unique: true)
  - `{ organizationId: 1, status: 1 }`


