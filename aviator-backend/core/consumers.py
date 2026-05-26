import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .preview_state import get_preview_state


class GameConsumer(AsyncWebsocketConsumer):
    group_name = "game_global"

    async def connect(self):
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def game_event(self, event):
        payload = event.get("payload", {})
        await self.send(text_data=json.dumps(payload))


class GamePreviewConsumer(AsyncWebsocketConsumer):
    """Partner / second-site feed — includes current + next round crash (display only)."""

    group_name = "game_preview_global"

    async def connect(self):
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        snapshot = await sync_to_async(get_preview_state)()
        if snapshot:
            await self.send(text_data=json.dumps(snapshot))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def game_event(self, event):
        payload = event.get("payload", {})
        await self.send(text_data=json.dumps(payload))

