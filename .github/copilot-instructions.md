# Copilot Project Instructions (Claude-style workflow)

These instructions apply to all chat and code generation in this repository.

## Source of truth

- Read and follow `CLAUDE.md` first.
- Treat `.claude/CONSTITUTION.md` (loaded through scripts) as normative.
- Review `.claude/KNOWLEDGE.md` before proposing changes.

## Startup checklist (minimal context)

Run these commands before code changes:

```bash
bash .claude/scripts/constitution-index.sh
bash .claude/scripts/art.sh 3
bash .claude/scripts/art.sh 14
bash .claude/scripts/active-task.sh
bash .claude/scripts/fetch.sh STATE.md
bash .claude/scripts/fetch.sh PLAN.md
```

Load only the specific extra articles or sections needed for the task.

## Workflow contract

- Do not modify `src/` unless the user explicitly requests implementation (equivalent to `/implement`).
- During analysis or planning, write only under `.claude/tasks/<TASK-ID>/`.
- Keep changes small and aligned to one plan step at a time.
- Do not bypass quality gates.

## Architecture and quality

- Respect dependency flow:
  - `pages -> components -> hooks -> infrastructure`
  - `hooks` may import from `domain` and `infrastructure`
  - `domain` stays pure (no framework or external service imports)
- Before declaring a task done, run:
  - `pnpm run type-check`
  - `pnpm run lint`
  - `pnpm run test:run`

## Git hygiene

- Follow commit format from Constitution Art. 8:
  - `type(scope): imperative message in English`
- Avoid destructive git commands unless explicitly requested by the user.

## Priority when instructions conflict

1. Direct user request
2. `CLAUDE.md` and `.claude/CONSTITUTION.md`
3. This file
