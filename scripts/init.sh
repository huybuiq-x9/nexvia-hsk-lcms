#!/bin/bash
# ============================================================
# init.sh - Khởi tạo và phân quyền execute cho tất cả scripts
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Initializing LCMS deployment scripts..."
echo ""

# Các scripts cần phân quyền execute
SCRIPTS=(
    "deploy.sh"
    "restart.sh"
    "stop.sh"
    "reset.sh"
    "logs.sh"
    "status.sh"
    "db.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [[ -f "$SCRIPT_DIR/$script" ]]; then
        chmod +x "$SCRIPT_DIR/$script"
        echo "  [OK] $script"
    else
        echo "  [WARN] $script not found, skipping"
    fi
done

echo ""
echo "==> Done! Scripts are ready to use."
echo ""
echo "Usage examples:"
echo "  ./deploy.sh      # dev by default"
echo "  ./deploy.sh -e staging"
echo "  ./logs.sh        # dev by default"
echo "  ./status.sh      # dev by default"
echo "  ./restart.sh -e test"
echo "  ./db.sh migrate  # dev by default"
echo "  ./db.sh seed -e staging"
