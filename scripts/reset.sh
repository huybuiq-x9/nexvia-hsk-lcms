#!/bin/bash
# ============================================================
# reset.sh - Xóa volume data
# ============================================================
#
# ⚠️  CẨN THẬN: Hành động này không thể hoàn tác!
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
ENV=""
TARGET="all"
FORCE=false

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
    echo "Usage: $0 -e <env> -t <target> [options]"
    echo ""
    echo "Options:"
    echo "  -e, --env <env>       Môi trường: dev, test, staging, prod"
    echo "  -t, --target <target> Volume cần xóa: all, postgres, minio, redis (default: all)"
    echo "  --force               Bỏ qua bước xác nhận yes/no"
    echo "  -h, --help            Hiển thị help"
    echo ""
    echo "Ví dụ:"
    echo "  $0 -e dev -t all             # xóa tất cả (có confirm)"
    echo "  $0 -e test -t postgres       # chỉ xóa DB"
    echo "  $0 -e test -t minio          # chỉ xóa file storage"
    echo "  $0 -e test -t redis          # chỉ xóa cache"
    echo "  $0 -e dev -t all --force     # xóa tất cả, không hỏi"
}

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENV="$2"
            shift 2
            ;;
        -t|--target)
            TARGET="$2"
            shift 2
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate env
if [[ -z "$ENV" ]]; then
    log_error "Missing required option: -e <env>"
    usage
    exit 1
fi

if [[ ! "$ENV" =~ ^(dev|test|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENV"
    exit 1
fi

# Validate target
if [[ ! "$TARGET" =~ ^(all|postgres|minio|redis)$ ]]; then
    log_error "Invalid target: $TARGET (must be: all, postgres, minio, redis)"
    exit 1
fi

# Volume names based on environment
VOLUME_PREFIX="lcms_${ENV}_"
POSTGRES_VOLUME="${VOLUME_PREFIX}postgres_data"
MINIO_VOLUME="${VOLUME_PREFIX}minio_data"
REDIS_VOLUME="${VOLUME_PREFIX}redis_data"

echo ""
log_warn "⚠️  DANGER ZONE: Data reset"
echo ""
log_warn "Environment: $ENV"
log_warn "Target: $TARGET"
echo ""

if [[ "$FORCE" == false ]]; then
    read -p "Are you sure you want to continue? Type 'yes' to confirm: " confirm
    if [[ "$confirm" != "yes" ]]; then
        log_info "Cancelled."
        exit 0
    fi
fi

# Function to remove volume
remove_volume() {
    local vol_name=$1
    if docker volume ls -q | grep -q "^${vol_name}$"; then
        log_info "Removing volume: $vol_name"
        docker volume rm "$vol_name"
    else
        log_info "Volume not found: $vol_name (skipping)"
    fi
}

echo ""
case "$TARGET" in
    all)
        log_warn "Removing ALL volumes..."
        remove_volume "$POSTGRES_VOLUME"
        remove_volume "$MINIO_VOLUME"
        remove_volume "$REDIS_VOLUME"
        ;;
    postgres)
        log_warn "Removing PostgreSQL volume..."
        remove_volume "$POSTGRES_VOLUME"
        ;;
    minio)
        log_warn "Removing MinIO volume..."
        remove_volume "$MINIO_VOLUME"
        ;;
    redis)
        log_warn "Removing Redis volume..."
        remove_volume "$REDIS_VOLUME"
        ;;
esac

echo ""
log_info "Done! All specified volumes have been removed."
