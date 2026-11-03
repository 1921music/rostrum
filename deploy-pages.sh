#!/usr/bin/env bash
# Publish one variant, preserving the other; see DEVELOPMENT.md.
set -euo pipefail
exec mise exec -- python deploy_pages.py --remote "${REMOTE:-origin}" "$@"
