import os
from django.core.asgi import get_asgi_application
os.environ.setdefault('DJANGO_SETTINGS_MODULE','dubsdigs.settings')
django_app=get_asgi_application()
from channels.routing import ProtocolTypeRouter,URLRouter
from django.urls import path
from core.consumers import TicketConsumer
application=ProtocolTypeRouter({'http':django_app,'websocket':URLRouter([path('ws/tickets/',TicketConsumer.as_asgi())])})
