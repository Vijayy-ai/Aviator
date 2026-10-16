from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_transaction"),
    ]

    operations = [
        migrations.AddField(
            model_name="bet",
            name="panel",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddConstraint(
            model_name="bet",
            constraint=models.UniqueConstraint(fields=("user", "round", "panel"), name="uniq_user_round_panel"),
        ),
    ]
