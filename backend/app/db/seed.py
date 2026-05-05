import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import text

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.shared.enums import UserRole, CourseStatus, LessonStatus, SubLessonStatus


ADMIN_EMAIL = "admin@nexvia.vn"
ADMIN_PASSWORD = "Admin123@"
ADMIN_FULL_NAME = "Nexvia Admin"

DEMO_USERS = [
    {"email": "admin@nexvia.vn",      "password": "Admin123@",    "full_name": "Nexvia Admin",     "role": UserRole.ADMIN},
    {"email": "teacher01@nexvia.vn", "password": "Teacher123@", "full_name": "Bùi Đình Nam",      "role": UserRole.TEACHER},
    {"email": "teacher02@nexvia.vn", "password": "Teacher123@", "full_name": "Ngô Thị Phương",   "role": UserRole.TEACHER},
    {"email": "teacher03@nexvia.vn", "password": "Teacher123@", "full_name": "Trịnh Gia Khánh",   "role": UserRole.TEACHER},
    {"email": "expert01@nexvia.vn",  "password": "Expert123@",  "full_name": "Lý Minh Tuấn",      "role": UserRole.EXPERT},
    {"email": "expert02@nexvia.vn",  "password": "Expert123@",  "full_name": "Phan Thị Mai Anh", "role": UserRole.EXPERT},
    {"email": "expert03@nexvia.vn",  "password": "Expert123@",  "full_name": "Đỗ Đức Minh",        "role": UserRole.EXPERT},
    {"email": "converter01@nexvia.vn","password": "Converter123@","full_name": "Võ Thị Kim Oanh",  "role": UserRole.CONVERTER},
    {"email": "converter02@nexvia.vn","password": "Converter123@","full_name": "Đinh Quang Vũ",     "role": UserRole.CONVERTER},
    {"email": "converter03@nexvia.vn","password": "Converter123@","full_name": "Hoàng Văn Minh",    "role": UserRole.CONVERTER},
]

# ─── Seed data constants (defined before COURSES) ───────────────────────────────

LESSON_TOPICS: dict[int, list[str]] = {
    1: [
        "Chào hỏi và giới thiệu",
        "Đếm số từ 1 đến 10",
        "Gia đình và người thân",
        "Màu sắc và hình dạng",
        "Ăn uống hàng ngày",
        "Đi shopping cơ bản",
        "Hỏi đường và chỉ dẫn",
        "Thời gian và lịch hẹn",
        "Sở thích và hoạt động",
        "Ôn tập và kiểm tra",
    ],
    2: [
        "Đếm số từ 11 đến 100",
        "Ngày tháng và mùa",
        "Nghề nghiệp và công việc",
        "Du lịch và phương tiện",
        "Sức khỏe và bệnh viện",
        "Trường học và giáo dục",
        "Thời tiết và khí hậu",
        "Điện thoại và thư tín",
        "Nhà ở và đồ gia dụng",
        "Ôn tập và kiểm tra",
    ],
    3: [
        "Giao tiếp trong công việc",
        "Kế hoạch và dự định",
        "Văn hóa và lễ hội",
        "Truyền thông và internet",
        "Tài chính và ngân hàng",
        "Luật pháp và giấy tờ",
        "Khoa học và công nghệ",
        "Môi trường và xã hội",
        "Nghệ thuật và giải trí",
        "Ôn tập và kiểm tra tổng hợp",
    ],
}

SUB_LESSON_STATUSES = [
    SubLessonStatus.DRAFT,
    SubLessonStatus.IN_PROGRESS,
    SubLessonStatus.SUBMITTED,
    SubLessonStatus.REVIEWING,
    SubLessonStatus.IN_CONVERSION,
    SubLessonStatus.SCORM_UPLOADED,
    SubLessonStatus.SCORM_REVIEWING,
    SubLessonStatus.APPROVED,
    SubLessonStatus.PUBLISHED,
]

LESSON_STATUSES = [LessonStatus.DRAFT, LessonStatus.IN_PROGRESS, LessonStatus.APPROVED]

