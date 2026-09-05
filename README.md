# CLUB 37 — Motorcycle Riding Club Membership Platform

A full-stack membership management system for a motorcycle riding club.
Applications go through a real review workflow — **submitting a form never
makes someone a member**. An admin must approve the application first.

```
REGISTER → PENDING → ADMIN REVIEW → APPROVE → MEMBER CREATED → PUBLIC MEMBER
```

---

## 1. Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript (no build step required)
- **Backend:** Node.js + Express.js (REST API)
- **Database:** MongoDB Atlas + Mongoose
- **Auth:** bcrypt password hashing + JWT stored in a secure HTTP-only cookie
- **Images:** Cloudinary (server-side upload only)
- **Notifications:** WhatsApp Business Cloud API (Meta)

---

## 2. Project structure

```
club37/
├── frontend/          # Static site — deploy anywhere (Netlify, Vercel, S3, nginx...)
│   ├── index.html
│   ├── join.html
│   ├── members.html
│   ├── admin-login.html
│   ├── admin.html
│   ├── style.css
│   └── script.js
│
├── backend/           # Node/Express API — deploy anywhere Node runs
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── config/database.js
│   ├── models/{Application,Member,Admin,Counter}.js
│   ├── routes/{applications,members,admin}.js
│   ├── controllers/{applicationController,memberController,adminController}.js
│   ├── middleware/{auth,upload}.js
│   ├── services/{whatsapp,cloudinary}.js
│   └── scripts/createAdmin.js
│
└── README.md
```

---

## 3. Prerequisites

### 3.1 Install Node.js

Download and install Node.js 18 LTS or newer from https://nodejs.org.
Verify the install:

```bash
node -v
npm -v
```

### 3.2 Create a MongoDB Atlas database

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a new **Project**, then build a free **M0 cluster**.
3. Under **Database Access**, create a database user with a strong password.
4. Under **Network Access**, add your current IP (or `0.0.0.0/0` while developing — restrict this for production).
5. Click **Connect → Drivers**, copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/club37?retryWrites=true&w=majority
   ```
6. Replace `<username>` and `<password>` with your database user's credentials. This full string is your `MONGODB_URI`.

### 3.3 Configure Cloudinary (profile photo storage)

1. Sign up at https://cloudinary.com (free tier is enough to start).
2. From your Cloudinary dashboard, copy:
   - Cloud name
   - API Key
   - API Secret
3. These map directly to `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

### 3.4 Configure WhatsApp Business Cloud API

Club 37 uses Meta's official WhatsApp Business Cloud API — not a `wa.me` link — so new applications can trigger a real backend-to-WhatsApp notification.

1. Create a Meta developer account at https://developers.facebook.com.
2. Create a new **App** → add the **WhatsApp** product.
3. In the WhatsApp product's **API Setup** page you'll find:
   - A temporary access token (or generate a permanent one via a System User for production)
   - A **Phone Number ID**
