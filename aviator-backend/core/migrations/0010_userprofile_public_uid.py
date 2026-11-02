from django.db import migrations, models


def _column_names(schema_editor, table: str) -> set[str]:
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        if connection.vendor == "sqlite":
            cursor.execute(f"PRAGMA table_info({table})")
            return {row[1] for row in cursor.fetchall()}
        cursor.execute(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_name = %s
            """,
            [table],
        )
        return {row[0] for row in cursor.fetchall()}


def add_public_uid_column(apps, schema_editor):
    table = "core_userprofile"
    if "public_uid" in _column_names(schema_editor, table):
        return
    # SQLite does not support ADD COLUMN IF NOT EXISTS (older builds).
    schema_editor.execute(f"ALTER TABLE {table} ADD COLUMN public_uid varchar(8) NULL")


def add_public_uid_indexes(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        if connection.vendor == "sqlite":
            cursor.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS core_userprofile_public_uid_key "
                "ON core_userprofile (public_uid)"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS core_userprofile_public_uid_a1b2c3d4 "
                "ON core_userprofile (public_uid)"
            )
        else:
            cursor.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS core_userprofile_public_uid_key "
                "ON core_userprofile (public_uid)"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS core_userprofile_public_uid_a1b2c3d4 "
                "ON core_userprofile (public_uid)"
            )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_sitesettings_admin_password"),
    ]

    operations = [
        # Idempotent: backend + game-engine both run migrate on boot; a race
        # can create the column before the other process records the migration.
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="userprofile",
                    name="public_uid",
                    field=models.CharField(
                        blank=True,
                        db_index=True,
                        max_length=8,
                        null=True,
                        unique=True,
                    ),
                ),
            ],
            database_operations=[
                migrations.RunPython(add_public_uid_column, noop_reverse),
                migrations.RunPython(add_public_uid_indexes, noop_reverse),
            ],
        ),
    ]
