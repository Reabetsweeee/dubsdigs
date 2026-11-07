from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken
from .models import User
class TicketConsumer(AsyncJsonWebsocketConsumer):
    """Live ticket updates. Connect to /ws/tickets/?token=<access JWT>. Students get their own tickets; support staff get the shared queue."""
    @database_sync_to_async
    def _user(self,tok):
        try:return User.objects.get(id=AccessToken(tok)['user_id'])
        except Exception:return None
    async def connect(self):
        u=await self._user(parse_qs(self.scope['query_string'].decode()).get('token',[''])[0])
        if not u or u.role not in('student','support'):return await self.close()
        self.g='support' if u.role=='support' else f'tickets_{u.id}'
        await self.channel_layer.group_add(self.g,self.channel_name);await self.accept()
    async def disconnect(self,code):
        if hasattr(self,'g'):await self.channel_layer.group_discard(self.g,self.channel_name)
    async def ticket_update(self,e):await self.send_json(e['ticket'])
