#!/bin/bash
# Fires on Stop. If there are unpushed commits or uncommitted changes,
# shows a systemMessage prompting the user to push & deploy.
cd "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || exit 0

UNPUSHED=$(git log '@{u}..' --oneline 2>/dev/null | wc -l | xargs)
MODIFIED=$(git status --porcelain 2>/dev/null | wc -l | xargs)

if [ "$UNPUSHED" -gt 0 ] || [ "$MODIFIED" -gt 0 ]; then
  MSG=""
  [ "$UNPUSHED" -gt 0 ] && MSG="${UNPUSHED} unpushed commit(s)"
  if [ "$MODIFIED" -gt 0 ]; then
    [ -n "$MSG" ] && MSG="${MSG}, "
    MSG="${MSG}${MODIFIED} uncommitted change(s)"
  fi
  echo "{\"systemMessage\": \"${MSG} — say 'push and deploy' to publish to Vercel.\"}"
fi
