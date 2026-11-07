from django.contrib import admin
from django.urls import path,include
from rest_framework.routers import DefaultRouter
from core import views as v
r=DefaultRouter()
for n,vs in [('listings',v.ListingViewSet),('applications',v.ApplicationViewSet),('tickets',v.TicketViewSet),('verifications',v.VerificationViewSet),('events',v.EventViewSet)]:r.register(n,vs,basename=n)
urlpatterns=[path('admin/',admin.site.urls),path('api/',include(r.urls)),path('api/auth/login/',v.LoginView.as_view()),path('api/auth/register/',v.register),path('api/auth/me/',v.me)]
