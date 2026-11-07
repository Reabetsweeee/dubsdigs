from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.db import models

ROLES = ('student', 'landlord', 'admin', 'manager', 'support')

class BannedLandlord(models.Model):
    id_number = models.CharField(max_length=20, unique=True)
    reason = models.TextField()
    banned_on = models.DateField()

class User(AbstractUser):
    role = models.CharField(max_length=10, default='student', choices=[('student', 'student'), ('landlord', 'landlord'), ('admin', 'admin'), ('manager', 'manager'), ('support', 'support')])
    popia_consent = models.BooleanField(default=False)

class Event(models.Model):
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    starts_at = models.DateTimeField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

class LandlordVerification(models.Model):
    id_number = models.CharField(max_length=20)
    property_description = models.CharField(max_length=200)
    documents = models.JSONField(default=list)
    status = models.CharField(max_length=10, default='pending')
    registry_hit = models.BooleanField(default=False)
    decision_reason = models.TextField(blank=True)
    created = models.DateTimeField(auto_now_add=True)
    decided_by = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, related_name='+', on_delete=models.SET_NULL)
    landlord = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='verifications', on_delete=models.CASCADE)

class Listing(models.Model):
    title = models.CharField(max_length=120)
    area = models.CharField(max_length=80)
    address = models.CharField(max_length=200, blank=True)
    lat = models.FloatField()
    lng = models.FloatField()
    location_verified = models.BooleanField(default=False)
    rent = models.IntegerField()
    prop_type = models.CharField(max_length=60, blank=True)
    rooms = models.JSONField(default=list)
    availability = models.CharField(max_length=20, default='Available')
    wifi = models.BooleanField(default=False)
    furnished = models.BooleanField(default=False)
    laundry = models.BooleanField(default=False)
    cleaning = models.BooleanField(default=False)
    parking = models.BooleanField(default=False)
    study = models.BooleanField(default=False)
    recreation = models.BooleanField(default=False)
    security = models.JSONField(default=list)
    rating = models.FloatField(default=0)
    reviews = models.IntegerField(default=0)
    status = models.CharField(max_length=10, default='active')
    verified = models.BooleanField(default=False)
    banned = models.BooleanField(default=False)
    renewed_year = models.IntegerField(default=2026)
    landlord = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='listings', on_delete=models.CASCADE)

class Application(models.Model):
    status = models.CharField(max_length=10, default='pending')
    room = models.CharField(max_length=40, blank=True)
    note = models.TextField(blank=True)
    created = models.DateTimeField(auto_now_add=True)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='applications', on_delete=models.CASCADE)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE)

class Ticket(models.Model):
    kind = models.CharField(max_length=12, choices=[('maintenance', 'maintenance'), ('cleaning', 'cleaning')])
    description = models.TextField()
    status = models.CharField(max_length=12, default='submitted')
    created = models.DateTimeField(auto_now_add=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, related_name='+', on_delete=models.SET_NULL)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='tickets', on_delete=models.CASCADE)
