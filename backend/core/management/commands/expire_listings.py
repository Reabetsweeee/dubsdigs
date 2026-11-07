from django.core.management.base import BaseCommand
from core.models import Listing
class Command(BaseCommand):
    help='Annual renewal: mark listings whose landlord did not renew this academic year as inactive. Run at the start of the academic year.'
    def add_arguments(self,p):p.add_argument('year',type=int)
    def handle(self,*a,year,**k):self.stdout.write(f'{Listing.objects.filter(status="active",renewed_year__lt=year).update(status="inactive")} listings marked inactive.')
