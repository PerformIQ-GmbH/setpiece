#!/bin/bash
set -e
npm exec --yes --package=pnpm@11.25.0 -- pnpm install --frozen-lockfile
# Schema changes require an explicit migration and backup/restore review.