_SUB_LESSON_ORDER = list(SubLessonStatus)


def _is_sublesson_submitted(status: SubLessonStatus) -> bool:
    idx = _SUB_LESSON_ORDER.index(status)
    return idx >= _SUB_LESSON_ORDER.index(SubLessonStatus.SUBMITTED)


def _is_sublesson_approved(status: SubLessonStatus) -> bool:
    idx = _SUB_LESSON_ORDER.index(status)
    return idx >= _SUB_LESSON_ORDER.index(SubLessonStatus.APPROVED)


TEACHER_ROTATION = ["teacher01@nexvia.vn", "teacher02@nexvia.vn", "teacher03@nexvia.vn"]
CONVERTER_ROTATION = ["converter01@nexvia.vn", "converter02@nexvia.vn", "converter03@nexvia.vn"]


def _make_lesson(hsk: int, idx: int, topic: str) -> dict:
    lesson_num = idx + 1
    sub_lessons = [
        {
            "title": f"Bài {lesson_num}.{j} — Từ vựng và mẫu câu",
            "description": f"Từ vựng và mẫu câu cơ bản cho bài {lesson_num} — {topic}",
            "status": SUB_LESSON_STATUSES[(idx * 3 + j) % len(SUB_LESSON_STATUSES)],
        }
        for j in range(1, 4)
    ]
    return {
        "title": f"Bài {lesson_num}: {topic}",
        "description": f"Nội dung bài học {lesson_num} — {topic} (HSK {hsk})",
        "status": LESSON_STATUSES[idx % len(LESSON_STATUSES)],
        "teacher_email": TEACHER_ROTATION[idx % len(TEACHER_ROTATION)],
        "converter_email": CONVERTER_ROTATION[idx % len(CONVERTER_ROTATION)],
        "sub_lessons": sub_lessons,
    }


COURSES = [
    {
        "title": "HSK 1 — Tiếng Trung Cơ Bản",
        "description": (
            "Khóa học HSK cấp độ 1, dành cho người mới bắt đầu học tiếng Trung. "
            "Bao gồm 500+ từ vựng cơ bản và các mẫu câu giao tiếp thông dụng."
        ),
        "status": CourseStatus.DRAFT,
        "expert_email": "expert01@nexvia.vn",
        "lessons": [
            _make_lesson(1, i, t)
            for i, t in enumerate(LESSON_TOPICS[1])
        ],
    },
    {
        "title": "HSK 2 — Tiếng Trung Sơ Cấp",
        "description": (
            "Khóa học HSK cấp độ 2, mở rộng vốn từ vựng lên 800+ từ "
            "và các cấu trúc ngữ pháp phức tạp hơn."
        ),
        "status": CourseStatus.IN_PROGRESS,
        "expert_email": "expert02@nexvia.vn",
        "lessons": [
            _make_lesson(2, i, t)
            for i, t in enumerate(LESSON_TOPICS[2])
        ],
    },
    {
        "title": "HSK 3 — Tiếng Trung Trung Cấp",
        "description": (
            "Khóa học HSK cấp độ 3, hoàn thành 1200+ từ vựng "
            "và khả năng giao tiếp lưu loát trong các tình huống hàng ngày."
        ),
        "status": CourseStatus.PUBLISHED,
        "expert_email": "expert03@nexvia.vn",
        "lessons": [
            _make_lesson(3, i, t)
            for i, t in enumerate(LESSON_TOPICS[3])
        ],
    },
]


# ─── User seeding ──────────────────────────────────────────────────────────────

