from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0012_min_deposit_one"),
    ]

    operations = [
        migrations.CreateModel(
            name="SupportChat",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("OPEN", "Open"), ("CLOSED", "Closed")], db_index=True, default="OPEN", max_length=16)),
                ("last_message", models.CharField(blank=True, default="", max_length=500)),
                ("last_sender", models.CharField(blank=True, default="", max_length=8)),
                ("last_message_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("unread_for_admin", models.PositiveIntegerField(default=0)),
                ("unread_for_user", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="support_chat",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-last_message_at", "-updated_at"],
            },
        ),
        migrations.CreateModel(
            name="SupportMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sender", models.CharField(choices=[("user", "User"), ("admin", "Admin")], max_length=8)),
                ("text", models.TextField(max_length=2000)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "chat",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="messages",
                        to="core.supportchat",
                    ),
                ),
            ],
            options={
                "ordering": ["id"],
            },
        ),
    ]
