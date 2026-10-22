# LifeLink — blood donor coordination & showcase

A red-and-white React application backed by FastAPI and a real SQLite `.db` file. This rebuild replaces the original browser-only prototype: accounts, requests and responses persist after refresh, and donor contacts are no longer embedded in public JSON.

**Start with the local showcase. No API keys, paid services, MySQL or PostgreSQL are required.**

This is a college demonstration and coordination prototype, **not a medical or emergency service**. All bundled donors and blood banks are fictional. Do not call or travel to demo facilities. Compatibility and eligibility require professional confirmation.

## 1. What is included

- Responsive overview, donor finder, clustered map, request board and blood-bank directory.
- Registration, hashed passwords, login/logout, private profiles and server-side sessions.
- Requester, donor, blood-bank operator and administrator roles.
- Blood-request creation, matching, edit/radius expansion, cancellation, expiry and fulfilment.
- Separate donor acceptance/rejection; requester updates within approximately four seconds.
- Consent-based contact reveal, reports, blocking and audit logs.
- In-app notifications, availability settings and requester-reported completion history.
- Admin account moderation, request cancellation, directory verification and CSV/JSON imports.
- Private document upload/download (PDF/PNG/JPEG, maximum 2 MB).
- 24 fictional donor profiles, five fictional facilities and five presentation login shortcuts.
- Resettable showcase scenarios and explicitly labelled response simulation.
- Automated backend tests and a two-session browser test script.
- A prebuilt frontend in `frontend/dist`, so running the delivered build only requires Python.

The seeded data is **not an existing real donor database**. Real people must register voluntarily. Demo users only match demo requests; real registrations only match real requests.

## 2. Software requirements

Recommended: **Python 3.12**. Node.js **22.12+** is needed only to edit/rebuild the frontend; the production build was tested on Node 24. Dependencies are pinned in `requirements.txt` and `package-lock.json`.

