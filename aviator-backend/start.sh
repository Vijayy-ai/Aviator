#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Running database migrations..."
python manage.py migrate

echo "🎮 Starting background Aviator Game Loop engine..."
python manage.py run_game_engine &

echo "📡 Starting Daphne ASGI Web Server on port 8000..."
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
