<p align="center">
  <h1 align="center">🔍 WebScout</h1>
  <p align="center">
    <strong>Automated Website Auditor — Crawl, Score &amp; Summarise any webpage in seconds.</strong>
  </p>
  <p align="center">
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-api-reference">API</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-environment-variables">Env Setup</a> •
    <a href="#-testing">Testing</a>
  </p>
</p>

---

## ✨ Features

| Category | Details |
|---|---|
| **Web Scraping** | Headless Chromium crawling via Playwright with automatic HTTP fallback |
| **SEO Analysis** | Title tags, meta descriptions, heading hierarchy, image alt-text coverage |
| **Performance Scoring** | Load-time benchmarking, image density penalties, deterministic 0–10 scoring |
| **Technical Audit** | SSL verification, viewport meta, console error capture, HTTP status checks |
| **AI Summary** | Groq-hosted LLM (Llama 3.3 70B) generates executive-level audit reports |
| **Offline Mode** | Fully functional local fallback — no API key required for basic operation |
| **Persistent Storage** | JSON file-based database (`audits_db.json`) for audit history |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      FastAPI Backend (port 3000)             │
│                                                              │
│   POST /api/audits   ──►  3-Stage Pipeline                   │
│                           │                                  │
│                    ┌──────┴──────┐                            │
│                    ▼             ▼                            │
│             ┌────────────┐ ┌────────────┐                    │
│             │  Playwright │ │  urllib     │                   │
│             │  (Primary)  │ │  (Fallback)│                   │
│             └──────┬──────┘ └─────┬──────┘                   │
│                    └──────┬───────┘                           │
│                           ▼                                  │
│                  ┌─────────────────┐                          │
│                  │ BeautifulSoup   │   DOM Parsing & Metrics  │
│                  └────────┬────────┘                          │
│                           ▼                                  │
│                  ┌─────────────────┐                          │
│                  │ ScoringService  │   Deterministic 0-10     │
│                  └────────┬────────┘                          │
│                           ▼                                  │
│                  ┌─────────────────┐                          │
│                  │ GroqService     │   LLM Executive Summary  │
│                  │ (or Fallback)   │                          │
│                  └────────┬────────┘                          │
│                           ▼                                  │
│                  ┌─────────────────┐                          │
│                  │ DbService       │   audits_db.json         │
│                  └─────────────────┘                          │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| **Python** | 3.10 or higher |
| **pip** | Latest recommended |
| **Node.js** | 18+ *(for the upcoming Next.js frontend)* |

### 1 — Clone the repository

```bash
git clone https://github.com/Adidev-33/WebScout.git
cd WebScout
```

### 2 — Create a virtual environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3 — Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4 — Install Playwright browsers

Playwright requires a one-time browser download:

```bash
playwright install chromium
```

> **Note:** If Playwright is not installed or the browser binaries are missing, WebScout will automatically fall back to standard HTTP fetching via `urllib`. The audit will still work, but you won't get real browser console error capture.


### 5 — Start the backend server

```bash
# Option A: Direct execution
python main.py

# Option B: Using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 3000 --reload
```

The API will be available at **`http://localhost:3000`**.

### 6 — Verify it's running

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-06-24T08:00:00Z",
  "engine": "FastAPI + Playwright & Groq"
}
```

---

## 🔐 Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable | Required | Default | Description |
|---|---|---|---|
| `GROQ_API_KEY` | **Optional**\* | — | Your Groq API key for LLM-powered audit summaries. Get one free at [console.groq.com](https://console.groq.com) |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | The Groq model to use for summary generation |

> \* **Without a `GROQ_API_KEY`**, WebScout operates in **offline mode** — scraping and scoring work fully, and the summary is generated by a built-in local fallback engine. Set the key to unlock deep AI-powered insights.

### `.env` file example

```env
# Groq API Configuration
GROQ_API_KEY=gsk_your_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

### Getting a Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up or log in
3. Navigate to **API Keys** in the sidebar
4. Click **Create API Key**
5. Copy the key and paste it into your `.env` file

---

## 📡 API Reference

Base URL: `http://localhost:3000`

### Health Check

```
GET /api/health
```

Returns server status and engine info.

---

### List All Audits

```
GET /api/audits
```

Returns all past audit reports, sorted newest first.

**Response:** `AuditReport[]`

---

### Get Audit by ID

```
GET /api/audits/{audit_id}
```

| Parameter | Type | Description |
|---|---|---|
| `audit_id` | `string` | Unique 9-character audit identifier |

**Response:** `AuditReport`

---

### Create New Audit

```
POST /api/audits
```

**Request Body:**

```json
{
  "url": "https://example.com"
}
```

**Pipeline Stages:**

| Stage | Description |
|---|---|
| 1/3 | Scrapes DOM via Playwright (or HTTP fallback) |
| 2/3 | Calculates deterministic SEO, Performance & Technical scores |
| 3/3 | Generates AI executive summary via Groq LLM (or local fallback) |

