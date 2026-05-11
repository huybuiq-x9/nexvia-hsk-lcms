# NEXVIA HSK LCMS

Learning Content Management System gồm:

- Backend: FastAPI, Alembic, PostgreSQL, Redis, MinIO
- Frontend: React, TypeScript, Vite
- Infra: Docker Compose theo từng môi trường

## Yêu cầu

Cài sẵn trên máy deploy:

- Docker
- Docker Compose v2 (`docker compose`)
- Git
- Bash

Kiểm tra nhanh:

```bash
docker --version
docker compose version
git --version
```

## Cấu trúc chính

```text
backend/                 FastAPI app, migrations, seed data
front/                   React/Vite frontend
infra/
  common/                Dockerfiles, base compose, nginx config
  dev/                   Compose/env cho local development
  test/                  Compose/env cho test VM
  staging/               Compose/env cho staging
  prod/                  Compose/env cho production
scripts/
  deploy.sh              Build/start services
  db.sh                  Migrate/seed database
  logs.sh                Xem logs
  status.sh              Xem trạng thái
  restart.sh             Restart services
  stop.sh                Stop services
```

## Môi Trường

Các lệnh deploy nhận `-e <env>`, trong đó `<env>` là một trong:

```text
dev
test
staging
prod
```

Mỗi môi trường có file cấu hình riêng:

```text
infra/<env>/.env.example
infra/<env>/.env
infra/<env>/docker-compose.<env>.yml
```

File `.env` không commit lên git. Nếu thiếu `.env`, các script sẽ copy từ `.env.example`.

## Deploy Nhanh Dev

Từ root repo:

```bash
./scripts/deploy.sh -e dev
./scripts/db.sh -e dev all
```

Sau đó mở:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api/v1`
- Swagger: `http://localhost:8000/docs`
- MinIO Console: `http://localhost:9001`

Tài khoản seed mặc định:

```text
Email: admin@nexedu.vn
Password: Admin123@
```

## Script Deploy

Build và start toàn bộ services:

```bash
./scripts/deploy.sh -e dev
./scripts/deploy.sh -e test
./scripts/deploy.sh -e staging
./scripts/deploy.sh -e prod
```

Tuỳ chọn:

```bash
# Không git pull trước khi deploy
./scripts/deploy.sh -e dev --no-pull

# Chỉ build/start, không pull
./scripts/deploy.sh -e dev --build-only
```

Script sẽ dùng đúng compose files:

```text
infra/common/docker-compose.base.yml
infra/<env>/docker-compose.<env>.yml
```

## Database: Migrate Và Seed

Chạy migration:

```bash
./scripts/db.sh -e dev migrate
```

Seed dữ liệu demo:

```bash
./scripts/db.sh -e dev seed
```

Migrate rồi seed:

```bash
./scripts/db.sh -e dev all
```

Chạy revision cụ thể:

```bash
./scripts/db.sh -e staging migrate -r head
```

Script `db.sh` chạy command trong backend container và tự trỏ DB tới service `postgres` trong Docker network.

## Logs

Xem logs tất cả services:

```bash
./scripts/logs.sh -e dev
```

Xem logs service cụ thể:

```bash
./scripts/logs.sh -e dev -s backend
./scripts/logs.sh -e dev -s frontend
./scripts/logs.sh -e dev -s postgres
```

Không follow realtime:

```bash
./scripts/logs.sh -e dev --no-follow
```

Chỉ lấy số dòng cuối:

```bash
./scripts/logs.sh -e dev -n 100
```

## Status, Restart, Stop

Xem trạng thái:

```bash
./scripts/status.sh -e dev
```

Restart toàn bộ:

```bash
./scripts/restart.sh -e dev
```

Restart một service:

```bash
./scripts/restart.sh -e dev -s backend
```

Dừng services, giữ data:

```bash
./scripts/stop.sh -e dev
```

Dừng và xoá volumes/data:

```bash
./scripts/stop.sh -e dev --remove-volumes
```

Lệnh `--remove-volumes` sẽ xoá dữ liệu PostgreSQL/MinIO/Redis của môi trường đó.

## Deploy Test/Staging/Production

Chuẩn bị env:

```bash
cp infra/staging/.env.example infra/staging/.env
```

Sửa các giá trị thật trong `.env`, đặc biệt:

```text
POSTGRES_PASSWORD
MINIO_ROOT_PASSWORD
SECRET_KEY
DOMAIN
SMTP_*
```

Deploy:

```bash
./scripts/deploy.sh -e staging
./scripts/db.sh -e staging migrate
```

Production:

```bash
cp infra/prod/.env.example infra/prod/.env
# sửa infra/prod/.env trước khi chạy

./scripts/deploy.sh -e prod
./scripts/db.sh -e prod migrate
```

Nếu cần seed production, chạy thủ công và cân nhắc dữ liệu demo:

```bash
./scripts/db.sh -e prod seed
```

## Dev Frontend API Proxy

Ở môi trường `dev`, frontend gọi API qua cùng origin:

```text
http://localhost:5173/api/v1/...
```

Vite proxy sẽ chuyển request sang backend container:

```text
http://backend:8000/api/v1/...
```

Nhờ vậy luồng dev tránh lỗi CORS do browser gọi trực tiếp `localhost:8000`.

## Lệnh Docker Compose Thủ Công

Ưu tiên dùng scripts. Nếu cần chạy compose trực tiếp, luôn thêm `--project-directory`:

```bash
docker compose \
  --project-directory infra/dev \
  -f infra/common/docker-compose.base.yml \
  -f infra/dev/docker-compose.yml \
  up -d --build
```

Không bỏ `--project-directory`, vì Docker Compose có thể resolve nhầm `.env` sang `infra/common/.env`.

## Troubleshooting

Kiểm tra container:

```bash
./scripts/status.sh -e dev
```

Xem logs backend:

```bash
./scripts/logs.sh -e dev -s backend
```

Nếu backend không nhận env mới sau khi sửa compose:

```bash
docker compose \
  --project-directory infra/dev \
  -f infra/common/docker-compose.base.yml \
  -f infra/dev/docker-compose.yml \
  up -d --force-recreate backend
```

Nếu frontend vẫn gọi `localhost:8000`, recreate frontend:

```bash
docker compose \
  --project-directory infra/dev \
  -f infra/common/docker-compose.base.yml \
  -f infra/dev/docker-compose.yml \
  up -d --force-recreate frontend
```

Nếu DB trống hoặc login admin lỗi:

```bash
./scripts/db.sh -e dev all
```

Nếu muốn làm sạch toàn bộ dev data:

```bash
./scripts/stop.sh -e dev --remove-volumes
./scripts/deploy.sh -e dev
./scripts/db.sh -e dev all
```

## Tài Liệu Chi Tiết

- Backend: [backend/README.md](backend/README.md)
- Frontend: [front/README.md](front/README.md)
- Infrastructure: [infra/README.md](infra/README.md)
