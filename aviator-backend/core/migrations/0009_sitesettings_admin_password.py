from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0008_wallet_withdraw_requests"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="admin_password_hash",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
    ]
