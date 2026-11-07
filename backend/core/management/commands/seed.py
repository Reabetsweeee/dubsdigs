import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Application, BannedLandlord, Event, LandlordVerification, Listing, Ticket, User

# location_verified stays False: these are approximate area-level positions to replace with verified coordinates
BASE = [('Park Central', 'Bellville CBD', -33.9040, 18.6295), ('Kruskal House', 'Bellville CBD', -33.9013, 18.6338), ('Theresa Court', 'Bellville CBD', -33.9068, 18.6362),
    ('Belpark Residence', 'Bellville Park', -33.9150, 18.6185), ('Barc House', 'Bellville South', -33.9235, 18.6330), ('Jumbo Student Housing', 'Parow', -33.9075, 18.5990),
    ('The Wyne', 'Bellville CBD', -33.9025, 18.6270), ('The Glen', 'Bellville South', -33.9262, 18.6212), ('Simonsberg Residence', 'Bellville', -33.8985, 18.6398),
    ('South Point The Orchard', 'Bellville CBD', -33.9055, 18.6325), ('MM Group Properties', 'Parow', -33.9102, 18.6075), ('Shabs Student Accommodation', 'Belhar', -33.9452, 18.6310)]

def mk(email, pw, role, first, last=''):
    u, _ = User.objects.get_or_create(username=email, defaults=dict(email=email, role=role, first_name=first, last_name=last, popia_consent=True))
    u.set_password(pw)
    u.save()
    return u

class Command(BaseCommand):
    help = 'Create the five role accounts and sample data (safe to run more than once)'
    def handle(self, *a, **k):
        student = mk('thandi@myuwc.ac.za', 'Student@123', 'student', 'Thandi')
        landlord = mk('landlord@dubsdigs.co.za', 'Landlord@123', 'landlord', 'Landlord')
        mk('admin@uwc.ac.za', 'Admin@123', 'admin', 'Admin')
        mk('manager@dubsdigs.co.za', 'Manager@123', 'manager', 'Manager')
        mk('support@dubsdigs.co.za', 'Support@123', 'support', 'Support staff')
        if not Listing.objects.exists():
            r = random.Random(2026)
            yes = lambda p: r.random() < p
            for t, area, la, lo in BASE:
                rooms = [x for x in ('single', 'shared', 'bachelor') if yes(.5)] or [r.choice(('single', 'shared', 'bachelor'))]
                Listing.objects.create(landlord=landlord, title=t, area=area, lat=la, lng=lo, rent=round((3000 + r.random() * 5500) / 50) * 50, verified=True,
                    prop_type=r.choice(['Private residence', 'Student block', 'Shared house', 'Apartment block']), rooms=rooms,
                    availability=r.choice(['Available', 'Available', 'Limited', 'Fully booked']), wifi=yes(.75), furnished=yes(.6), laundry=yes(.6), cleaning=yes(.45),
                    parking=yes(.4), study=yes(.55), recreation=yes(.4), security=[x for x in ('24h guard', 'CCTV', 'Access control', 'Electric fencing') if yes(.55)],
                    rating=round(3 + r.random() * 2, 1), reviews=8 + r.randint(0, 130))
        BannedLandlord.objects.get_or_create(id_number='7911000000084', defaults=dict(reason='Misleading listing photos', banned_on=date(2025, 3, 12)))
        if not LandlordVerification.objects.exists():
            for i, p in [('8503000000086', 'Dlamini Student Flats, Bellville (12 rooms)'), ('7911000000084', 'Naidoo Heights, Parow (8 rooms)'), ('9206000000081', 'Jacobs House, Belhar (5 rooms)')]:
                LandlordVerification.objects.create(landlord=landlord, id_number=i, property_description=p, documents=['Identity document', 'Proof of ownership'],
                    registry_hit=BannedLandlord.objects.filter(id_number=i).exists())
            LandlordVerification.objects.filter(id_number='8503000000086').update(status='approved')  # lets the sample landlord manage listings
        if not Ticket.objects.exists():
            Ticket.objects.create(student=student, kind='maintenance', description='Leaking tap', status='in_progress')
            Ticket.objects.create(student=student, kind='cleaning', description='Room cleaning')
        if not Application.objects.exists():
            Application.objects.create(student=student, listing=Listing.objects.first(), room='Room 12')
        if not Event.objects.exists():
            Event.objects.create(title='Residence meeting', starts_at=timezone.now() + timedelta(days=3), created_by=User.objects.get(username='manager@dubsdigs.co.za'))
        self.stdout.write('Seeded.')