**Response:** `AuditReport` (status `201 Created`)

---

### Delete Audit

```
DELETE /api/audits/{audit_id}
```

| Parameter | Type | Description |
|---|---|---|
| `audit_id` | `string` | Unique 9-character audit identifier |

**Response:**

```json
{
  "success": true,
  "message": "Audit report 'abc123def' deleted successfully."
}
```

---

### Response Schema — `AuditReport`

```jsonc
{
  "id": "abc123def",
  "url": "https://example.com",
  "timestamp": "2026-06-24T08:00:00Z",
  "status": "completed",        // "pending" | "processing" | "completed" | "failed"
  "progress": "Finished.",
  "error": null,
  "scores": {
    "overall": 7.8,             // Weighted: 40% SEO + 30% Perf + 30% Tech
    "seo": 8.5,
    "performance": 7.0,
    "technical": 7.6
  },
  "metrics": {
    "loadTimeMs": 1234.56,
    "responseCode": 200,
    "sslActive": true,
    "consoleErrorsSimulated": [],
    "totalImages": 12,
    "imagesMissingAlt": 2,
    "hasTitle": true,
    "hasMetaDescription": true,
    "hasViewport": true,
    "headingStructure": { "h1Count": 1, "h2Count": 4, "h3Count": 6 },
    "metaTitle": "Example Domain",
    "metaDescription": "This domain is for illustrative examples."
  },
  "summary": {
    "theGood": ["..."],
    "criticalFlaws": ["..."],
    "roadmap": ["..."],
    "rawMarkdown": "# Senior Auditor Executive Report..."
  }
}
```

---

## 🧪 Testing

WebScout includes a standalone test script that can run audits without starting the server.

### Direct Mode (in-memory pipeline)

```bash
# Audit the default URL (https://example.com)
python test_audit.py

# Audit a specific URL
python test_audit.py https://github.com
```

### HTTP Mode (requires running server)

```bash
# Start the server first in another terminal
python main.py

# Then run the test against the API
python test_audit.py https://github.com --http
```

---

## 📂 Project Structure

```
WebScout/
├── main.py                    # FastAPI app entry point & route definitions
├── requirements.txt           # Python dependencies
├── .env                       # Environment variables (not committed)
├── .gitignore                 # Git ignore rules
├── test_audit.py              # Standalone CLI test runner
├── audits_db.json             # Auto-generated JSON database (runtime)
│
├── models/
│   └── audit.py               # Pydantic data models
│                                 (AuditReport, AuditScores, AuditMetrics,
│                                  HeadingStructure, ExecutiveSummary)
│
├── services/
│   ├── scraper_service.py     # Playwright / urllib web scraping engine
│   ├── scoring_service.py     # Deterministic SEO, perf & tech scoring
│   ├── groq_service.py        # Groq LLM integration + local fallback
│   └── db_service.py          # JSON file-based persistence layer
│
└── frontend/                  # (Planned) Next.js frontend application
```

---

## 🧮 Scoring Algorithm

Scores are calculated deterministically out of **10.0** across three categories:

### SEO Score (40% of overall)

| Check | Penalty |
|---|---|
| Missing `<title>` tag | −1.5 |
| Missing `<meta description>` | −1.5 |
| Zero `<h1>` tags | −1.5 |
| Multiple `<h1>` tags | −0.5 |
| Zero `<h2>` tags | −1.0 |
| \>50% images missing alt text | −2.0 |
| Any images missing alt text | −1.0 |

### Performance Score (30% of overall)

| Load Time | Penalty |
|---|---|
| ≤ 300ms | None |
| 301–800ms | −0.5 |
| 801–1500ms | −1.5 |
| 1501–3000ms | −3.0 |
| > 3000ms | −5.0 |
| > 15 images on page | −0.8 |
| > 30 images on page | −1.5 |

### Technical Score (30% of overall)

| Check | Penalty |
|---|---|
| No SSL (HTTP) | −2.0 |
| Missing viewport meta | −2.0 |
| Console errors | −0.8 per error (max −4.0) |
| Non-200 HTTP status | −1.5 |

**Overall** = `(SEO × 0.4) + (Performance × 0.3) + (Technical × 0.3)`

---

## 🛣️ Roadmap

- [ ] **Next.js Frontend** — Interactive dashboard with real-time audit progress
- [ ] **PDF Export** — Download audit reports as styled PDFs
- [ ] **Batch Auditing** — Queue multiple URLs for bulk analysis
- [ ] **Historical Trends** — Track score changes over time for a domain
- [ ] **Lighthouse Integration** — Incorporate Google Lighthouse metrics

---

## 📄 License

This project is licensed under the **Apache License 2.0** — see the individual source file headers for details.
