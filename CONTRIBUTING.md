# Contributing

`main` is protected. You cannot push to it; every change is a pull request that passes CI and
gets one review.

## Daily flow

```bash
git switch main && git pull
git switch -c feat/matching-embeddings      # type/area-short-description
# ... work, commit small and often ...
make check                                  # same checks as CI
git push -u origin feat/matching-embeddings
gh pr create --fill                         # or use the GitHub UI
```

Then: get a teammate's approval, press **Update branch** if GitHub asks, and **Squash and merge**.
Keep PRs small (under about 300 lines). A small PR gets reviewed in minutes; a huge one waits.

## Rules

1. **Stay in your folder.** Ownership is in `.github/CODEOWNERS`. If you need a change in
   someone else's area, message them or open a small PR that they review.
2. **`backend/app/schemas.py` is the contract.** Add fields freely. If you change or remove
   one, update `frontend/lib/types.ts` in the same PR and announce it in the team chat.
3. **PR titles use Conventional Commits:** `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`,
   `refactor: ...`, `test: ...`, `ci: ...`. CI checks this.
4. **Never commit secrets.** `.env` files are git-ignored and CI fails if one is tracked.
   If a key leaks, rotate it immediately; deleting the commit is not enough.
5. **Add a test** for anything with logic. Backend tests are in `backend/tests/`.
6. **Review within a couple of hours.** Everyone is blocked on reviews, so do them quickly.
   Approve when it is correct and safe, not when it is perfect.
7. **Broken `main` is everyone's emergency.** Fix forward with a tiny PR, or revert the PR.

## Useful commands

| Command | What it does |
|---|---|
| `make setup` | create backend venv, install backend + frontend deps |
| `make dev-backend` / `make dev-frontend` | run the servers |
| `make format` | auto-format and auto-fix backend code |
| `make check` | lint, type-check, test, build (what CI runs) |

Optional: `pip install pre-commit && pre-commit install` runs formatters and a private-key
scan before each commit.
