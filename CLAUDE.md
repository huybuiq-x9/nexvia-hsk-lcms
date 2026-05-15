# NEXVIA HSK LCMS - Source Guide

## System Overview

NEXVIA HSK LCMS is a system for managing learning content production. Content is organized into three levels:

```text
Course -> Lesson -> Sub-lesson
```

The system serves four main roles:

- `admin`: manages users, creates courses, assigns owners, and publishes courses.
- `expert`: reviews and approves content and SCORM packages.
- `teacher`: creates/updates lessons and sub-lessons, and uploads source content.
- `converter`: receives approved content and uploads SCORM packages.

## Core Features

- Login, token refresh, logout, and role-based access control.
- User management and role assignment.
- Learning content structure management: Course, Lesson, Sub-lesson.
- Expert assignment for Courses; Teacher/Converter assignment for Lessons.
- Upload, preview, download, and delete source documents.
- Content review workflow: Teacher submit -> Expert approve/reject.
- SCORM workflow: Converter upload -> Expert approve/reject.
- Automatic Lesson/Course status updates based on Sub-lesson status.
- SCORM package management and async processing with Celery/Redis.
- List, detail, dashboard, notification, and question bank screens.

## Business Statuses

Sub-lesson:

```text
draft -> in_progress -> reviewing -> converting -> scorm_reviewing -> approved
```

Lesson:

```text
draft -> in_progress -> approved
```

Course:

```text
draft -> in_progress -> ready_to_publish -> published
```

A Course can also become `unpublished`. When content is rejected, the Sub-lesson returns to `in_progress`; when SCORM is rejected, the Sub-lesson returns to the converter phase for rework.

## Source Code

```text
nexvia-hsk-lcms/
|-- front/      React 19 + TypeScript + Vite + Tailwind CSS
|-- backend/    FastAPI + async SQLAlchemy + PostgreSQL
|-- infra/      Docker Compose for dev/test/staging/prod
|-- scripts/    deploy, db, logs, status, restart, stop
`-- docs/       Business and technical documentation
```

### Frontend

```text
front/src/
|-- App.tsx                     Route definitions
|-- pages/                      Main screens
|   |-- auth/
|   |-- dashboard/
|   |-- courses/
|   |-- lessons/
|   |-- sub-lessons/
|   |-- users/
|   |-- notifications/
|   `-- question-bank/
|-- components/                 Layout and shared UI
|-- contexts/                   Auth, Toast, Breadcrumb
|-- hooks/                      useDebounce, usePagination, useUserCache
|-- services/                   apiClient and API functions
|-- types/                      API types and status constants
|-- i18n/locales/               vi.json, en.json
`-- utils/                      formatters, api-error
```

Frontend notes:

- API calls are centralized in `front/src/services/index.ts`.
- Axios setup and token refresh live in `front/src/services/apiClient.ts`.
- User-facing text must have keys in both `vi.json` and `en.json`.
- Status constants/colors live in `front/src/types/course.ts`.

### Backend

```text
backend/app/
|-- main.py                     FastAPI app, middleware, exception handlers
|-- api/v1/router.py            Combines module routers under /api/v1
|-- core/                       config, deps, security, storage, email, celery
|-- db/                         session, model imports, seed data
|-- shared/                     base model, enums
`-- modules/
    |-- auth/                   login, refresh token, logout
    |-- users/                  user CRUD, role assignment
    |-- courses/                course/lesson/sub-lesson, workflow, review log
    |-- documents/              upload/download/delete documents
    `-- scorm/                  SCORM package, upload, async processing
```

Backend modules usually follow this structure:

```text
model.py -> schema.py -> service.py -> router.py
```

Backend notes:

- Business logic belongs in `service.py`; routers should handle request/response and dependencies.
- Use async SQLAlchemy with `await session.execute(...)`, `commit`, and `refresh`.
- Authorization and current-user helpers live in `backend/app/core/deps.py`.
- Business enums live in `backend/app/shared/enums.py`.
- Register new routers in `backend/app/api/v1/router.py`.

## Common Commands

```bash
./scripts/deploy.sh -e dev
./scripts/db.sh -e dev all
./scripts/logs.sh -e dev
./scripts/status.sh -e dev
```

Frontend:

```bash
cd front
npm run dev
npm run lint
npm run build
```

Backend:

```bash
cd backend
pytest
uvicorn app.main:app --reload
```
