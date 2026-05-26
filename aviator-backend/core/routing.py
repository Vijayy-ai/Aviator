from django.urls import re_path

from .consumers import GameConsumer, GamePreviewConsumer

websocket_urlpatterns = [
    re_path(r"^ws/game/$", GameConsumer.as_asgi()),
    re_path(r"^ws/game-preview/$", GamePreviewConsumer.as_asgi()),
]

