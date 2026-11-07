# DubsDigs

Verified student housing platform for UWC. Stack: React + TypeScript (Vite), Django + Django REST Framework, PostgreSQL, Django Channels + Redis.

## Run everything (Docker)
    docker compose up --build
Frontend: http://localhost:5173  API: http://localhost:8000/api/  Django admin: http://localhost:8000/admin/

## Run without Docker
    cd backend && pip install -r requirements.txt
    python manage.py migrate && python manage.py seed
    daphne -p 8000 dubsdigs.asgi:application        # ASGI server (needed for WebSockets)
    cd ../frontend && npm install && npm run dev      # http://localhost:5173
Without `POSTGRES_HOST` the backend uses SQLite and without `REDIS_URL` an in-memory channel layer, so it starts with nothing else installed.

## Test
    cd backend && python manage.py test

## Development accounts (created by `seed`, username = email)
| Role | Email | Password |
|---|---|---|
| Student | thandi@myuwc.ac.za | Student@123 |
| Landlord | landlord@dubsdigs.co.za | Landlord@123 |
| Admin | admin@uwc.ac.za | Admin@123 |
| Accommodation manager | manager@dubsdigs.co.za | Manager@123 |
| Support staff manager | support@dubsdigs.co.za | Support@123 |
Change these and `SECRET_KEY`/`DEBUG` before any real deployment.

## Layout
- `backend/core/models.py`: User (role), Listing, Application, Ticket, LandlordVerification, BannedLandlord, Event
- `backend/core/views.py`: REST API with default-deny role permissions (`RoleMixin`), listing search/filters/compare, decisions that require reasons, banned-registry cross-check, live ticket push
- `backend/core/consumers.py`: WebSocket `/ws/tickets/?token=<JWT>`
- `backend/core/management/commands/`: `seed` (12 Bellville listings, users, queues), `expire_listings <year>` (annual renewal)
- `frontend/src/`: `api.ts` (JWT session + fetch), `pages.tsx` (landing with video hero, sign-in, student home/requests, role queues with review panels, landlord email link), `Discover.tsx` (Leaflet + OpenStreetMap map: search, filters, popups, details, distance, compare), `styles.css`, `person.ts`

## API
`POST /api/auth/login/` `POST /api/auth/register/` `GET /api/auth/me/` · `GET /api/listings/?q=&min_price=&max_price=&max_km=&room_type=&min_rating=&amenities=wifi,security` · `GET /api/listings/compare/?ids=1,2,3` · `/api/applications/` (+`/{id}/decision/`) · `/api/tickets/` (+`/{id}/set_status/`) · `/api/verifications/` (+`/{id}/decision/`) · `/api/events/`

## Data notes
Seeded prices, ratings, availability and amenities are generated sample data, and listing coordinates are approximate area-level placements (`location_verified=false`). Replace them with real data and verified coordinates before going live. `distance_km` is straight-line distance from UWC, not road distance.

## Not built yet
RoomieFinder and the suitability questionnaire, room swap requests, a live occupancy dashboard, event creation screen, sign-up screen (the `POST /api/auth/register/` endpoint exists), flagged-listing and ban-appeal screens (the ban and annual-renewal logic exist on the backend), reviews and reports, server-side file upload for landlord documents, and production hardening (HTTPS, secrets, rate limiting).
