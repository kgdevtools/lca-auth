# Development Rules

**Updated:** April 9, 2026

---

1. UI/UX changes are allowed. Design consistency with the existing `/academy` UI must be maintained.

2. Do not run builds or dev servers. After edits, run `tsc --noEmit` only.

3. Multi-file edits are fine for small changes. Do not exceed ~300 lines of code added/changed in one go without flagging it first.

4. Prefer less code. Always consider whether existing code can be removed, reused, or simplified before adding anything new. No unnecessary abstractions, no speculative code.

5. Do not generalize or assume. Ask specific questions when something is unclear — this is a production codebase.

6. No enhancements beyond what was asked. No cleanup of surrounding untouched code(UNLESS FLAGGED AND REPORTED ANDAPPROVED FOR CLEANUP. No extra comments or docstrings.

7. **Daily session summaries.** At the start of each day and periodically throughout, remind the user to create or update the day's session summary. Summaries live in `.claude/sessions/` and follow the naming convention `YYYYMMDD_SESSION_SUMMARY.md` (e.g. `20260409_SESSION_SUMMARY.md`). Format: grouped by feature area, file-by-file, with an Outstanding section at the bottom.
