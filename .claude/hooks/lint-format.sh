#!/bin/bash
# Exit code 2 sends the output to Claude
FILE=$(jq -r '.tool_input.file_path')
case "$FILE" in
  "$CLAUDE_PROJECT_DIR"/*) ;;
  *) exit 0 ;;
esac
cd "$CLAUDE_PROJECT_DIR" || exit 1
STATUS=0
node_modules/.bin/eslint --cache --cache-location node_modules/.cache/eslint/ --fix --no-warn-ignored "$FILE" >&2 || STATUS=2
node_modules/.bin/prettier --cache --write --ignore-unknown "$FILE" >&2 || STATUS=2
exit $STATUS