async def _seed_single_user(
    db,
    email: str,
    password: str,
    full_name: str,
    role: UserRole,
) -> uuid.UUID:
    hashed_password = get_password_hash(password)

    result = await db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": email},
    )
    user_id = result.scalar_one_or_none()

    is_superadmin = role == UserRole.ADMIN

    if user_id is None:
        user_id = uuid.uuid4()
        await db.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, full_name,
                    is_active, is_superadmin, deleted_at
                )
                VALUES (
                    :id, :email, :hashed_password, :full_name,
                    TRUE, :is_superadmin, NULL
                )
                """
            ),
            {
                "id": user_id,
                "email": email,
                "hashed_password": hashed_password,
                "full_name": full_name,
                "is_superadmin": is_superadmin,
            },
        )
        action = "created"
    else:
        await db.execute(
            text(
                """
                UPDATE users
                SET
                    hashed_password = :hashed_password,
                    full_name = COALESCE(NULLIF(full_name, ''), :full_name),
                    is_active = TRUE,
                    is_superadmin = :is_superadmin
                WHERE id = :id
                """
            ),
            {
                "id": user_id,
                "hashed_password": hashed_password,
                "full_name": full_name,
                "is_superadmin": is_superadmin,
            },
        )
        action = "updated"

    columns_result = await db.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'user_role_assignments'
            """
        )
    )
    role_columns = {row[0] for row in columns_result.all()}

    role_result = await db.execute(
        text(
            """
            SELECT id
            FROM user_role_assignments
            WHERE user_id = :user_id AND role = :role
            LIMIT 1
            """
        ),
        {"user_id": user_id, "role": role.value},
    )
    role_id = role_result.scalar_one_or_none()

    if role_id is None:
        insert_columns = ["id", "user_id", "role", "assigned_at", "deleted_at"]
        insert_values = [":id", ":user_id", ":role", ":assigned_at", "NULL"]
        params = {
            "id": uuid.uuid4(),
            "user_id": user_id,
            "role": role.value,
            "assigned_at": datetime.now(timezone.utc),
        }

        if "revoked_at" in role_columns:
            insert_columns.append("revoked_at")
            insert_values.append("NULL")

        await db.execute(
            text(
                f"""
                INSERT INTO user_role_assignments ({", ".join(insert_columns)})
                VALUES ({", ".join(insert_values)})
                """
            ),
            params,
        )
    elif "revoked_at" in role_columns:
        await db.execute(
            text(
                """
                UPDATE user_role_assignments
                SET revoked_at = NULL
                WHERE id = :id
                """
            ),
            {"id": role_id},
        )

    print(f"  [{role.value:12}] {action}: {email} ({full_name})")
    return user_id


async def seed_users() -> dict[str, uuid.UUID]:
    """Seed all demo users and return a map of email -> user_id."""
    email_to_id: dict[str, uuid.UUID] = {}
    async with AsyncSessionLocal() as db:
        print("Seeding users...")
        for user in DEMO_USERS:
            uid = await _seed_single_user(
                db,
                email=user["email"],
                password=user["password"],
                full_name=user["full_name"],
                role=user["role"],
            )
            email_to_id[user["email"]] = uid
        await db.commit()
    print(f"Done! {len(DEMO_USERS)} users seeded.\n")
    return email_to_id


# ─── Course seeding ────────────────────────────────────────────────────────────

async def _course_exists(db, title: str) -> bool:
    result = await db.execute(
        text(
            "SELECT id FROM courses WHERE title = :title AND deleted_at IS NULL LIMIT 1"
        ),
        {"title": title},
    )
    return result.scalar_one_or_none() is not None


