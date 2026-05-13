#!/bin/bash
# ============================================================
# db.sh - Run database migrations and seed data
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

ENV=""
ACTION=""
REVISION="head"
MESSAGE=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
    echo "Usage: $0 -e <env> <action> [options]"
    echo ""
    echo "Actions:"
    echo "  revision             Create a new alembic migration (autogenerate)"
    echo "  migrate              Run alembic upgrade"
    echo "  seed                 Seed demo data"
    echo "  all                  Run migrate, then seed"
    echo ""
    echo "Options:"
    echo "  -e, --env <env>      Environment: dev, test, staging, prod"
    echo "  -r, --revision <rev> Alembic revision for migrate (default: head)"
    echo "  -m, --message <msg>  Migration message (required for revision action)"
    echo "  -h, --help           Show help"
    echo ""
    echo "Examples:"
    echo "  $0 -e dev revision -m \"add users table\""
    echo "  $0 -e dev migrate"
    echo "  $0 -e dev seed"
    echo "  $0 -e staging all"
    echo "  $0 -e prod migrate -r head"
}

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENV="$2"
            shift 2
            ;;
        -r|--revision)
            REVISION="$2"
            shift 2
            ;;
        -m|--message)
            MESSAGE="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        revision|migrate|seed|all)
            ACTION="$1"
            shift
            ;;
        *)
            log_error "Unknown option or action: $1"
            usage
            exit 1
            ;;
    esac
done

if [[ -z "$ENV" ]]; then
    log_error "Missing required option: -e <env>"
    usage
    exit 1
fi

if [[ ! "$ENV" =~ ^(dev|test|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENV (must be: dev, test, staging, prod)"
    exit 1
fi

if [[ -z "$ACTION" ]]; then
    log_error "Missing action: revision, migrate, seed, or all"
    usage
    exit 1
fi

if [[ "$ACTION" == "revision" && -z "$MESSAGE" ]]; then
    log_error "Missing required option: -m <message> (required for revision action)"
    usage
    exit 1
fi

ENV_FILE="$PROJECT_ROOT/infra/$ENV/.env"
ENV_EXAMPLE="$PROJECT_ROOT/infra/$ENV/.env.example"
BASE_FILE="$PROJECT_ROOT/infra/common/docker-compose.base.yml"
ENV_FILE_COMPOSE="$PROJECT_ROOT/infra/$ENV/docker-compose.yml"

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

if [[ ! -f "$ENV_FILE_COMPOSE" ]]; then
    log_error "Docker compose file not found: $ENV_FILE_COMPOSE"
    exit 1
fi

set -a
source "$ENV_FILE"
set +a

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-lcms}"
DATABASE_URL="${DATABASE_URL:-postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}}"

COMPOSE_CMD=(
    docker compose
    --project-directory "$PROJECT_ROOT/infra/$ENV"
    -f "$BASE_FILE"
    -f "$ENV_FILE_COMPOSE"
)

wait_for_postgres() {
    local container_id
    local status

    log_info "Ensuring PostgreSQL is running..."
    "${COMPOSE_CMD[@]}" up -d postgres >/dev/null

    container_id="$("${COMPOSE_CMD[@]}" ps -q postgres)"
    if [[ -z "$container_id" ]]; then
        log_error "PostgreSQL container was not created"
        exit 1
    fi

    for _ in {1..30}; do
        status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
        if [[ "$status" == "healthy" || "$status" == "running" ]]; then
            return 0
        fi
        sleep 2
    done

    log_error "PostgreSQL is not ready after 60 seconds"
    exit 1
}

run_backend() {
    "${COMPOSE_CMD[@]}" run --rm \
        -e DATABASE_URL="$DATABASE_URL" \
        backend "$@"
}

run_revision() {
    log_info "Creating migration: $MESSAGE"
    wait_for_postgres
    run_backend alembic revision --autogenerate -m "$MESSAGE"
}

run_migrate() {
    log_info "Running migrations for $ENV to revision: $REVISION"
    wait_for_postgres
    run_backend alembic upgrade "$REVISION"
}

run_seed() {
    log_info "Seeding data for $ENV"
    wait_for_postgres
    run_backend python -m app.db.seed
}

echo ""
case "$ACTION" in
    revision)
        run_revision
        ;;
    migrate)
        run_migrate
        ;;
    seed)
        run_seed
        ;;
    all)
        run_migrate
        run_seed
        ;;
esac

echo ""
log_info "Done!"
