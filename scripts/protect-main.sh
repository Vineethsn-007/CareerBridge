#!/usr/bin/env bash
# Locks down `main` and sets squash-only merging.
#
# Prerequisites:
#   - GitHub CLI installed and logged in:  gh auth login
#   - You are an admin of the repo
#   - Branch protection must be available: public repo, OR an org/Pro plan for private repos
#     (GitHub Student Developer Pack gives Pro for free)
#   - Push the initial commit to main BEFORE running this
#   - Run the CI workflow once (open any PR) so "CI gate" exists as a check
#
# Usage:  ./scripts/protect-main.sh OWNER/REPO
# Optional env vars:
#   APPROVALS=1              required approving reviews
#   ENFORCE_ADMINS=false     true = even you cannot bypass the rules
#   CODEOWNERS_REQUIRED=false  true = an owner listed in CODEOWNERS must approve

set -euo pipefail

REPO="${1:?Usage: $0 OWNER/REPO}"
APPROVALS="${APPROVALS:-1}"
ENFORCE_ADMINS="${ENFORCE_ADMINS:-false}"
CODEOWNERS_REQUIRED="${CODEOWNERS_REQUIRED:-false}"
BRANCH="${BRANCH:-main}"

echo "Configuring merge settings for $REPO ..."
gh api -X PATCH "repos/$REPO" \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -F allow_auto_merge=true \
  -F delete_branch_on_merge=true \
  --silent

echo "Protecting branch '$BRANCH' ..."
gh api -X PUT "repos/$REPO/branches/$BRANCH/protection" --input - --silent <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["CI gate"]
  },
  "enforce_admins": $ENFORCE_ADMINS,
  "required_pull_request_reviews": {
    "required_approving_review_count": $APPROVALS,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": $CODEOWNERS_REQUIRED,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON

echo "Done. '$BRANCH' now requires: PR + $APPROVALS approval(s) + passing 'CI gate' + up-to-date branch."
echo "Also enable (Settings > Code security): secret scanning + push protection."
