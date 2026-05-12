# LCMS Backend

FastAPI-based backend for Learning Content Management System.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database and S3 credentials
```

## Run

```bash
uvicorn app.main:app --reload
```

## Seed Admin User

```bash
alembic upgrade head
python -m app.db.seed
```

Default admin credentials:

- Email: `admin@nexedu.vn`
- Password: `Admin123@`

## Docker DB Scripts

Run migrations or seed data through Docker Compose with the target environment:

```bash
# Migrate database
../scripts/db.sh -e dev migrate

# Seed demo data
../scripts/db.sh -e dev seed

# Migrate, then seed
../scripts/db.sh -e dev all

# Use a specific Alembic revision
../scripts/db.sh -e staging migrate -r head
```

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
