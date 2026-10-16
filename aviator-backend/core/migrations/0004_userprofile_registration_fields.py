from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_bet_panel"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="phone",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="invite_code",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="total_bonus",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="today_bonus",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
    ]
