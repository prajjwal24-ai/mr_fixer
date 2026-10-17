# Mr. Fixer — AI-Powered Website Auditing Tool

> A deterministic accessibility and layout auditor. Load a public URL and receive structured findings with evidence and suggested fixes across 5 objective categories.

## What It Does

Mr. Fixer audits any public webpage by loading it in an isolated headless Chromium browser, running axe-core WCAG 2.1 AA checks, and evaluating mobile layout behaviour. Every finding is assigned a stable SHA-256 fingerprint so repeated scans can be compared and you can verify whether issues were actually fixed.

### Audit Categories

| Category | Rule IDs | Notes |
|---|---|---|
| Button accessible names | `button-name`, `input-button-name` | Definitive |
| Form labels | `label`, `aria-input-field-name`, `select-name` | Definitive |
| Image alt text | `image-alt` | Flagged for human review (decorative vs informative) |
| Color contrast | `color-contrast` | Flagged for human review (unreliable on gradients) |
| Heading hierarchy | `heading-order`, `page-has-heading-one` | Definitive |
| Mobile horizontal overflow | `mobile-horizontal-overflow` | Custom — 375px viewport, 2px tolerance |

### Dashboard Features

- **Severity filter tabs** (Critical / High / Medium / Low / All)
- **Category filter** (Accessibility / Layout / All)
- **Text search** across selector, rule ID, message, and evidence
- **Rescan verification** — re-runs the audit and shows which findings are Resolved, Persisting, or Newly Introduced
- **Export JSON** — downloads a structured report of the current scan results to your local machine
- **Backend Offline state** — shows a clear error and Retry button when the backend is unreachable

---

## Architecture

```
mr_fixer/
├── package.json              # Monorepo workspaces (npm workspaces + concurrently)
├── .gitignore
├── README.md
├── Mr_Fixer_Mini_PRD.md
├── backend/
│   ├── package.json          # Express + TypeScript + Playwright + axe-core + Zod
│   ├── tsconfig.json
│   ├── .env.example          # Environment variable template
│   └── src/
│       ├── index.ts          # Server entry point (port 3001)
│       ├── app.ts            # Decoupled createApp() — enables supertest without port binding
│       ├── config.ts         # Zod env schema (PORT, HOST, NODE_ENV)
│       ├── types.ts          # Shared API type definitions
│       ├── middleware/
│       │   └── errorHandler.ts   # AppError class + centralized error shape
│       ├── routes/
│       │   └── audit.ts          # POST /api/audit, POST /api/audit/validate, POST /api/rescan
│       ├── scanner/
│       │   ├── browserManager.ts # Playwright singleton, concurrency semaphore (max 3), crash recovery
│       │   ├── pageLoader.ts     # Pre-flight DNS, route interception, redirect monitoring
│       │   ├── engine.ts         # runAudit(), runRescan() — orchestration
│       │   ├── normalizer.ts     # SHA-256 fingerprints, severity mapping, fix suggestions
│       │   └── mobileOverflow.ts # 375px viewport evaluation, culprit detection
│       └── security/
│           ├── urlValidator.ts   # Protocol, credential, loopback, private IP checks
│           ├── ipUtils.ts        # RFC 1918, loopback, CGNAT, link-local, IPv6 ranges
│           └── dnsValidator.ts   # Resolves hostname, checks all A/AAAA records
└── frontend/
    ├── package.json          # React 18 + Vite + TypeScript + Axios + lucide-react
    ├── vite.config.ts        # Dev server proxy: /api → http://127.0.0.1:3001
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx           # Stateful dashboard — audit, rescan, filter, export
        ├── api.ts            # Axios client (baseURL /api, 45s timeout)
        ├── types.ts          # Frontend type definitions (mirrors backend/src/types.ts)
        ├── index.css         # Glassmorphism dark theme, custom scrollbars
        └── components/
            ├── Navbar.tsx          # Online/Offline status indicator
            ├── UrlBar.tsx          # URL input, client-side protocol validation, quick-select
            ├── AuditSummaryCards.tsx # Severity breakdown grid + Export button
            ├── ExportButton.tsx    # Client-side JSON export (Blob + createObjectURL)
            ├── RescanBanner.tsx    # Resolved/Persisting/New fingerprint counts
            ├── FilterBar.tsx       # Severity tabs, category tabs, text search
            ├── FindingCard.tsx     # Per-finding detail: selector, snippet, evidence, fix
            └── EmptyState.tsx      # Zero-results and filter-mismatch states
```