Official downloads: [Python](https://www.python.org/downloads/), [Node.js](https://nodejs.org/).

Internet is needed to install dependencies and load map tiles. Once installed, local accounts, requests, matching and notifications work without an internet connection. Offline maps display a warning while list results remain usable. Web fonts fall back to system fonts.

## 3. Fastest start — Windows PowerShell

Extract the ZIP first. Open the extracted `lifelink` folder, click the Explorer address bar, type `powershell`, and press Enter. Run commands **one line at a time**.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
Copy-Item .\backend\.env.example .\backend\.env
cd backend
..\.venv\Scripts\python.exe -m app.seed --reset-demo
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open **http://127.0.0.1:8000** in your browser. Keep this terminal open. Press Ctrl+C to stop.

These commands do not require activating the virtual environment, which avoids PowerShell execution-policy problems. If desired, activate from the project root using `.\.venv\Scripts\Activate.ps1`, then use `python` instead of the full executable path. Activation is optional; do not weaken your computer’s security settings just to activate it.

`--reset-demo` clears fictional showcase activity and regenerates dates relative to today. Use it for a fresh presentation; omit it if you want to retain existing demo responses. Normal startup does not reset anything.

If `py -3.12` is unavailable, install Python 3.12 or use a compatible installed interpreter with `python -m venv .venv`.

### Starting again tomorrow

Open PowerShell in `lifelink`:

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Do not reinstall packages or overwrite `.env` every time.

## 4. Fastest start — Linux

Open a terminal in the extracted `lifelink` directory:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
cd backend
../.venv/bin/python -m app.seed --reset-demo
../.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open **http://127.0.0.1:8000**. If your distribution reports that `venv` is missing, install its Python venv package. You may optionally activate with `source .venv/bin/activate` from the project root.

## 5. Frontend development — two terminals

Use this only when editing React/CSS. The fastest-start instructions above already serve the built UI.

### Terminal 1: backend (from the project root)

Windows:

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Linux:

```bash
cd backend
../.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2: frontend (from the project root)

```bash
cd frontend
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Vite proxies `/api` to FastAPI on port 8000, so no frontend API key or URL is needed. Use the same host consistently: do not mix `localhost` and `127.0.0.1` during a session.

After editing, rebuild:

```bash
cd frontend
npm run build
```

Restart FastAPI after creating `dist` for the first time. The same-port build is then available on port 8000. You cannot run this application by double-clicking `index.html` or with a static file server alone.

## 6. Demo login accounts

Open `/demo` and click **Use this account**, or sign in manually. All demo accounts use the password **`LifeLinkDemo!2026`**.

| Role | Email | Purpose |
|---|---|---|
| Requester | `requester@demo.local` | Create a request and see responses |
| O+ donor | `donor.opositive@demo.local` | Accept the Mumbai O+ red-cell request |
| A− donor | `donor.anegative@demo.local` | Show why an incompatible O+ request is absent |
| Blood-bank operator | `bloodbank@demo.local` | Edit assigned demo facility and create requests |
| Administrator | `admin@demo.local` | Moderate, import, inspect audits, reset showcase |

These are intentionally public **development-only** credentials. Never deploy with `DEMO_MODE=true` and real patient data.

## 7. How to present the project

Recommended preparation: reset the demo using the admin showcase controller. This signs demo sessions out. Alternatively run `python -m app.seed --reset-demo` from `backend` using your venv interpreter.

1. Open LifeLink in your normal browser. Show the overview, map and **fictional data** labels.
2. Open **Showcase studio** and sign in as the requester.
3. Click **Create request**. Use patient initials `AB`, group `O+`, component `Red blood cells`, two units, hospital `Presentation Hospital`, city `Mumbai`, radius `100 km`, and a future date/time. Leave hospital coordinates blank to use the city centre.
4. Publish. Show the candidate matches. **There must be no Private contact button before acceptance.**
5. Open an incognito/private window or a different browser. Tabs in the same normal browser share cookies, so merely opening a second tab is insufficient.
6. Open `/demo` there and sign in as `donor.opositive@demo.local`.
7. Find **Presentation Hospital**, then click **Accept** and confirm contact sharing. This is a real database action by a demo account, not automatic acceptance.
8. Return to the requester window. Wait up to four seconds. The response becomes accepted and **Private contact** appears.
9. Open Private contact. Explain that only these two parties can view the permitted email/phone method; even an administrator cannot use this contact endpoint to bypass acceptance.
10. Mark the request fulfilled. Show the completion history. This is labelled requester-reported completion, not a clinically verified donation.
11. Sign in as admin in another separate session and open **Administration → Audit**. Show acceptance, contact authorisation and fulfilment events.

Suggested explanation: “Our application proves the complete coordination workflow using fictional accounts. Real donors would register voluntarily. We do not scrape private phone numbers or pretend demo people can independently respond.”

### Other presentation scenarios

Admin → Showcase:

- **Successful match:** creates a nearby O+ request; switch to donor and respond manually.
- **No nearby donor:** intentionally places a fictional scenario outside the donor region. Explain the empty state and show blood-bank alternatives. Its city label is part of the fictional scenario, not a real location record.
- **Multiple responses:** use O+ donor and another compatible demo donor. One accepts, another declines, and a third remains pending. Additional demo emails are `donor3@demo.local` through `donor24@demo.local`, with the same password. `donor3@demo.local` is O−.
- **Simulation:** admin-only; use a demo match ID from the dashboard/API. Both the response and audit event are marked simulated. It never affects real users. Leaving a match pending demonstrates no response.

Reset before repeating an acceptance presentation: a donor with an active accepted request cannot accept another, and fulfilment pauses their availability until they update their profile.

## 8. DBMS: how SQLite works here

Database file: **`backend/data/lifelink.db`**. No separate database installation, database password or server is needed. Python includes SQLite; SQLAlchemy manages the tables. SQLite fits local and modest-traffic applications, while client/server databases address heavier concurrency requirements. [SQLite guidance](https://www.sqlite.org/whentouse.html)

The file is created automatically on backend startup if absent. A seeded demonstration database is included for convenience. Backend paths are resolved relative to `backend`, not an arbitrary terminal directory.

### Tables and relationships

| Table | Stores |
|---|---|
| `users` | Roles, contact fields, hashed passwords, consent and activation |
| `donor_profiles` | Blood group, rounded area coordinates and availability |
| `blood_requests` | Request owner, hospital, component, deadline and status |
| `donor_matches` | Unique request/donor pair and current response |
| `request_responses` | Response events and simulation label |
| `contact_reveals` | Acceptance-based contact authorisation |
| `donations` | Requester-reported fulfilment history, not clinical proof |
| `blood_banks` | Facility directory, source, review status and operator |
| `notifications` | Private in-app messages and read state |
| `reports`, `blocked_users` | Moderation reports and contact blocking |
| `audit_logs` | Actor, action, target and time; no plaintext secrets |
| `uploaded_documents` | Private file metadata; bytes in `backend/uploads` |
| `user_sessions` | Hashed session tokens, CSRF tokens and expiry |

Requester-specific contact fields live in `users`; an empty redundant `requester_profiles` table was intentionally not added.

Foreign keys are enabled. Unique constraints prevent duplicate emails, match pairs, contact-authorisation records and identical bank name/city pairs. SQLite uses WAL mode and a busy timeout. Acceptance uses a transaction lock to serialize concurrent checks.

### Initialize, seed and reset

Run these from `backend` with the venv’s Python:

```bash
python -m app.manage init
python -m app.seed
python -m app.seed --reset-demo
```

`init` creates missing tables without deleting rows. `seed` is idempotent and requires `DEMO_MODE=true`. `--reset-demo` clears demo accounts, requests, notifications, response histories and related interactions, then recreates demo fixtures. It preserves real accounts and real requests. Old uploaded demo document bytes are not automatically deleted; remove them through a reviewed retention process after backup if needed.

### Inspect data

Use any SQLite viewer on a **backup copy**, such as DB Browser for SQLite, or run read-only Python queries:

```bash
python -c "import sqlite3; c=sqlite3.connect('file:data/lifelink.db?mode=ro',uri=True); print(c.execute('SELECT name FROM sqlite_master WHERE type=\"table\"').fetchall())"
```

Do not post the database publicly once it contains personal data. SQLite here is **not encrypted at rest**. Password hashing does not encrypt phone numbers or medical notes.

### Back up

```bash
python -m app.manage backup --output data/lifelink-backup-01.db
```

The command uses SQLite’s backup API, so it also handles WAL safely. It refuses to overwrite an existing backup filename. Back up `uploads` separately and protect both backups. To restore, stop the server, preserve the current database and WAL files, then restore a verified backup; never copy over a running database.

### Schema changes and PostgreSQL

This release is schema version 1. `create_all` does **not** automatically migrate existing columns. For later code changes: back up, add/review Alembic migrations, test on a copy, then upgrade. Do not delete the production database to fix a schema mismatch.

PostgreSQL is a future migration, not a tested drop-in deployment in this release. Install a PostgreSQL driver, set `DATABASE_URL`, migrate/export data, and replace SQLite-specific acceptance locking with row-level locking. Shared rate limiting and background workers are also required for multiple server processes.

## 9. Maps and APIs — what you actually need

| Feature | Key required? | Included behaviour |
|---|---|---|
| Accounts and SQLite | No | Fully local |
| Matching and notifications | No | Fully local; dashboard polls every four seconds |
| Leaflet map | No | Installed frontend library |
| OpenStreetMap tiles | No | Online tiles with attribution; service limits apply |
| City/locality search | No | Local records and five city centres |
| Current location | No | Optional browser permission |
| SMTP connection test | Optional credentials | Explicit test command only |
| Automatic email / OTP | Not implemented | In-app notifications are the default |
| SMS / WhatsApp | Not implemented | Production extension, not required for the demo |
| Government donor / live stock API | Not connected | Authorised CSV/JSON facility import instead |

### Leaflet and OpenStreetMap

The map URL is configured through `MAP_TILE_URL` in `backend/.env`. Leave the default for a low-traffic local showcase. Leaflet handles map rendering, clustering and markers. [Leaflet](https://leafletjs.com/)

The public OSM tile service is best-effort, not an unlimited production API. Keep visible attribution, allow normal browser caching and referrers, and do not bulk-download/prefetch tiles. Use a suitable provider or self-hosting at larger scale. [Tile usage policy](https://operations.osmfoundation.org/policies/tiles/)

No geocoder is called by this release. City selection searches locally. A new geocoding integration would require backend code, response caching, a provider-specific key if needed and a privacy review. Do not send home addresses or patient information to an external geocoder.

Public Nominatim is **not** wired in. Its policy limits total application traffic to one request per second, forbids autocomplete and systematic scraping, requires identification, and prohibits confidential data. A deliberate compliant integration is required; changing an environment variable alone will not add it. [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/)

### Optional SMTP email connection test

Email is not needed for the showcase. `app.email_test` can verify credentials without sending donor or patient data. Automatic request-email delivery is **not** implemented; do not mistake this test for verified email/OTP or a notification queue.

If your personal Gmail account supports app passwords:

1. Enable two-step verification.
2. Create a dedicated app password in your Google account; some managed/security-restricted accounts do not support this.
3. Put that app password, not your normal password, in `backend/.env`.
4. Keep `.env` private. Revoke the app password when no longer needed.

Google generally recommends supported sign-in integrations over app passwords; this is an optional local SMTP test. [Google instructions](https://support.google.com/accounts/answer/185833)

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-address@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-address@gmail.com
```

From `backend`, explicitly send one test to an address you control:

```bash
python -m app.email_test --to your-address@gmail.com --confirm-send
```

Provider acceptance does not guarantee inbox delivery; check spam. Errors explain configuration failures without logging secrets. Gmail is subject to provider limits, not an unlimited transactional-email service. A provider such as Brevo can supply SMTP credentials instead; consult its [current plans](https://www.brevo.com/pricing/) and verified-sender requirements rather than assuming a trial is permanent.

Before adding automatic email: verify recipient ownership, collect explicit opt-in, build a background queue/retries, avoid medical information in messages, and never send to demo addresses.

### SMS and WhatsApp

There are no SMS/WhatsApp API keys required and no misleading disabled “send SMS” buttons. Connecting them requires new backend adapters and consent/verification workflows, not just pasting a key. SMS commonly involves billing, regional sender rules and anti-abuse limits. WhatsApp requires an authorised business setup, approved messaging workflows and current provider policies. See [Meta’s official WhatsApp documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/overview). Do not use unofficial personal-account automation or claim permanently free delivery.

## 10. Importing an authorised blood-bank database

There is no included public database of personal donor contacts. Facility records may be imported only when you have permission to use the dataset. Public availability does not automatically grant unrestricted reuse.

1. Sign in as administrator.
2. Open **Administration → Import**.
3. Select `backend/sample-data/blood-banks.csv` or `.json` to practise.
4. Click **Validate & preview**.
5. Review every row and error.
6. Click **Import valid records**.
7. Open the blood-bank directory to see the imported record.

Fields: `name`, `city`, `address`, `lat`, `lng`, `source` are required. Optional: `phone`, `hours`, `components`, `demo`. Maximum 500 rows / 1 MB. Duplicate name/city pairs are rejected. Any invalid row prevents committing the import.

New records are unverified. An admin may review the source, then mark a record verified. This is a review label, **not live inventory** or clinical certification. Source and last-updated date remain visible.

Fictional CSVs use `demo=true`. Do not relabel sample facilities as real or use their city-centre markers for travel.

## 11. Real registrations and operator setup

New registrations are always real/non-demo records, even while the showcase is enabled. A real requester will not match fictional donors. To test this, register a consenting adult donor account and a requester account in separate sessions in the same area. Use non-sensitive test data while developing.

Donor registration is limited to adults. The software is not an eligibility assessment. No self-registration route grants administrator or blood-bank privileges.

For a private non-demo deployment, create an operator locally:

```bash
python -m app.manage create-admin --email operator@your-domain.example
```

The password is entered privately in the terminal, not passed in a command argument. Replace the example address with one you control. To assign a facility to an existing dedicated requester/operator account:

```bash
python -m app.manage assign-bank --email bank-operator@your-domain.example --bank-id 1
```

Then configure `DEMO_MODE=false`, use a reviewed real dataset and restart. Demo login, demo endpoints and public demo listings are disabled. This alone does not make the application ready for public medical use.

## 12. Security and privacy design

- bcrypt hashes passwords; raw passwords are not saved.
- An HTTP-only SameSite cookie holds an opaque session token. Only its SHA-256 hash is saved in SQLite.
- Mutations require a matching CSRF header; browser-origin checks and restricted CORS provide additional protection.
- Sessions expire; logout revokes them; password changes revoke all sessions.
- Public routes return explicitly selected fields instead of serializing whole database rows.
- Donor coordinates are rounded to two decimal places before storage. This is approximate location, not anonymity; avoid identifying locality text.
- The contact endpoint checks participation, acceptance, account activation, blocking and request status every time.
- Donors choose one contact method. Acceptance permits that method between both parties. Cancellation/blocking prevents future access, but cannot retract information already seen.
- Role-specific routes enforce server-side permissions, not merely hidden UI controls.
- Basic in-process rate limiting covers login, registration and request creation.
- Uploaded files are size/signature checked, randomly named, outside the frontend and served as attachments only to owner/admin.
- The SQLite file, uploaded files and `.env` are not served as public static files.

Before production: external security/privacy review, secure hosting and encrypted backups, verified accounts, data-erasure/retention procedures, malware scanning for documents, shared rate limits, abuse controls, audit retention and clinical review of every matching assumption are still required.

## 13. Matching rules and limitations

`backend/app/matching.py` keeps the discovery rules separate from routing.

- Red-cell candidates use basic ABO/Rh rules.
- Plasma candidates use reversed ABO logic; clinical handling still requires a specialist.
- Whole blood/platelets use conservative exact-group candidate discovery, not a complete medical compatibility model.
- Geography uses Haversine distance from rounded donor-area coordinates, not road travel distance.
- Availability, a temporary pause, existing accepted commitments and a conservative 120-day recent-donation hold affect selection. This fixed hold is a prototype filter, **not** a medical guideline, and does not model component-specific eligibility.
- Matching considers component, group, radius and availability; request urgency is visible and included in notifications. The current requester candidate list is ordered by distance, not a learned/AI ranking score.
- Verification and response-rate sorting are available in donor search. Response rate is the ratio of non-pending matched requests; it is not a prediction.
- Clinical typing/crossmatching, rare antigens and the recipient’s medical circumstances are outside this prototype. [Red Cross overview](https://www.redcrossblood.org/donate-blood/blood-types.html)

## 14. Tests

From `backend` using the venv interpreter:

```bash
python -m pytest -q
```

Tests create a separate temporary SQLite database. They do not reset your working database. Coverage includes authentication, CSRF, role permissions, private contacts, acceptance/rejection, component matching, distance filtering, imports, private uploads, real/demo separation, blocking, expiry, existing commitments and demo reset.

Optional browser workflow check (after starting backend/frontend and resetting demo data):

```bash
cd frontend
npm install --no-save playwright
npx playwright install chromium
node browser-check.cjs
```

This uses a requester browser context and a separate donor context, verifies contact gating and fulfilment, checks mobile overflow and captures screenshots to `qa`. It creates fictional test activity in the running demo database. Reset the showcase afterward. Never run it against a live production site.

See `TEST_RESULTS.md` for the verification performed on the delivered version.

## 15. Troubleshooting

| Problem | What to do |
|---|---|
| `ModuleNotFoundError` | Install requirements using the exact venv interpreter shown above. Do not mix global Python and venv Python. |
| `No module named app` | Run the server command from the `backend` directory. |
| `npm` / `node` not found | Install Node.js and reopen the terminal. Not required for the included prebuilt UI. |
| Frontend says it cannot reach backend | Start FastAPI on port 8000. Vite’s proxy is configured for that port. |
| Port already in use | Stop the previous server with Ctrl+C or identify the process. Changing the backend port also requires changing Vite’s proxy. |
| Login succeeds but session disappears | Use the same hostname and browser context. Keep `COOKIE_SECURE=false` for local HTTP; use `true` only with HTTPS. |
| CSRF error | Reload the page or sign out/in to fetch the current session token. |
| CORS error | Use the Vite proxy or same-port build. If deliberately changing origins, update `ALLOWED_ORIGINS` and restart. Do not use a wildcard with credentialed requests. |
| SQLite locked | Close write transactions in a database viewer; run one backend process; keep the database on a local writable disk. |
| No matching donors | Check real/demo separation, group, component, radius, availability, recent-donation hold and existing accepted commitments. |
| Donor already responded | Reset demo or create a new request; responses are not silently overwritten. |
| Requests expired | Choose a future deadline or reset demo fixtures. Timestamps are stored as UTC and shown in browser local time. |
| Map is grey | Tiles require internet and may be blocked by the provider/network. List search still works; do not remove attribution or bulk-fetch tiles. |
| Registration phone not verified | Correct: OTP/ownership verification is not implemented. Admin “verified” is a manual review label. |
| Upload rejected | Use PDF/PNG/JPEG up to 2 MB; renaming an HTML file to `.pdf` does not pass signature checks. |
| Old UI after rebuilding | Restart the backend and refresh the browser. Verify you are on the intended port. |

API documentation: **http://127.0.0.1:8000/docs**. Health endpoint: **http://127.0.0.1:8000/api/health**. For authenticated mutations in API clients, first log in, preserve the cookie, and pass the returned `csrf` value as `X-CSRF-Token`.

## 16. Deployment boundaries and remaining work

This release is suitable for a local college showcase. It is not certified, clinically validated or fully production hardened.

- No authorised national donor database or live blood-stock API is connected.
- Email/phone ownership verification, password-recovery emails, automatic email queues, SMS and WhatsApp delivery are not implemented. SMTP is a connection test only.
- No clinical eligibility questionnaire, identity verification service, payment feature or emergency dispatch.
- Availability updates and expiry are processed during API reads/actions rather than by a background scheduler.
- No websocket push: four-second polling is used.
- Admin summaries are live counts/tables rather than decorative chart placeholders.
- Reports and block creation work; a dedicated unblock UI is not yet provided.
- Deactivation is a soft action, not automatic erasure. File retention and account-erasure review require an operator process.
- Document uploads have basic type/size checks, not malware scanning.
- SameSite cookies and CSRF require reviewing reverse-proxy/HTTPS settings before hosting.
- Use one backend worker for the local SQLite/in-memory-rate-limit configuration.
- Do not put writable SQLite on an ephemeral/static frontend host. A persistent server/disk is required. PostgreSQL migration is recommended when concurrency/hosting requirements justify it.
- Vite is a development server; serve `dist` through FastAPI or a reviewed production setup instead of exposing the dev server publicly.
- Third-party services and free plans can change. Verify terms and prices before connecting production accounts.

## 17. File guide

| Path | Purpose |
|---|---|
| `backend/app/main.py` | HTTP API, permission checks and built-frontend serving |
| `backend/app/models.py` | SQLite/SQLAlchemy schema |
| `backend/app/schemas.py` | Input validation |
| `backend/app/security.py` | Passwords, sessions, CSRF and rate limits |
| `backend/app/matching.py` | Candidate compatibility and distance functions |
| `backend/app/services.py` | Matching, audit, expiry and notification services |
| `backend/app/seed.py` | Fictional fixtures and safe demo reset |
| `backend/app/manage.py` | Database init, backup and local role provisioning |
| `backend/app/email_test.py` | Optional explicit SMTP test |
| `backend/tests/test_app.py` | Automated API/security tests |
| `backend/sample-data/` | Safe fictional CSV/JSON import examples |
| `frontend/src/main.jsx` | Pages and workflows |
| `frontend/src/Map.jsx` | Leaflet map, clusters and approximate markers |
| `frontend/src/api.js` | Cookie/CSRF-aware API client |
| `frontend/src/style.css` | Responsive red/white interface |
| `frontend/dist/` | Included ready-to-serve production build |
| `frontend/browser-check.cjs` | Two-browser end-to-end smoke test |

Original source was reviewed, not carried into the rebuilt app: its publicly exposed donor contacts, in-memory registrations and JSON fixtures were replaced. The original ZIP remains a previous version; this README describes LifeLink, not the original prototype.
