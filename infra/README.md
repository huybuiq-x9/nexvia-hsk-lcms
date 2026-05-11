# Infrastructure

## Cấu trúc thư mục

```
infra/
├── common/
│   ├── docker-compose.base.yml     # Services chung: postgres, redis, minio
│   ├── nginx.conf                  # Nginx reverse proxy config
│   ├── Dockerfile.backend          # Build backend FastAPI (prod/staging/test)
│   ├── Dockerfile.backend.dev     # Build backend dev (volume mount, no code copy)
│   ├── Dockerfile.frontend         # Build frontend React Vite (prod/staging/test)
│   └── Dockerfile.frontend.dev     # Build frontend dev (Vite HMR)
├── dev/
│   ├── docker-compose.yml
│   └── .env.example
├── test/
│   ├── docker-compose.yml
│   └── .env.example
├── staging/
│   ├── docker-compose.yml
│   └── .env.example
└── prod/
    ├── docker-compose.yml
    └── .env.example
```

## Cách chạy từng môi trường

### Dev (máy local, hot reload)

```bash
cp infra/dev/.env.example infra/dev/.env

docker compose \
  --project-directory infra/dev \
  -f infra/common/docker-compose.base.yml \
  -f infra/dev/docker-compose.yml \
  up -d --build
```

- Backend: `http://localhost:8000` — uvicorn `--reload`, sửa code reload ngay
- Frontend: `http://localhost:5173` — Vite HMR, sửa code thấy ngay trên browser
- FastAPI docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO Console: `localhost:9001`

### Test (trên Google Cloud VM)

```bash
cp infra/test/.env.example infra/test/.env

docker compose \
  --project-directory infra/test \
  -f infra/common/docker-compose.base.yml \
  -f infra/test/docker-compose.yml \
  up -d --build
```

- App: `http://VM_IP/`
- Backend API: `http://VM_IP/api/v1`
- FastAPI docs: `http://VM_IP/docs`
- MinIO Console: `http://VM_IP:9001`

### Staging

```bash
cp infra/staging/.env.example infra/staging/.env

docker compose \
  --project-directory infra/staging \
  -f infra/common/docker-compose.base.yml \
  -f infra/staging/docker-compose.yml \
  up -d --build
```

### Production

```bash
cp infra/prod/.env.example infra/prod/.env
# Điền đầy đủ thông tin thật vào .env

docker compose \
  --project-directory infra/prod \
  -f infra/common/docker-compose.base.yml \
  -f infra/prod/docker-compose.yml \
  up -d --build
```

## Sự khác biệt giữa các môi trường

| | Dev | Test | Staging | Prod |
|---|---|---|---|---|
| Backend | uvicorn --reload | uvicorn | uvicorn | uvicorn |
| Frontend | Vite HMR :5173 | Nginx build | Nginx build | Nginx build |
| DB expose port | ✅ 5432 | ✅ 5432 | ❌ | ❌ |
| Redis expose port | ✅ 6379 | ❌ | ❌ | ❌ |
| Minio console | ✅ 9001 | ✅ 9001 | ❌ | ❌ |
| FastAPI /docs | ✅ | ✅ | ✅ | ❌ |
| Nginx | ❌ | ✅ | ✅ | ✅ |
| HTTPS/SSL | ❌ | ❌ | ❌ | ✅ |

## Lưu ý

- **Không commit file `.env`** lên git, chỉ commit `.env.example`
- File `.env` đã được thêm vào `.gitignore`
- SSL certificates cho production cần đặt trong `infra/prod/ssl/`

## Common Commands

```bash
# Xem logs
docker compose --project-directory infra/dev -f infra/common/docker-compose.base.yml -f infra/dev/docker-compose.yml logs -f

# Stop services
docker compose --project-directory infra/dev -f infra/common/docker-compose.base.yml -f infra/dev/docker-compose.yml down

# Rebuild
docker compose --project-directory infra/dev -f infra/common/docker-compose.base.yml -f infra/dev/docker-compose.yml up -d --build

# Run migrations
./scripts/db.sh -e test migrate

# Seed demo data
./scripts/db.sh -e dev seed

# Migrate, then seed
./scripts/db.sh -e dev all
```
