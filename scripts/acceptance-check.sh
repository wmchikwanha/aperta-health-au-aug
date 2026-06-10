#!/usr/bin/env bash
# Aperta Health — Australian transition acceptance sweep.
#
# Scans the codebase for legacy Southern-African references that should have
# been removed during the AU rebrand (Phases 1–4). Exits non-zero on any
# unexpected hit so the project can wire it into CI later.
#
# Allowed locations:
#   - .lovable/plan.md (planning record)
#   - This script
#   - mem://* memory files (project memory, retained for context)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

PATTERNS=(
  "Nzwisiso"
  "Zimbabw"
  "Harare"
  "Shona"
  "Ndebele"
  "Sesotho"
  "MRCZ"
  "POPIA"
  "mhGAP"
  "Southern African"
  "Southern Africa"
  "kufungisisa"
  "amafufunyana"
  "ukuthwasa"
  "moedeloos"
)

EXCLUDES=(
  "--glob=!.lovable/**"
  "--glob=!scripts/acceptance-check.sh"
  "--glob=!**/CLAUDE.md"
  "--glob=!**/*.lock"
  "--glob=!node_modules/**"
  "--glob=!dist/**"
)

FAIL=0
for pat in "${PATTERNS[@]}"; do
  if hits=$(rg -n --color=never "${EXCLUDES[@]}" -e "$pat" 2>/dev/null); then
    echo "[FAIL] Legacy reference \"$pat\" still present:"
    echo "$hits" | sed 's/^/    /'
    FAIL=1
  fi
done

if [ "$FAIL" -eq 0 ]; then
  echo "[OK] Acceptance sweep clean — no legacy Southern-African references found."
fi
exit "$FAIL"
