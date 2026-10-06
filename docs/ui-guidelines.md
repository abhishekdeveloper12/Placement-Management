# UI & UX Design Guidelines

This document outlines the user interface and user experience design principles for the Placement Management System.

---

## 1. Design Direction & Product Feel

The application must feel like a modern, professional, high-performance **B2B SaaS product** (akin to modern CRM and enterprise productivity tools like Linear, Stripe Dashboard, or HubSpot).

### Core Principles
- **Clean & Focused:** Minimalist aesthetic with purposeful whitespace. Avoid decorative clutter, unnecessary illustrations, or distracting animations.
- **Data-Oriented:** Optimized for reading, filtering, and acting on structured datasets (company directories, outreach logs, opportunities).
- **Clear Information Hierarchy:** Strong typography sizing, intentional contrast, and predictable placement of actions.
- **Fast Workflows:** Low-latency interactions, keyboard-friendly navigation, quick-select buttons, and optimistic UI updates.
- **Robust Table & Filter Experience:** Dense, readable tables with sticky headers, multi-criteria filtering, column sorting, search debounce, and batch selection.
- **Responsive & Accessible:** Fully responsive layout with WCAG AA compliant contrast, standard keyboard focus rings, and screen-reader accessible forms.
- **Consistent Visual Language:** Unified palette, border radiuses, typography, and spacing tokens driven by Tailwind CSS.

---

## 2. Color Palette & Styling Tokens

| Token | Class (Tailwind) | Usage |
| :--- | :--- | :--- |
| **Primary Brand** | `indigo-600` / `blue-600` | Primary call-to-actions, active navigation states, selected rows |
| **Background (App)** | `slate-50` / `gray-50` | Global page background |
| **Surface (Card/Modal)**| `white` (`dark:slate-900`) | Main containers, modal panels, table wrappers |
| **Border / Divider** | `slate-200` / `gray-200` | Table row dividers, card borders, input borders |
| **Text Primary** | `slate-900` / `gray-900` | Headings, high-emphasis table content, active labels |
| **Text Secondary** | `slate-500` / `gray-500` | Captions, timestamps, secondary metadata, table headers |
| **Success** | `emerald-600` (`bg-emerald-50`) | "Interested", "Shortlisted", active badges, confirmation toasts |
| **Warning** | `amber-600` (`bg-amber-50`) | "Follow-up Required", pending actions, approaching deadlines |
| **Danger** | `rose-600` (`bg-rose-50`) | "Not Interested", errors, deletions, overdue follow-ups |
| **Neutral / Inactive** | `slate-500` (`bg-slate-100`) | "Unassigned", draft states, archived items |

---

## 3. Critical UX Principle: Frictionless HR Call Logging

> **CRITICAL DIRECTIVE FOR TEAM MEMBER CALL WORKFLOW:**
> Corporate recruiters and HR executives are busy. Outreach phone calls often last under two minutes.
> 
> The UI must **NEVER** force the team member to navigate complex multi-step wizards or complete long questionnaires while on the phone.

### Golden Rules for the Call Logger:
1. **Immediate Accessibility:** The "Log Call" button must be accessible from anywhere in the company row or detail modal with 1 click or keyboard shortcut.
2. **One-Screen Low Friction:** All immediate call inputs must fit on a single, non-scrolling modal or slide-over drawer:
   - **Outcome Radio/Pill Buttons:** Large, easy-to-click pills (`Interested`, `Not Hiring`, `Follow-up Required`, `Invalid Number`).
   - **Quick Note Input:** A single auto-focused textarea for 1-2 sentence notes.
   - **Callback Picker:** Only displays when `Follow-up Required` is selected, defaulting to tomorrow at 11:00 AM.
3. **Decoupled Job Details:** Detailed requirements (compensation breakdowns, degree criteria, job descriptions) **must not** be demanded during the call.
   - The team member simply toggles `Hiring: Yes` and `JD Expected: Yes`.
   - Comprehensive opportunity details and JD parsing occur **after the call** via the Job Opportunity form.
4. **Keyboard Accelerators:** Support `Ctrl + Enter` (or `Cmd + Enter`) to save and return instantly to the calling queue.

---

## 4. Table & Data Grid Standards

1. **Sticky Header:** Table header remains pinned during scrolling.
2. **Inline Action Bar:** Quick action icons (Call, Email, Edit, Assign) visible on hover or persistent in a right-aligned actions column.
3. **Bulk Action Toolbar:** When one or more rows are selected via checkbox, a floating or anchored action bar emerges (e.g., "Assign 12 companies", "Change Status", "Export").
4. **State Feedback:**
   - **Loading State:** Skeleton table rows matching expected row height.
   - **Empty State:** Distinct illustration/icon with supportive guidance (e.g., "No companies assigned yet. Contact your PMO to allocate companies.").
   - **Search Zero State:** "No companies match the filter criteria. [Reset Filters]".

---

## 5. Form & Validation Patterns

- All forms must be built using `react-hook-form` with schema validation via `zod`.
- Error messages must appear directly beneath the erroneous input field with clear, actionable text.
- Submit buttons must automatically enter a disabled, spinning loading state during asynchronous API requests to prevent double-submission.
- Success notifications should use toast alerts that dismiss automatically after 3-4 seconds without interrupting workflow.
