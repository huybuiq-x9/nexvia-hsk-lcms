#!/bin/bash
# ============================================================
# stop.sh - Dừng containers
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
ENV=""
REMOVE_VOLUMES=false

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
    echo "Usage: $0 -e <env> [options]"
    echo ""
    echo "Options:"
    echo "  -e, --env <env>       Môi trường: dev, test, staging, prod"
    echo "  --remove-volumes      Xóa volumes khi dừng"
    echo "  -h, --help            Hiển thị help"
    echo ""
    echo "Ví dụ:"
    echo "  $0 -e dev                     # dừng, giữ data"
    echo "  $0 -e test --remove-volumes   # dừng và xóa data"
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
        --remove-volumes)
            REMOVE_VOLUMES=true
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

# Docker compose files
BASE_FILE="$PROJECT_ROOT/infra/common/docker-compose.base.yml"
ENV_FILE_COMPOSE="$PROJECT_ROOT/infra/$ENV/docker-compose.$ENV.yml"

echo ""
log_info "Stopping $ENV environment..."

cd "$PROJECT_ROOT/infra/$ENV"
if [[ "$REMOVE_VOLUMES" == true ]]; then
    log_warn "Removing volumes (this will delete all data!)"
    docker compose --project-directory "$PROJECT_ROOT/infra/$ENV" -f "$BASE_FILE" -f "$ENV_FILE_COMPOSE" down -v
else
    docker compose --project-directory "$PROJECT_ROOT/infra/$ENV" -f "$BASE_FILE" -f "$ENV_FILE_COMPOSE" down
fi

echo ""
log_info "Done!"
