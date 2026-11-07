from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import viewsets,permissions as P
from rest_framework.decorators import action,api_view,permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from . import models as m, serializers as s
ALL=m.ROLES;AM={'wifi','furnished','laundry','cleaning','parking','study','recreation','security'}
def role(*rs):
    class R(P.BasePermission):
        def has_permission(self,req,view):return bool(req.user.is_authenticated and req.user.role in rs)
    return R
class RoleMixin:
    """Role-based access control: every action must be explicitly allowed for a role (default deny)."""
    roles={}
    def get_permissions(self):return [P.IsAuthenticated(),role(*self.roles.get(self.action,()))()]
class TokenSer(TokenObtainPairSerializer):
    def validate(self,a):
        d=super().validate(a);d['role']=self.user.role;d['name']=self.user.first_name or self.user.username;return d
class LoginView(TokenObtainPairView):serializer_class=TokenSer
@api_view(['POST'])
@permission_classes([P.AllowAny])
def register(req):
    d=req.data
    if d.get('role') not in('student','landlord'):raise ValidationError({'role':'Only students and landlords can register.'})
    if not d.get('email') or len(d.get('password',''))<8:raise ValidationError({'detail':'Valid email and a password of at least 8 characters are required.'})
    if not d.get('popia_consent'):raise ValidationError({'popia_consent':'Consent is required.'})
    if m.User.objects.filter(username=d['email']).exists():raise ValidationError({'email':'Already registered.'})
    u=m.User.objects.create_user(username=d['email'],email=d['email'],password=d['password'],first_name=d.get('first_name',''),last_name=d.get('last_name',''),role=d['role'],popia_consent=True)
    return Response({'id':u.id,'role':u.role},status=201)
@api_view(['GET'])
def me(req):u=req.user;return Response({'id':u.id,'email':u.email,'name':u.get_full_name() or u.username,'role':u.role})
def push(group,t):async_to_sync(get_channel_layer().group_send)(group,{'type':'ticket.update','ticket':{'id':t.id,'kind':t.kind,'description':t.description,'status':t.status}})
def decide(obj,req,ok,no,needs_reason):
    d=req.data.get('decision');note=(req.data.get('reason') or req.data.get('note') or '').strip()
    if d not in(ok,no):raise ValidationError({'decision':f'Must be {ok} or {no}.'})
    if not note and (d==no or needs_reason):raise ValidationError({'reason':'A reason is required for this decision.'})
    return d,note
class ListingViewSet(RoleMixin,viewsets.ModelViewSet):
    serializer_class=s.ListingSerializer
    roles={'list':ALL,'retrieve':ALL,'compare':('student',),'mine':('landlord',),'create':('landlord',),'update':('landlord',),'partial_update':('landlord',),'destroy':('landlord',),'ban':('admin',)}
    def get_queryset(self):
        if self.action in('update','partial_update','destroy','mine'):return m.Listing.objects.filter(landlord=self.request.user)
        if self.action=='ban':return m.Listing.objects.all()
        return m.Listing.objects.filter(status='active',banned=False,verified=True)  # banned/inactive listings never reach search
    def list(self,req):
        p=req.query_params;rows=[]
        for x in self.get_queryset().order_by('id'):
            if p.get('q') and p['q'].lower() not in x.title.lower():continue
            if p.get('min_price') and x.rent<int(p['min_price']):continue
            if p.get('max_price') and x.rent>int(p['max_price']):continue
            if p.get('max_km') and s.km(*s.UWC,x.lat,x.lng)>float(p['max_km']):continue
            if p.get('room_type') and not any(t in x.rooms for t in p['room_type'].split(',')):continue
            if p.get('min_rating') and x.rating<float(p['min_rating']):continue
            if any(not (bool(x.security) if a=='security' else getattr(x,a)) for a in p.get('amenities','').split(',') if a in AM):continue
            rows.append(x)
        return Response(self.get_serializer(rows,many=True).data)
    @action(detail=False)
    def compare(self,req):
        ids=[int(i) for i in req.query_params.get('ids','').split(',') if i.isdigit()]
        if not 2<=len(ids)<=3:raise ValidationError({'ids':'Select 2 to 3 listings.'})
        return Response(self.get_serializer(self.get_queryset().filter(id__in=ids),many=True).data)
    @action(detail=False)
    def mine(self,req):return Response(self.get_serializer(self.get_queryset(),many=True).data)
    def perform_create(self,ser):
        if not m.LandlordVerification.objects.filter(landlord=self.request.user,status='approved').exists():raise ValidationError({'detail':'Your landlord account must be verified before you can list.'})
        ser.save(landlord=self.request.user,verified=True)
    @action(detail=True,methods=['post'])
    def ban(self,req,pk=None):  # listing leaves search, history (reviews/flags) is kept
        x=self.get_object();x.banned=True;x.status='removed';x.save();return Response({'status':'removed'})
