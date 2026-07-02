# Learning Log

Design decisions and lessons from working in this codebase.
Newest entries at the top.

## 2026-07-02 — Extract AssignmentUserState.findOrCreate

- **Task:** de-duplicate the "find-or-create a user's assignment state" logic copied across three assignment-router handlers.
- **Decision:** a single model static `AssignmentUserState.findOrCreate(...)` wrapping the atomic, unique-index-backed upsert; call it from all three sites, leave the list-view reshaping in the handlers.
- **Alternatives considered:** batch `findOrCreateMany` (rejected — optimizes an unmeasured N+1 and adds bulk-upsert error handling now); fold the response reshape into the static (rejected — the my-state caller needs the raw doc, so it'd force a flag param / two jobs); a new service layer (rejected — no service layer exists; forks the model-static convention for 4 lines).
- **Lesson:** an invariant the database enforces should have exactly one code path that writes it. The bug existed because three handlers wrote the (assignment, user) relationship and one had drifted to a non-atomic `findOne`→`create`; consolidating to one atomic writer removed the duplication *and* made the code agree with the unique index. When you see a `unique` index, count how many places create rows under it.
- **Revisit:** N+1 upsert loop in the two list endpoints left in place intentionally (unmeasured perf). Minor smells found while testing: POST create returns 200 not 201; PATCH checks field-validity before authorization (400 vs 403).

<!-- Entries are appended by /log. Example entry:

## 2026-07-02 — Volunteer route assignment endpoint

- **Task:** add POST /routes/{id}/assign for coordinator assignment.
- **Decision:** assignment logic in a RouteAssignmentService; route handler stays thin.
- **Alternatives considered:** logic in the controller (faster now, untestable later); DB trigger (invisible business rules).
- **Lesson:** put decisions where they can be unit-tested; handlers translate HTTP, services decide. Pattern: thin controller / service layer.
- **Revisit:** service takes 4 params already — watch for it becoming a god object.
-->
