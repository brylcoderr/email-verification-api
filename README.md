# ✉️ Email Validation API

A fast, self-hosted REST API for validating email addresses. Checks syntax, MX records, disposable domains, role-based addresses, free providers, and common typos.

Deploy it to [Render](https://render.com) in under 2 minutes.

---

## 🚀 Deploy to Render

### Option A — Blueprint (recommended)

1. Push this repo to GitHub / GitLab.
2. Go to **render.com → New → Blueprint**.
3. Connect your repo — Render will detect `render.yaml` and configure everything automatically.
4. Click **Deploy**.

### Option B — Manual

1. **New → Web Service** on Render.
2. Connect your repo.
3. Set:
   - **Runtime**: Node
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Health check path**: `/health`
4. Add environment variables (see below).
5. Deploy.

---

## ⚙️ Environment Variables

| Variable     | Default | Description                                               |
|--------------|---------|-----------------------------------------------------------|
| `PORT`       | `3000`  | Port the server listens on (Render sets this for you)     |
| `API_KEY`    | *(none)*| If set, all requests must include this key                |
| `RATE_LIMIT` | `60`    | Max requests per IP per minute                            |
| `MAX_BULK`   | `50`    | Max emails per bulk request                               |

---

## 🔑 Authentication

Authentication is **optional**. Set the `API_KEY` environment variable to enable it.

Pass the key via:
- Header: `x-api-key: YOUR_KEY`
- Query param: `?api_key=YOUR_KEY`

---

## 📡 Endpoints

### `GET /health`
Returns server status.

```json
{ "status": "ok", "timestamp": "2024-01-15T10:30:00.000Z" }
```

---

### `GET /validate?email=user@example.com`
### `POST /validate`  →  `{ "email": "user@example.com" }`

Validate a single email address.

**Response:**
```json
{
  "email": "user@example.com",
  "valid": true,
  "score": 80,
  "checks": {
    "syntax": true,
    "mxRecords": true,
    "notDisposable": true,
    "notRoleBased": true
  },
  "meta": {
    "local": "user",
    "domain": "example.com",
    "isFreeProvider": false,
    "isDisposable": false,
    "isRoleBased": false,
    "mxRecords": [
      { "exchange": "mail.example.com", "priority": 10 }
    ],
    "suggestion": null
  },
  "error": null,
  "latencyMs": 42
}
```

**Score breakdown (0–100):**
| Check                 | Points |
|-----------------------|--------|
| Valid syntax          | +30    |
| MX records found      | +35    |
| Not disposable domain | +20    |
| Not role-based        | +10    |
| Not free provider     | +5     |

---

### `POST /validate/bulk`

Validate up to 50 emails in one request.

**Request:**
```json
{
  "emails": ["alice@example.com", "bob@mailinator.com"]
}
```

**Response:**
```json
{
  "count": 2,
  "results": [ ...same structure as single validation... ]
}
```

---

## 🧪 Quick Test (curl)

```bash
# Health check
curl https://your-api.onrender.com/health

# Single validation (GET)
curl "https://your-api.onrender.com/validate?email=test@gmail.com"

# Single validation (POST)
curl -X POST https://your-api.onrender.com/validate \
  -H "Content-Type: application/json" \
  -d '{"email": "test@gmail.com"}'

# With API key
curl -X POST https://your-api.onrender.com/validate \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@company.com"}'

# Bulk validation
curl -X POST https://your-api.onrender.com/validate/bulk \
  -H "Content-Type: application/json" \
  -d '{"emails": ["alice@gmail.com", "bob@mailinator.com", "typo@gnail.com"]}'
```

---

## 🛡️ What Gets Checked

| Check | Description |
|-------|-------------|
| **Syntax** | RFC 5322-based regex validation |
| **Length** | Local ≤64 chars, total ≤320 chars |
| **MX Records** | DNS lookup to verify domain can receive email |
| **Disposable** | 80+ known disposable email providers blocked |
| **Role-based** | Detects addresses like `admin@`, `noreply@`, `support@` |
| **Free provider** | Flags Gmail, Yahoo, Outlook, etc. |
| **Typo detection** | Suggests fixes for common domain typos (gnail.com → gmail.com) |

---

## 🏗️ Local Development

```bash
npm install
npm run dev   # uses nodemon for auto-restart
```

The API will be available at `http://localhost:3000`.

---

## 📁 Project Structure

```
email-validation-api/
├── src/
│   ├── index.js       # Express app, routes, middleware
│   └── validator.js   # Core validation logic
├── package.json
├── render.yaml        # Render deployment blueprint
└── README.md
```
