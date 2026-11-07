from rest_framework import serializers as s
from . import models as m
UWC=(-33.9328,18.6288)
def km(a,b,c,d):
    from math import radians as r,sin,cos,asin,sqrt
    x,y=r(c-a),r(d-b);h=sin(x/2)**2+cos(r(a))*cos(r(c))*sin(y/2)**2
    return 12742*asin(sqrt(h))
class ListingSerializer(s.ModelSerializer):
    distance_km=s.SerializerMethodField()  # straight-line distance from UWC, not road distance
    def get_distance_km(self,o):return round(km(*UWC,o.lat,o.lng),1)
    class Meta:
        model=m.Listing;fields='__all__';read_only_fields=('landlord','verified','banned','status')
class ApplicationSerializer(s.ModelSerializer):
    student_name=s.CharField(source='student.get_full_name',read_only=True);student_email=s.CharField(source='student.email',read_only=True);listing_title=s.CharField(source='listing.title',read_only=True)
    class Meta:
        model=m.Application;fields='__all__';read_only_fields=('student','status','room','note')
class TicketSerializer(s.ModelSerializer):
    class Meta:
        model=m.Ticket;fields='__all__';read_only_fields=('student','status','assigned_to')
class VerificationSerializer(s.ModelSerializer):
    landlord_name=s.CharField(source='landlord.get_full_name',read_only=True)
    class Meta:
        model=m.LandlordVerification;fields='__all__';read_only_fields=('landlord','status','registry_hit','decision_reason','decided_by')
class EventSerializer(s.ModelSerializer):
    class Meta:
        model=m.Event;fields='__all__';read_only_fields=('created_by',)
