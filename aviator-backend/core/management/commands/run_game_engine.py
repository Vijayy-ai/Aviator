import asyncio

from django.core.management.base import BaseCommand

from core.game_engine import run_game_engine_forever


class Command(BaseCommand):
    help = "Run the Aviator game engine loop (broadcasts to WS clients)."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting game engine..."))
        asyncio.run(run_game_engine_forever())