---

## Getting Started

### Requirements

- Node.js v18+ (tested on v22.13.1)
- npm v10+

### 1. Install dependencies

```bash
npm install
```

> Playwright will automatically download the Chromium binary. This requires an internet connection on first install.

### 2. Configure environment (optional)

```bash
cp backend/.env.example backend/.env
```

The backend runs on port 3001 by default. Edit `.env` to change `PORT` or `HOST`.

### 3. Run in development mode

```bash
# Both backend (port 3001) and frontend (port 5173) via concurrently
npm run dev
```

Or individually:

```bash
# Terminal 1 — Backend
npm run dev:backend

# Terminal 2 — Frontend
npm run dev:frontend
```

Open **http://localhost:5173** in your browser.

### 4. Run tests

```bash
# All backend integration tests (63 tests, ~8s)
npm test
```

### 5. Build for production

```bash
# Builds both backend (tsc) and frontend (tsc + vite build)
npm run build
```

---

## API Reference

All endpoints accept and return JSON. Error responses always follow the shape:
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Service health check |
| `POST` | `/api/audit` | Run a full deterministic audit |
| `POST` | `/api/rescan` | Re-audit and compare fingerprints |
| `POST` | `/api/audit/validate` | URL validation + page load check only |

### POST /api/audit

**Request:**
```json
{ "url": "https://example.com" }
```

**Response:** `AuditReport` with id, url, finalUrl, pageTitle, httpStatus, timestamp, loadTimeMs, summary, and findings array.

### POST /api/rescan

**Request:**
```json
{ "url": "https://example.com", "previousFingerprints": ["abc123", "def456"] }
```

**Response:** `RescanReport` containing the new `AuditReport` plus `verification` with resolvedFingerprints, persistingFingerprints, and newFingerprints.

---

## Security Model and Known Limitations

Mr. Fixer implements layered SSRF (Server-Side Request Forgery) defences:

1. **URL validation** — Rejects non-HTTP(S) protocols, embedded credentials, localhost domains, loopback aliases (`localtest.me`, `vcap.me`), nip.io/sslip.io pointing to private IPs, and direct IP addresses in RFC 1918 / link-local / CGNAT ranges.
2. **DNS pre-flight** — Resolves the target hostname and checks every returned A/AAAA record against blocked ranges before any browser connection is made.
3. **Browser route interception** — All browser subresource requests (scripts, images, XHR, fetch) are intercepted via `context.route('**/*')` and checked against the same IP/URL policy.
4. **Redirect monitoring** — `page.on('response')` inspects HTTP 3xx `Location` headers and closes the page if the redirect target resolves to a blocked address.

**Important limitations:**

- **DNS rebinding is not fully mitigated** by application-level checks alone. There is an inherent TOCTOU (time-of-check / time-of-use) gap between DNS pre-flight and when Playwright actually connects. A DNS rebinding attack can swap the resolved address in this window. Complete mitigation requires network-level egress restrictions (VPC egress rules, firewall, or an isolated browser container).
- **Cloud metadata endpoints** — `169.254.169.254` is blocked in URL validation and DNS checks, but the browser route interceptor is the true last line; the pre-flight DNS check is best-effort since metadata IPs are typically returned without a public DNS lookup.
- **Chromium sandbox** — Sandbox is enabled by default. Only disabled if `CHROME_NO_SANDBOX=true` is set explicitly (intended for Docker deployments without `--privileged`).
- **No authentication** — This tool is intended for developer use. Do not expose it on a public network without access controls.

---

## Exporting Audit Reports

After a scan completes, click the **"Export JSON"** button in the audit summary banner. This downloads a structured JSON file to your machine containing:

- Scan metadata (URL, timestamp, HTTP status, load time, audit ID)
- Severity summary counts
- Rescan comparison data (if a rescan was performed)
- Full findings array with fingerprints, evidence, suggested fixes, and human-review flags

No data is sent to any external service. The export is generated entirely in the browser from the current scan state.

**Example filename:** `mr-fixer-report-example.com-2024-05-01T12-00-00.json`
