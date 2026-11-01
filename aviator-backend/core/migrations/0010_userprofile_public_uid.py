from django.db import migrations, models


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
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE core_userprofile
                    ADD COLUMN IF NOT EXISTS public_uid varchar(8) NULL;
                    CREATE UNIQUE INDEX IF NOT EXISTS core_userprofile_public_uid_key
                        ON core_userprofile (public_uid);
                    CREATE INDEX IF NOT EXISTS core_userprofile_public_uid_a1b2c3d4
                        ON core_userprofile (public_uid);
                    """,
                    reverse_sql="""
                    DROP INDEX IF EXISTS core_userprofile_public_uid_a1b2c3d4;
                    DROP INDEX IF EXISTS core_userprofile_public_uid_key;
                    ALTER TABLE core_userprofile DROP COLUMN IF EXISTS public_uid;
                    """,
                ),
            ],
        ),
    ]
