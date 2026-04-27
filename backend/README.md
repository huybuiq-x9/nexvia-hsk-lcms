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

- Email: `admin@nexvia.vn`
- Password: `Admin123@`

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
