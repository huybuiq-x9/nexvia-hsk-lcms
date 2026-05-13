#!/bin/bash
# ============================================================
# deploy.sh - Deploy app
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Default values
ENV="dev"
NO_PULL=false
BUILD_ONLY=false

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 [-e <env>] [options]"
    echo ""
    echo "  (No -e flag defaults to: dev)"
    echo ""
    echo "Options:"
    echo "  -e, --env <env>       Môi trường: dev, test, staging, prod (default: dev)"
    echo "  --no-pull             Bỏ qua bước git pull"
    echo "  --build-only          Chỉ build lại images, không git pull"
    echo "  -h, --help            Hiển thị help"
    echo ""
    echo "Ví dụ:"
    echo "  $0                       # deploy dev"
    echo "  $0 -e test"
    echo "  $0 -e staging --no-pull"
    echo "  $0 -e prod --build-only"
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
        --no-pull)
            NO_PULL=true
            shift
            ;;
        --build-only)
            BUILD_ONLY=true
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
if [[ ! "$ENV" =~ ^(dev|test|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENV (must be: dev, test, staging, prod)"
    exit 1
fi

# Check .env file
ENV_FILE="$PROJECT_ROOT/infra/$ENV/.env"
ENV_EXAMPLE="$PROJECT_ROOT/infra/$ENV/.env.example"

if [[ ! -f "$ENV_FILE" ]]; then
    if [[ -f "$ENV_EXAMPLE" ]]; then
        log_warn ".env not found, copying from .env.example..."
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        log_info "Created $ENV_FILE - please edit it with your configuration"
    else
        log_error ".env not found: $ENV_FILE"
        exit 1
    fi
fi

# Docker compose files
BASE_FILE="$PROJECT_ROOT/infra/common/docker-compose.base.yml"
ENV_FILE_COMPOSE="$PROJECT_ROOT/infra/$ENV/docker-compose.yml"

if [[ ! -f "$ENV_FILE_COMPOSE" ]]; then
    log_error "Docker compose file not found: $ENV_FILE_COMPOSE"
    exit 1
fi

echo ""
log_info "Deploying LCMS to $ENV environment..."
echo ""

# Git pull if not disabled
if [[ "$NO_PULL" == false && "$BUILD_ONLY" == false ]]; then
    if [[ -d ".git" ]]; then
        log_info "Pulling latest changes..."
        if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
            git pull --ff-only || log_warn "Git pull failed"
        else
            log_warn "No upstream branch configured; skipping git pull"
        fi
        echo ""
    fi
fi

# Build and start (export env vars so docker compose can use them)
log_info "Building and starting containers..."

# Export env vars from .env file
set -a
source "$ENV_FILE"
set +a

cd "$PROJECT_ROOT/infra/$ENV"
docker compose \
    --project-directory "$PROJECT_ROOT/infra/$ENV" \
    -f "$BASE_FILE" \
    -f "$ENV_FILE_COMPOSE" \
    up -d --build

echo ""
log_info "Deployment complete!"
echo ""
log_info "Check status:   ./scripts/status.sh -e $ENV"
log_info "View logs:      ./scripts/logs.sh -e $ENV"
