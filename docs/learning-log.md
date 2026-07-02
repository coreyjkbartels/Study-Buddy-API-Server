# Learning Log

Design decisions and lessons from working in this codebase.
Newest entries at the top.

<!-- Entries are appended by /log. Example entry:

## 2026-07-02 — Volunteer route assignment endpoint

- **Task:** add POST /routes/{id}/assign for coordinator assignment.
- **Decision:** assignment logic in a RouteAssignmentService; route handler stays thin.
- **Alternatives considered:** logic in the controller (faster now, untestable later); DB trigger (invisible business rules).
- **Lesson:** put decisions where they can be unit-tested; handlers translate HTTP, services decide. Pattern: thin controller / service layer.
- **Revisit:** service takes 4 params already — watch for it becoming a god object.
-->
