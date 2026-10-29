#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Schema changes require an explicit migration and backup/restore review.