4. Add the admin's WhatsApp number (in E.164 format, digits only, no `+`) as the recipient you want to test with, and verify it if using a test number.
5. Map these to `.env`:
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `ADMIN_WHATSAPP_NUMBER` (the admin's number that should receive alerts)
6. Full docs: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started

If you skip this step, the app still works — applications are still saved to MongoDB — but the backend will log a WhatsApp send failure instead of notifying the admin. The application is never lost.

---

## 4. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in every value:

```
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000,http://127.0.0.1:5500

MONGODB_URI=your-mongodb-atlas-connection-string

JWT_SECRET=generate-a-long-random-string
JWT_EXPIRES_IN=8h
COOKIE_SECRET=generate-another-long-random-string

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

WHATSAPP_API_VERSION=v20.0
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
ADMIN_WHATSAPP_NUMBER=

INITIAL_ADMIN_EMAIL=admin@club37.com
INITIAL_ADMIN_PASSWORD=choose-a-strong-password-10+chars
```

**Generate strong secrets** (run this twice — once for `JWT_SECRET`, once for `COOKIE_SECRET`):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 4.1 Create the first admin account

This creates the only account that can log into `/admin`. It hashes the
password with bcrypt before storing it — nothing is ever saved in plain text.

```bash
npm run create-admin
```

You should see `Created new admin: admin@club37.com`. You can now remove
`INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` from `.env` if you like —
they're only used by this script.

### 4.2 Run the backend

```bash
npm start          # production
npm run dev         # development, auto-restarts on file changes (nodemon)
```

The API will be available at `http://localhost:5000/api`. Check it's alive:

```bash
curl http://localhost:5000/api/health
```

---

## 5. Frontend setup

The frontend is static HTML/CSS/JS — no build step. It calls the backend
using the `API_BASE` constant defined at the top of `frontend/script.js`:

```js
const API_BASE = window.CLUB37_API_BASE || 'http://localhost:5000/api';
```

To point the frontend at a different backend URL (e.g. in production), set
`window.CLUB37_API_BASE` before `script.js` loads, for example by adding this
line to the `<head>` of each HTML page:

```html
<script>window.CLUB37_API_BASE = 'https://api.yourdomain.com/api';</script>
```

### Run it locally

Any static file server works. For example, from the `frontend/` folder:

```bash
npx serve .
# or
python3 -m http.server 3000
```

Then visit `http://localhost:3000`. Make sure this origin is included in the
backend's `CLIENT_ORIGIN` env var so CORS allows it.

---

## 6. Using the system

1. Visit the home page and click **JOIN CLUB 37** to submit a membership application.
2. The application is saved to MongoDB with `status: PENDING`, and the backend attempts to notify the admin over WhatsApp.
3. Go to `/admin-login.html` and sign in with the admin account you created.
4. In the dashboard, review pending applications and click **APPROVE** or **REJECT**.
5. Approving generates a Member ID (`C37-0001`, `C37-0002`, ...), creates a member record, and makes that rider visible on the public `/members.html` page.
6. Rejected or still-pending applicants never appear publicly.

---

## 7. API reference

**Public**
```
POST /api/applications              Submit a membership application (multipart/form-data)
GET  /api/members                   List ACTIVE members only
```

**Admin** (require an authenticated admin session cookie)
```
POST   /api/admin/login
POST   /api/admin/logout
GET    /api/admin/me
GET    /api/admin/stats

GET    /api/admin/applications?status=PENDING|APPROVED|REJECTED
GET    /api/admin/applications/:id
POST   /api/admin/applications/:id/approve
POST   /api/admin/applications/:id/reject

GET    /api/admin/members?status=ACTIVE|REMOVED
PATCH  /api/admin/members/:id
DELETE /api/admin/members/:id            (soft-delete by default; ?hard=true permanently deletes)
```

---

## 8. Security notes

- Admin passwords are hashed with **bcrypt** (cost factor 12) — never stored in plain text.
- The admin session is a **JWT inside an HTTP-only, SameSite cookie** — it is never accessible to frontend JavaScript and is never stored in `localStorage`.
- All secrets (MongoDB URI, JWT secret, Cloudinary secret, WhatsApp token) live only in the backend's `.env` file, which is excluded from version control via `.gitignore`.
- `helmet`, `express-mongo-sanitize`, and rate limiting are applied on the backend.
- The public `/api/members` endpoint can only ever return members with `status: ACTIVE` — this is enforced in the controller, not trusted from the frontend.
- Every admin-only route requires a valid, verified session (`requireAdmin` middleware) — the frontend cannot fake this.
- Application/member IDs are generated **only** on the backend using an atomic MongoDB counter, so IDs can't collide even with concurrent requests.

---

## 9. Deployment

### Backend
Deploy `backend/` to any Node host (Render, Railway, Fly.io, an EC2/VM, etc.):
1. Set all the environment variables from `.env.example` in your host's dashboard/secrets manager — do not upload `.env` itself.
2. Set `NODE_ENV=production` so cookies are marked `secure`.
3. Set `CLIENT_ORIGIN` to your deployed frontend's exact URL(s).
4. Start command: `npm start`.
5. Put the API behind HTTPS (most hosts provide this automatically).

### Frontend
Deploy `frontend/` to any static host (Netlify, Vercel, Cloudflare Pages, S3 + CloudFront, nginx):
1. Set `window.CLUB37_API_BASE` to your deployed backend's HTTPS URL (see section 5).
2. Ensure the frontend is served over HTTPS so cookies work correctly cross-site with `SameSite=lax`/secure settings.

### Securing production
- Rotate `JWT_SECRET` and `COOKIE_SECRET` if ever exposed.
- Restrict MongoDB Atlas Network Access to your backend host's IP range instead of `0.0.0.0/0`.
- Use a permanent WhatsApp access token (System User token) rather than the 24-hour temporary token from the Meta dashboard.
- Regularly review the admins collection; only add trusted people via `scripts/createAdmin.js` (or write a similar script) rather than exposing a public admin-signup endpoint.
- Keep dependencies updated: `npm audit` and `npm outdated` periodically.

---

## 10. Troubleshooting

- **CORS errors in the browser console:** confirm the frontend's exact origin is listed in the backend's `CLIENT_ORIGIN`.
- **"Unauthorized access" right after logging in:** confirm the frontend and backend are both on HTTPS in production (or both on plain HTTP in local dev) and that `credentials: 'include'` requests aren't being blocked by a cookie/SameSite mismatch.
- **WhatsApp notification not arriving:** check the backend logs for `[whatsapp] Failed to notify admin...` — the application is still saved in MongoDB regardless. Confirm your access token hasn't expired (temporary tokens expire in 24 hours) and that the recipient number is verified in your Meta app if you're still in development mode.
- **Images not uploading:** verify all three Cloudinary env vars are set and that the file is under 5MB and a JPEG/PNG/WEBP.
