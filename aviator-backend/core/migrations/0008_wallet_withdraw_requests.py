from decimal import Decimal

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0007_transaction_external_id"),
    ]

    operations = [
        migrations.AlterField(
            model_name="userprofile",
            name="fake_wallet_balance",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.CreateModel(
            name="SiteSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("min_deposit", models.DecimalField(decimal_places=2, default=Decimal("500"), max_digits=12)),
                ("min_withdraw", models.DecimalField(decimal_places=2, default=Decimal("1000"), max_digits=12)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Site settings",
                "verbose_name_plural": "Site settings",
            },
        ),
        migrations.CreateModel(
            name="WithdrawRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "status",
                    models.CharField(
                        choices=[("PENDING", "Pending"), ("APPROVED", "Withdrawn"), ("REJECTED", "Rejected")],
                        default="PENDING",
                        max_length=16,
                    ),
                ),
                (
                    "payout_method",
                    models.CharField(choices=[("UPI", "UPI"), ("BANK", "Bank transfer")], max_length=8),
                ),
                ("upi_id", models.CharField(blank=True, default="", max_length=120)),
                ("account_name", models.CharField(blank=True, default="", max_length=120)),
                ("account_number", models.CharField(blank=True, default="", max_length=64)),
                ("ifsc", models.CharField(blank=True, default="", max_length=32)),
                ("bank_name", models.CharField(blank=True, default="", max_length=120)),
                ("admin_note", models.CharField(blank=True, default="", max_length=255)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reviewed_withdrawals",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "transaction",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="withdraw_request",
                        to="core.transaction",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="withdraw_requests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
