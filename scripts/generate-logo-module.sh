#!/usr/bin/env bash
# Regenerates src/assets/logoMark.ts from src/assets/logo-mark.png.
#
# The PDF and Word renderers need the mark as *bytes*, not as a next/image import
# (which yields a URL). Reading it off disk at render time is unreliable on Vercel,
# so the bytes are inlined into a TS module the bundler is guaranteed to include.
# 256px keeps it crisp at the ~55pt it prints at while keeping the module small.
#
# Run from the repo root:  bash scripts/generate-logo-module.sh
set -euo pipefail

src="src/assets/logo-mark.png"
out="src/assets/logoMark.ts"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

sips -Z 256 "$src" --out "$tmp/mark.png" >/dev/null
b64="$(base64 < "$tmp/mark.png" | tr -d '\n')"

{
  echo "// GENERATED FILE — do not edit by hand."
  echo "// Regenerate with: bash scripts/generate-logo-module.sh"
  echo "//"
  echo "// The woven-interlace mark from src/assets/logo-mark.png, downscaled to 256px and"
  echo "// inlined as base64 so both document renderers can reach the actual bytes. A"
  echo "// next/image import gives a URL, not pixels, and @react-pdf/renderer and docx both"
  echo "// need pixels; reading from disk at render time is not dependable on a serverless"
  echo "// runtime, where only what the bundler traced is guaranteed to be present."
  echo ""
  echo "const BASE64 ="
  echo "  '$b64'"
  echo ""
  echo "/** For @react-pdf/renderer's <Image src>, which takes a data URI. */"
  echo "export const LOGO_MARK_DATA_URI = \`data:image/png;base64,\${BASE64}\`"
  echo ""
  echo "/** For docx's ImageRun, which takes raw bytes. */"
  echo "export function logoMarkBytes(): Buffer {"
  echo "  return Buffer.from(BASE64, 'base64')"
  echo "}"
} > "$out"

echo "wrote $out ($(wc -c < "$out") bytes)"