class ApplicationViewSet(RoleMixin,viewsets.ModelViewSet):
    serializer_class=s.ApplicationSerializer;http_method_names=['get','post','head','options']
    roles={'list':('student','landlord','manager'),'retrieve':('student','landlord','manager'),'create':('student',),'decision':('manager',)}
    def get_queryset(self):
        u=self.request.user;q=m.Application.objects.select_related('student','listing')
        return q.filter(student=u) if u.role=='student' else q.filter(listing__landlord=u) if u.role=='landlord' else q
    def perform_create(self,ser):ser.save(student=self.request.user)
    @action(detail=True,methods=['post'])
    def decision(self,req,pk=None):
        a=self.get_object();d,n=decide(a,req,'approved','rejected',False)
        a.status=d;a.note=n;a.room=req.data.get('room',a.room);a.save();return Response(self.get_serializer(a).data)
class TicketViewSet(RoleMixin,viewsets.ModelViewSet):
    serializer_class=s.TicketSerializer;http_method_names=['get','post','head','options']
    roles={'list':('student','support'),'retrieve':('student','support'),'create':('student',),'set_status':('support',)}
    def get_queryset(self):
        u=self.request.user;return m.Ticket.objects.filter(student=u) if u.role=='student' else m.Ticket.objects.all()
    def perform_create(self,ser):t=ser.save(student=self.request.user);push('support',t)
    @action(detail=True,methods=['post'])
    def set_status(self,req,pk=None):
        t=self.get_object();st=req.data.get('status')
        if st not in('accepted','rejected','in_progress','completed'):raise ValidationError({'status':'Invalid status.'})
        t.status=st;t.assigned_to=req.user if st=='accepted' else t.assigned_to;t.save();push(f'tickets_{t.student_id}',t);push('support',t)
        return Response(self.get_serializer(t).data)
class VerificationViewSet(RoleMixin,viewsets.ModelViewSet):
    serializer_class=s.VerificationSerializer;http_method_names=['get','post','head','options']
    roles={'list':('landlord','admin'),'retrieve':('landlord','admin'),'create':('landlord',),'decision':('admin',)}
    def get_queryset(self):
        u=self.request.user;q=m.LandlordVerification.objects.select_related('landlord');return q.filter(landlord=u) if u.role=='landlord' else q
    def perform_create(self,ser):  # automatic banned-registry cross-check by ID number
        ser.save(landlord=self.request.user,registry_hit=m.BannedLandlord.objects.filter(id_number=ser.validated_data['id_number']).exists())
    @action(detail=True,methods=['post'])
    def decision(self,req,pk=None):
        v=self.get_object();d,n=decide(v,req,'approved','rejected',v.registry_hit)  # a registry match needs a written reason even to approve
        v.status=d;v.decision_reason=n;v.decided_by=req.user;v.save();return Response(self.get_serializer(v).data)
class EventViewSet(RoleMixin,viewsets.ModelViewSet):
    serializer_class=s.EventSerializer;queryset=m.Event.objects.order_by('starts_at');http_method_names=['get','post','head','options']
    roles={'list':ALL,'retrieve':ALL,'create':('manager',)}
    def perform_create(self,ser):ser.save(created_by=self.request.user)
