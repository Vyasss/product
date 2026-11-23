#!/usr/bin/env bash
# Deploy dist/ to S3 behind CloudFront. Written for this project; NOT executed by it.
#
# Usage: S3_BUCKET=my-bucket CLOUDFRONT_DISTRIBUTION_ID=E123ABC ./infra/cloudfront/deploy.sh
#
# Order matters:
#   1. Hashed assets first, cached for a year as immutable. New filenames never collide with
#      the old ones, so users on the previous index.html keep working during the deploy.
#   2. Everything else (index.html, favicon) with no-cache, index.html LAST, so it never points
#      at assets that are not uploaded yet.
#   3. Invalidate only /index.html (hashed assets never need invalidation).
# Old assets are deliberately NOT deleted in the same run: open tabs may still request them.
# Prune them later (e.g. an S3 lifecycle rule or a separate job after a grace period).
#
# Credentials come from the standard AWS CLI chain (profile, SSO, or CI OIDC role);
# nothing secret lives in this repository.

set -euo pipefail

: "${S3_BUCKET:?Set S3_BUCKET}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?Set CLOUDFRONT_DISTRIBUTION_ID}"
DIST_DIR="${DIST_DIR:-dist}"

if [[ ! -f "${DIST_DIR}/index.html" ]]; then
  echo "No ${DIST_DIR}/index.html: run 'npm run build' first." >&2
  exit 1
fi

echo "1/3 Uploading hashed assets (immutable)..."
aws s3 sync "${DIST_DIR}/assets" "s3://${S3_BUCKET}/assets" \
  --cache-control "public,max-age=31536000,immutable"

echo "2/3 Uploading other files (no-cache), index.html last..."
aws s3 sync "${DIST_DIR}" "s3://${S3_BUCKET}" \
  --exclude "assets/*" \
  --exclude "index.html" \
  --cache-control "no-cache"
aws s3 cp "${DIST_DIR}/index.html" "s3://${S3_BUCKET}/index.html" \
  --cache-control "no-cache" \
  --content-type "text/html; charset=utf-8"

echo "3/3 Invalidating /index.html..."
aws cloudfront create-invalidation \
  --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
  --paths "/index.html"

echo "Done."
