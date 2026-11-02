from django.core.management.base import BaseCommand

from core.deposit_razorpay import expire_stale_pending_orders


class Command(BaseCommand):
    help = "Mark DepositOrder rows still pending after 60 minutes as expired."

    def add_arguments(self, parser):
        parser.add_argument(
            "--minutes",
            type=int,
            default=60,
            help="Age in minutes after which pending orders expire (default 60).",
        )

    def handle(self, *args, **options):
        minutes = options["minutes"]
        n = expire_stale_pending_orders(older_than_minutes=minutes)
        self.stdout.write(self.style.SUCCESS(f"Expired {n} pending deposit order(s)."))
