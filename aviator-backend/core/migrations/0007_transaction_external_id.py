from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_agency_bonus"),
    ]

    operations = [
        migrations.AddField(
            model_name="transaction",
            name="external_id",
            field=models.CharField(blank=True, db_index=True, default="", max_length=64),
        ),
    ]
