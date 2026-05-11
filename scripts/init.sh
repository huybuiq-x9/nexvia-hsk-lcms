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
echo "  ./deploy.sh   -e dev"
echo "  ./logs.sh     -e dev"
echo "  ./status.sh   -e dev"
