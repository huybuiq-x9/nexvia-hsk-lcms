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


async def seed_admin_user() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": ADMIN_EMAIL},
        )
        user_id = result.scalar_one_or_none()
        hashed_password = get_password_hash(ADMIN_PASSWORD)

        if user_id is None:
            user_id = uuid.uuid4()
            await db.execute(
                text(
                    """
                    INSERT INTO users (
                        id,
                        email,
                        hashed_password,
                        full_name,
                        is_active,
                        is_superadmin,
                        avatar_url,
                        deleted_at
                    )
                    VALUES (
                        :id,
                        :email,
                        :hashed_password,
                        :full_name,
                        TRUE,
                        TRUE,
                        NULL,
                        NULL
                    )
                    """
                ),
                {
                    "id": user_id,
                    "email": ADMIN_EMAIL,
                    "hashed_password": hashed_password,
                    "full_name": ADMIN_FULL_NAME,
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
                        is_superadmin = TRUE
                    WHERE id = :id
                    """
                ),
                {
                    "id": user_id,
                    "hashed_password": hashed_password,
                    "full_name": ADMIN_FULL_NAME,
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
            {"user_id": user_id, "role": UserRole.ADMIN.value},
        )
        role_id = role_result.scalar_one_or_none()

        if role_id is None:
            insert_columns = ["id", "user_id", "role", "assigned_at", "deleted_at"]
            insert_values = [":id", ":user_id", ":role", ":assigned_at", "NULL"]
            params = {
                "id": uuid.uuid4(),
                "user_id": user_id,
                "role": UserRole.ADMIN.value,
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

        await db.commit()
        print(f"Admin user {action}: {ADMIN_EMAIL}")


def main() -> None:
    asyncio.run(seed_admin_user())


if __name__ == "__main__":
    main()
