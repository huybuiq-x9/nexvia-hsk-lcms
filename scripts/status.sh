#!/bin/bash
# ============================================================
# status.sh - Kiểm tra trạng thái
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
ENV=""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    echo "Usage: $0 -e <env>"
    echo ""
    echo "Options:"
    echo "  -e, --env <env>       Môi trường: dev, test, staging, prod"
    echo "  -h, --help            Hiển thị help"
    echo ""
    echo "Ví dụ:"
    echo "  $0 -e dev"
    echo "  $0 -e test"
}

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENV="$2"
            shift 2
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

# Docker compose files
BASE_FILE="$PROJECT_ROOT/infra/common/docker-compose.base.yml"
ENV_FILE_COMPOSE="$PROJECT_ROOT/infra/$ENV/docker-compose.$ENV.yml"

if [[ ! -f "$ENV_FILE_COMPOSE" ]]; then
    log_error "Docker compose file not found: $ENV_FILE_COMPOSE"
    exit 1
fi

# Volume prefix
VOLUME_PREFIX="lcms_${ENV}_"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  LCMS Status - $ENV${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Containers status
echo -e "${YELLOW}Containers:${NC}"
cd "$PROJECT_ROOT/infra/$ENV"
docker compose --project-directory "$PROJECT_ROOT/infra/$ENV" -f "$BASE_FILE" -f "$ENV_FILE_COMPOSE" ps 2>/dev/null || echo "  No containers running"

echo ""

# Volumes info
echo -e "${YELLOW}Volumes:${NC}"
for vol in postgres_data minio_data redis_data; do
    full_vol="${VOLUME_PREFIX}${vol}"
    if docker volume ls -q | grep -q "^${full_vol}$"; then
        size=$(docker volume inspect "$full_vol" --format '{{.UsageData.Size}}' 2>/dev/null || echo "unknown")
        echo -e "  ${GREEN}$vol${NC}: $size"
    else
        echo -e "  ${RED}$vol${NC}: not found"
    fi
done

echo ""

# Disk usage
echo -e "${YELLOW}Disk Usage:${NC}"
df -h "$PROJECT_ROOT" 2>/dev/null | tail -1 | awk '{printf "  Total: %s, Used: %s, Available: %s, Use: %s\n", $2, $3, $4, $5}'

echo ""
echo -e "${BLUE}========================================${NC}"
