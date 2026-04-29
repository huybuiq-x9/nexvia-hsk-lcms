import asyncio
import uuid
from datetime import datetime

from sqlalchemy import text

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.shared.enums import UserRole


ADMIN_EMAIL = "admin@nexvia.vn"
ADMIN_PASSWORD = "Admin123@"
ADMIN_FULL_NAME = "Nexvia Admin"


DEMO_USERS = [
    {"email": "admin@nexvia.vn", "password": "Admin123@", "full_name": "Nexvia Admin", "role": UserRole.ADMIN},
    {"email": "teacher01@nexvia.vn", "password": "Teacher123@", "full_name": "Nguyễn Văn An", "role": UserRole.TEACHER},
    {"email": "teacher02@nexvia.vn", "password": "Teacher123@", "full_name": "Trần Thị Bình", "role": UserRole.TEACHER},
    {"email": "teacher03@nexvia.vn", "password": "Teacher123@", "full_name": "Lê Hoàng Cường", "role": UserRole.TEACHER},
    {"email": "teacher04@nexvia.vn", "password": "Teacher123@", "full_name": "Phạm Minh Đức", "role": UserRole.TEACHER},
    {"email": "teacher05@nexvia.vn", "password": "Teacher123@", "full_name": "Hoàng Thu Hà", "role": UserRole.TEACHER},
    {"email": "teacher06@nexvia.vn", "password": "Teacher123@", "full_name": "Đặng Quang Huy", "role": UserRole.TEACHER},
    {"email": "teacher07@nexvia.vn", "password": "Teacher123@", "full_name": "Vũ Thị Lan", "role": UserRole.TEACHER},
    {"email": "teacher08@nexvia.vn", "password": "Teacher123@", "full_name": "Bùi Đình Nam", "role": UserRole.TEACHER},
    {"email": "teacher09@nexvia.vn", "password": "Teacher123@", "full_name": "Ngô Thị Phương", "role": UserRole.TEACHER},
    {"email": "teacher10@nexvia.vn", "password": "Teacher123@", "full_name": "Trịnh Gia Khánh", "role": UserRole.TEACHER},
    {"email": "expert01@nexvia.vn", "password": "Expert123@", "full_name": "Lý Minh Tuấn", "role": UserRole.EXPERT},
    {"email": "expert02@nexvia.vn", "password": "Expert123@", "full_name": "Phan Thị Mai Anh", "role": UserRole.EXPERT},
    {"email": "expert03@nexvia.vn", "password": "Expert123@", "full_name": "Đỗ Đức Minh", "role": UserRole.EXPERT},
    {"email": "expert04@nexvia.vn", "password": "Expert123@", "full_name": "Cao Thị Hương Giang", "role": UserRole.EXPERT},
    {"email": "expert05@nexvia.vn", "password": "Expert123@", "full_name": "Nguyễn Đình Long", "role": UserRole.EXPERT},
    {"email": "expert06@nexvia.vn", "password": "Expert123@", "full_name": "Trương Thanh Sơn", "role": UserRole.EXPERT},
    {"email": "expert07@nexvia.vn", "password": "Expert123@", "full_name": "Lê Thu Hồng", "role": UserRole.EXPERT},
    {"email": "expert08@nexvia.vn", "password": "Expert123@", "full_name": "Chu Văn Thắng", "role": UserRole.EXPERT},
    {"email": "expert09@nexvia.vn", "password": "Expert123@", "full_name": "Đinh Thị Thu Trang", "role": UserRole.EXPERT},
    {"email": "expert10@nexvia.vn", "password": "Expert123@", "full_name": "Hồ Anh Tuấn", "role": UserRole.EXPERT},
    {"email": "converter01@nexvia.vn", "password": "Converter123@", "full_name": "Võ Thị Kim Oanh", "role": UserRole.CONVERTER},
    {"email": "converter02@nexvia.vn", "password": "Converter123@", "full_name": "Đinh Quang Vũ", "role": UserRole.CONVERTER},
    {"email": "converter03@nexvia.vn", "password": "Converter123@", "full_name": "Bạch Thị Hà My", "role": UserRole.CONVERTER},
    {"email": "converter04@nexvia.vn", "password": "Converter123@", "full_name": "Trần Văn Bảo", "role": UserRole.CONVERTER},
    {"email": "converter05@nexvia.vn", "password": "Converter123@", "full_name": "Phạm Thị Ngọc Mai", "role": UserRole.CONVERTER},
    {"email": "converter06@nexvia.vn", "password": "Converter123@", "full_name": "Lưu Đức Hùng", "role": UserRole.CONVERTER},
    {"email": "converter07@nexvia.vn", "password": "Converter123@", "full_name": "Tạ Thị Minh Châu", "role": UserRole.CONVERTER},
    {"email": "converter08@nexvia.vn", "password": "Converter123@", "full_name": "Phan Văn Đạt", "role": UserRole.CONVERTER},
    {"email": "converter09@nexvia.vn", "password": "Converter123@", "full_name": "Nguyễn Thị Thanh Thảo", "role": UserRole.CONVERTER},
    {"email": "converter10@nexvia.vn", "password": "Converter123@", "full_name": "Hoàng Văn Minh", "role": UserRole.CONVERTER},
]


async def _seed_single_user(
    db,
    email: str,
    password: str,
    full_name: str,
    role: UserRole,
) -> None:
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
                    is_active, is_superadmin, avatar_url, deleted_at
                )
                VALUES (
                    :id, :email, :hashed_password, :full_name,
                    TRUE, :is_superadmin, NULL, NULL
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
            "assigned_at": datetime.utcnow(),
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


async def seed_admin_user() -> None:
    async with AsyncSessionLocal() as db:
        await _seed_single_user(
            db,
            email=ADMIN_EMAIL,
            password=ADMIN_PASSWORD,
            full_name=ADMIN_FULL_NAME,
            role=UserRole.ADMIN,
        )
        await db.commit()


async def seed_demo_users() -> None:
    async with AsyncSessionLocal() as db:
        print("Seeding demo users...")
        for user in DEMO_USERS:
            await _seed_single_user(
                db,
                email=user["email"],
                password=user["password"],
                full_name=user["full_name"],
                role=user["role"],
            )
        await db.commit()
        print(f"Done! {len(DEMO_USERS)} users seeded.")


def main() -> None:
    asyncio.run(seed_demo_users())


if __name__ == "__main__":
    main()
