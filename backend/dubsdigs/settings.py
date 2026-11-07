import os
from datetime import timedelta
from pathlib import Path
BASE_DIR=Path(__file__).resolve().parent.parent
SECRET_KEY=os.getenv('SECRET_KEY','dev-only-change-me')
DEBUG=os.getenv('DEBUG','1')=='1'
ALLOWED_HOSTS=os.getenv('ALLOWED_HOSTS','*').split(',')
INSTALLED_APPS=['daphne','django.contrib.admin','django.contrib.auth','django.contrib.contenttypes','django.contrib.sessions','django.contrib.messages','django.contrib.staticfiles','rest_framework','corsheaders','channels','core']
MIDDLEWARE=['corsheaders.middleware.CorsMiddleware','django.middleware.security.SecurityMiddleware','django.contrib.sessions.middleware.SessionMiddleware','django.middleware.common.CommonMiddleware','django.middleware.csrf.CsrfViewMiddleware','django.contrib.auth.middleware.AuthenticationMiddleware','django.contrib.messages.middleware.MessageMiddleware']
ROOT_URLCONF='dubsdigs.urls'
ASGI_APPLICATION='dubsdigs.asgi.application'
TEMPLATES=[{'BACKEND':'django.template.backends.django.DjangoTemplates','APP_DIRS':True,'OPTIONS':{'context_processors':['django.template.context_processors.request','django.contrib.auth.context_processors.auth','django.contrib.messages.context_processors.messages']}}]
if os.getenv('POSTGRES_HOST'):  # PostgreSQL (docker-compose / production)
    DATABASES={'default':{'ENGINE':'django.db.backends.postgresql','NAME':os.getenv('POSTGRES_DB','dubsdigs'),'USER':os.getenv('POSTGRES_USER','dubsdigs'),'PASSWORD':os.getenv('POSTGRES_PASSWORD',''),'HOST':os.environ['POSTGRES_HOST'],'PORT':os.getenv('POSTGRES_PORT','5432')}}
else:  # quick local start without Postgres
    DATABASES={'default':{'ENGINE':'django.db.backends.sqlite3','NAME':BASE_DIR/'db.sqlite3'}}
CHANNEL_LAYERS={'default':{'BACKEND':'channels_redis.core.RedisChannelLayer','CONFIG':{'hosts':[os.environ['REDIS_URL']]}}} if os.getenv('REDIS_URL') else {'default':{'BACKEND':'channels.layers.InMemoryChannelLayer'}}
AUTH_USER_MODEL='core.User'
AUTH_PASSWORD_VALIDATORS=[{'NAME':'django.contrib.auth.password_validation.MinimumLengthValidator'}]
REST_FRAMEWORK={'DEFAULT_AUTHENTICATION_CLASSES':['rest_framework_simplejwt.authentication.JWTAuthentication'],'DEFAULT_PERMISSION_CLASSES':['rest_framework.permissions.IsAuthenticated']}
SIMPLE_JWT={'ACCESS_TOKEN_LIFETIME':timedelta(hours=8)}
CORS_ALLOW_ALL_ORIGINS=DEBUG
STATIC_URL='static/'
DEFAULT_AUTO_FIELD='django.db.models.BigAutoField'