async def _seed_course(
    db,
    course_data: dict,
    email_to_id: dict[str, uuid.UUID],
) -> uuid.UUID:
    if await _course_exists(db, course_data["title"]):
        result = await db.execute(
            text(
                "SELECT id FROM courses WHERE title = :title AND deleted_at IS NULL LIMIT 1"
            ),
            {"title": course_data["title"]},
        )
        course_id = result.scalar_one()
        print(f"  [course] skipped (exists): {course_data['title']}")
        return course_id

    course_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    expert_id = email_to_id[course_data["expert_email"]]
    created_by_result = await db.execute(
        text("SELECT id FROM users WHERE email = 'admin@nexvia.vn' LIMIT 1")
    )
    created_by_id = created_by_result.scalar_one_or_none() or uuid.uuid4()

    await db.execute(
        text(
            """
            INSERT INTO courses (
                id, title, description, status, order_index,
                assigned_expert_id, created_by,
                created_at, updated_at, deleted_at
            )
            VALUES (
                :id, :title, :description, :status, :order_index,
                :assigned_expert_id, :created_by,
                :created_at, :updated_at, NULL
            )
            """
        ),
        {
            "id": course_id,
            "title": course_data["title"],
            "description": course_data["description"],
            "status": course_data["status"].value,
            "order_index": 0,
            "assigned_expert_id": expert_id,
            "created_by": created_by_id,
            "created_at": now,
            "updated_at": now,
        },
    )
    print(f"  [course] created: {course_data['title']}")

    for lesson_idx, lesson_data in enumerate(course_data["lessons"]):
        lesson_id = uuid.uuid4()
        teacher_id = email_to_id.get(lesson_data["teacher_email"])
        converter_id = email_to_id.get(lesson_data["converter_email"])

        await db.execute(
            text(
                """
                INSERT INTO lessons (
                    id, course_id, title, description, status, order_index,
                    assigned_teacher_id, assigned_converter_id,
                    created_at, updated_at, deleted_at
                )
                VALUES (
                    :id, :course_id, :title, :description, :status, :order_index,
                    :assigned_teacher_id, :assigned_converter_id,
                    :created_at, :updated_at, NULL
                )
                """
            ),
            {
                "id": lesson_id,
                "course_id": course_id,
                "title": lesson_data["title"],
                "description": lesson_data["description"],
                "status": lesson_data["status"].value,
                "order_index": lesson_idx,
                "assigned_teacher_id": teacher_id,
                "assigned_converter_id": converter_id,
                "created_at": now,
                "updated_at": now,
            },
        )
        print(f"    [lesson] created: {lesson_data['title']}")

        for sl_idx, sl_data in enumerate(lesson_data["sub_lessons"]):
            sl_id = uuid.uuid4()
            await db.execute(
                text(
                    """
                    INSERT INTO sub_lessons (
                        id, lesson_id, title, description, status, order_index,
                        submitted_at, approved_at,
                        created_at, updated_at, deleted_at
                    )
                    VALUES (
                        :id, :lesson_id, :title, :description, :status, :order_index,
                        :submitted_at, :approved_at,
                        :created_at, :updated_at, NULL
                    )
                    """
                ),
                {
                    "id": sl_id,
                    "lesson_id": lesson_id,
                    "title": sl_data["title"],
                    "description": sl_data["description"],
                    "status": sl_data["status"].value,
                    "order_index": sl_idx,
                    "submitted_at": now if _is_sublesson_submitted(sl_data["status"]) else None,
                    "approved_at": now if _is_sublesson_approved(sl_data["status"]) else None,
                    "created_at": now,
                    "updated_at": now,
                },
            )
            print(f"      [sub-lesson] created: {sl_data['title']}")

    return course_id


async def seed_courses(email_to_id: dict[str, uuid.UUID]) -> None:
    """Seed 3 HSK courses with 10 lessons and 3 sub-lessons each."""
    async with AsyncSessionLocal() as db:
        print("Seeding courses...")
        for course_data in COURSES:
            await _seed_course(db, course_data, email_to_id)
        await db.commit()
    print("Done! All courses seeded.\n")


# ─── Main ─────────────────────────────────────────────────────────────────────

async def main() -> None:
    print("=" * 60)
    print("  HSK LCMS — Database Seeder")
    print("=" * 60)
    print()

    email_to_id = await seed_users()
    await seed_courses(email_to_id)

    print()
    print("=" * 60)
    print("  All seed data loaded successfully!")
    print("=" * 60)
    print()
    print("  Demo accounts:")
    for u in DEMO_USERS:
        print(f"    {u['email']:<30}  {u['password']}  ({u['full_name']}, {u['role'].value})")


def run() -> None:
    asyncio.run(main())


if __name__ == "__main__":
    run()
