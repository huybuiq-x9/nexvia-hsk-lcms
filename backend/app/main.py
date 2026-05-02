from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import LCMSException

# Import all models to register them with SQLAlchemy Base
from app.modules.auth.model import RefreshToken  # noqa: F401
from app.modules.users.model import User, UserRoleAssignment  # noqa: F401
from app.modules.courses.model import Course, Lesson, SubLesson  # noqa: F401
from app.modules.documents.model import Document  # noqa: F401

app = FastAPI(
    title="LCMS API",
    version="1.0.0",
    description="Learning Content Management System API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://localhost:5176",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(LCMSException)
async def lcms_exception_handler(request: Request, exc: LCMSException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    if settings.APP_ENV == "development":
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc)},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
