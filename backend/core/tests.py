from django.core.management import call_command
from rest_framework.test import APIClient, APITestCase
from core.models import Application, User

class RoleTests(APITestCase):
    def setUp(self):
        call_command('seed', verbosity=0)
    def as_(self, email):
        c = APIClient(); c.force_authenticate(User.objects.get(username=email)); return c
    def test_login_returns_role(self):
        r = APIClient().post('/api/auth/login/', {'username': 'admin@uwc.ac.za', 'password': 'Admin@123'}, format='json')
        self.assertEqual((r.status_code, r.data['role']), (200, 'admin'))
        self.assertEqual(APIClient().post('/api/auth/login/', {'username': 'admin@uwc.ac.za', 'password': 'x'}, format='json').status_code, 401)
    def test_support_cannot_see_applications_or_occupancy_data(self):
        self.assertEqual(self.as_('support@dubsdigs.co.za').get('/api/applications/').status_code, 403)
    def test_filters_work_together(self):
        s = self.as_('thandi@myuwc.ac.za')
        d = s.get('/api/listings/?max_price=5000&max_km=5&amenities=wifi&min_rating=3').data
        self.assertTrue(all(x['rent'] <= 5000 and x['distance_km'] <= 5 and x['wifi'] and x['rating'] >= 3 for x in d))
        self.assertEqual(len(s.get('/api/listings/').data), 12)
    def test_reject_needs_reason(self):
        m, a = self.as_('manager@dubsdigs.co.za'), Application.objects.first()
        self.assertEqual(m.post(f'/api/applications/{a.id}/decision/', {'decision': 'rejected'}, format='json').status_code, 400)
        self.assertEqual(m.post(f'/api/applications/{a.id}/decision/', {'decision': 'rejected', 'reason': 'Room taken'}, format='json').data['status'], 'rejected')
    def test_banned_registry_match_needs_reason_even_to_approve(self):
        a = self.as_('admin@uwc.ac.za'); hit = [v for v in a.get('/api/verifications/').data if v['registry_hit']][0]
        self.assertEqual(a.post(f"/api/verifications/{hit['id']}/decision/", {'decision': 'approved'}, format='json').status_code, 400)
    def test_ticket_flow_and_role_limits(self):
        s = self.as_('thandi@myuwc.ac.za'); t = s.post('/api/tickets/', {'kind': 'maintenance', 'description': 'Broken latch'}, format='json').data
        self.assertEqual(self.as_('support@dubsdigs.co.za').post(f"/api/tickets/{t['id']}/set_status/", {'status': 'accepted'}, format='json').data['status'], 'accepted')
        self.assertEqual(s.post(f"/api/tickets/{t['id']}/set_status/", {'status': 'accepted'}, format='json').status_code, 403)
    def test_compare_needs_two_to_three(self):
        s = self.as_('thandi@myuwc.ac.za')
        self.assertEqual(s.get('/api/listings/compare/?ids=1').status_code, 400)
        self.assertEqual(len(s.get('/api/listings/compare/?ids=1,2,3').data), 3)
