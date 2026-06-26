<p align="center">
  <h1 align="center">🔍 WebScout</h1>
  <p align="center">
    <strong>Cybernetic Web Intelligence &amp; Automated Multi-Agent Web Auditor</strong>
  </p>
  <p align="center">
    <strong>Crawl DOM structures, calculate advanced web audit scores, inspect redirection chains, diagnose console exceptions, and consult a context-aware RAG Chatbot in real-time.</strong>
  </p>
</p>

---

## 🛠️ Complete Setup & Installation

WebScout consists of a **FastAPI backend** (Python) that handles headless Chromium crawls, redirects tracking, link verification, scoring engines, and RAG multi-agents, and a **Next.js frontend** (React/TypeScript) rendering a premium Cyber-Gold obsidian console.

### 📋 Prerequisites

| Dependency | Minimum Version | Purpose |
|---|---|---|
| **Python** | 3.10+ | Runs backend API server & scoring logic |
| **Node.js** | 18+ | Serves the web-based visual interface |
| **npm / npx** | 9+ | Manages frontend packages |

---

### 1. Backend Installation & Start

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Adidev-33/WebScout.git
   cd WebScout
   ```

2. **Establish a Virtual Environment:**
   ```bash
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Core Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install Headless Chromium Binaries:**
   WebScout utilizes Playwright to run interactive script crawls and capture page telemetry. Install the Chromium binaries using:
   ```bash
   playwright install chromium
   ```
   *Note: If Playwright binaries are missing, the scraper automatically falls back to standard HTTP library calls. Real-time console logs, responsive viewport checks, and page screenshots will be disabled in fallback mode.*

5. **Configure Environment Variables:**
   Create a `.env` file in the root workspace directory (`d:\Projects\WebScout\.env`):
   ```env
   # API credentials for AI orchestrations
   GROQ_API_KEY=gsk_your_groq_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   ```
   *Offline Fallback: If `GROQ_API_KEY` is omitted or left as a placeholder, the backend activates offline fallback mode, generating detailed rule-based executive diagnostic logs and structured recommendations automatically.*

6. **Start the FastAPI Server:**
   ```bash
   python main.py
   ```
   The backend API launches on port **`3000`** (`http://localhost:3000`).

---

### 2. Frontend Installation & Start

1. **Navigate to the Frontend Directory:**
   ```bash
   cd frontend
   ```

2. **Install Node Packages:**
   ```bash
   npm install
   ```

3. **Launch the Next.js Development Server:**
   ```bash
   npm run dev
   ```
   The user interface is hosted on port **`3001`** (`http://localhost:3001`). Open this URL in your browser to interact with WebScout.

---

## 📦 Tech Stack, Libraries & Purpose

WebScout leverages modern tools across its frontend and backend to enable high-speed auditing, multi-agent AI cooperation, and real-time visual readouts.

### 🐍 Backend Tech Stack & Libraries
*   **FastAPI (`fastapi`)**: A high-performance, modern web framework for building APIs with Python 3.10+. It manages REST endpoints, handles asynchronous request flows, and uses Pydantic validation natively.
*   **Uvicorn (`uvicorn`)**: A lightning-fast ASGI server implementation used to serve the FastAPI backend interface.
*   **Playwright (`playwright`)**: Headless browser automation library. It powers our Chromium browser wrapper to render client-side JavaScript, capture 16:9 viewports, and trace console errors/browser warning logs.
*   **BeautifulSoup4 (`beautifulsoup4` / `bs4`)**: An HTML/XML parsing library. Used to extract structured DOM parameters (e.g., `<title>`, meta descriptions, viewport definitions, alt texts, and headings) and split text content into cleanly tokenized RAG chunks.
*   **LangChain Core & Groq (`langchain-core`, `langchain-groq`)**: LLM programming abstractions. Integrates with the Groq inference service using the `llama-3.3-70b-versatile` model to orchestrate specialized auditor agents and enforce structured Pydantic outputs.
*   **Pydantic (`pydantic`)**: Data validation and parsing library. Ensures strict type-enforcement and JSON schema modeling for all audit telemetry, reports, and coordinator outputs.
*   **Aiofiles (`aiofiles`)**: Enables asynchronous file operations, preventing local JSON database I/O calls from blocking the FastAPI main server event loop.
*   **Python-Dotenv (`python-dotenv`)**: Loads developer API credentials and active model parameters from the workspace `.env` file into local shell environments.
*   **Python Standard Libraries**:
    *   `asyncio`: Manages background thread loops and handles simultaneous external checks.
    *   `urllib.request` & `urllib.parse`: Standard library tools used for redirect hop trace handlers, URI normalizations, and direct GET/HEAD fallback crawlers.
    *   `ssl`: Generates unverified contexts to bypass staging environment SSL certificate flags.
    *   `math`: Computes logarithmic operations for the TF-IDF vector similarity metrics.

### ⚛️ Frontend Tech Stack & Libraries
*   **Next.js (`next`)**: React-based development framework powering page routing, TypeScript builds, and developer server environments.
*   **React (`react` & `react-dom`)**: Handles component states, layout structures, side-drawer animations, and interactive modals.
*   **TailwindCSS (`tailwindcss` & `@tailwindcss/postcss`)**: A utility-first CSS framework used to build our glowing glassmorphic panels, grid systems, and custom progress status animations.
*   **TypeScript (`typescript`)**: Adds static typing to React components, enforcing type safety on all audit reports, scores, and chatbot message states.
*   **React Hook Systems**:
    *   `useRef`: Enables auto-focusing on the RAG text input field upon slide drawer mount.
    *   `useState` & `useEffect`: Triggers step polling sequences, drawer toggle transitions, and page scroll coordinate modifications.

---

## 📊 Crawled Telemetry & Extracted Data

WebScout extracts deep technical parameters from audited URLs to generate a comprehensive site profile:

### 1. DOM Structure & Metadata Audit
*   **Page Title**: Detects the presence of the `<title>` tag, checks character length, and flags length warnings (Optimal, Too Short, Too Long).
*   **Meta Description**: Verifies presence of `<meta name="description">` tags, checks length, and provides recommendations.
*   **Mobile Responsiveness Viewport**: Validates the presence of the standard viewport header: `<meta name="viewport" content="width=device-width, initial-scale=1">`.
*   **Heading Layout Hierarchies**: Counts exact numbers of `<h1>`, `<h2>`, and `<h3>` heading tags to verify semantic layout structure.
*   **Social Preview Tags**: Counts Open Graph (`og:`) and Twitter Card (`twitter:`) tags to assess rich sharing optimization.

### 2. Runtime Browser Telemetry
*   **Console Warnings & Exceptions**: Playwright hooks capture console logs (filtering for warning/error levels).
*   **Script Runtime Failures**: Captures uncaught browser exception messages (`pageerror`) triggered by broken JS libraries.

### 3. Media Asset Analysis
*   **Asset Count**: Counts all `<img>` elements loaded in the DOM.
*   **Accessibility Analysis**: Counts images missing an `alt="..."` descriptor attribute, calculating alt text coverage density.

### 4. HTTP & Server Handshakes
*   **Response Status Codes**: Captures final response header statuses (e.g. 200 OK, 404 Not Found, 500 Server Error).
*   **Load Time Latency**: Measures network load speed in milliseconds (from initial page goto up to standard document load event).
*   **SSL Encryption Status**: Verifies active HTTPS handshakes vs insecure HTTP connections.

### 5. Hyperlinks & Navigation Health
*   **Links Extraction**: Extracts all `<a>` anchor references, filtering internal/external endpoints.
*   **Dead Link Checking**: Performs asynchronous status checks, categorizing issues into HTTP status codes or custom codes (`DNS Lookup Failure`, `SSL verification Failure`, `Connection Timeout`).

### 6. Redirection Traversals
*   **Hop Trace Sequence**: Traces step-by-step redirect URLs.
*   **Redirect Status Codes**: Intercepts intermediate codes (301, 302, 303, 307, 308).
*   **Redirection Types**: Logs redirection classes (`Permanent`, `Temporary`, `Loop`, `Error`).

---

## 🏗️ System Architecture & Data Flow

WebScout coordinates asynchronous tasks, local file storage, TF-IDF calculation, and AI agents through a clean service-oriented layout:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              NEXT.JS FRONTEND (Port 3001)                              │
│                                                                                        │
│     Landing Search  ──► Trigger Audit  ──►   Live Progress   ──►   Dashboard Console   │
│           │                                       ▲                       │            │
│           │ POST /api/audits                      │ GET /api/audits/{id}  │ Open Chat  │
│           ▼                                       │                       ▼            │
│  ┌────────────────────────────────────────────────┴─────────────────────────────────┐  │
│  │                              FASTAPI BACKEND API (Port 3000)                     │  │
│  │                                                                                  │  │
│  │  1. REDIRECTS TRACE ──►  2. CHROMIUM SCRAPE ──►  3. SCORING ENGINE ──► 4. AGENTS │  │
│  │     (Redirection path)    (DOM & Console logs)   (Deductions out of 10) (Summary)│  │
│  └────────────────────────────────────────┬─────────────────────────────────────────┘  │
│                                           │                                            │
│                                           ▼                                            │
│                                 ┌──────────────────┐                                   │
│                                 │   RAG ENGINE     │                                   │
│                                 │  (rag_service)   │                                   │
│                                 └─────────┬────────┘                                   │
│                                           │                                            │
│                    ┌──────────────────────┴──────────────────────┐                     │
│                    ▼                                             ▼                     │
│        ┌───────────────────────┐                     ┌───────────────────────┐         │
│        │    DOCUMENT STORE     │                     │    GUIDELINES STORE   │         │
│        │  (HTML, DOM elements, │                     │ (guidelines_kb.json - │         │
│        │   warnings, errors)   │                     │  official references) │         │
│        └───────────────────────┘                     └───────────────────────┘         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌐 Scraper, Link Checker, and Redirect Trace Deep-Dive

### 1. Headless Crawling Process
WebScout launches Chromium browsers headlessly using the **Playwright Sync API** within a separate thread (`asyncio.to_thread` via a `ThreadPoolExecutor` context):
*   **Why?** This prevents incompatibility crashes on Windows operating systems using ASGI servers like `uvicorn` (which use `asyncio.WindowsProactorEventLoopPolicy`), where running Playwright's async subprocesses throws a `NotImplementedError`.
*   **Screenshot Capture**: Page viewport is locked to a `1280x720` (16:9) display. A snapshot is captured at `{timestamp}_screenshot.png`, saved to the `screenshots/` directory, and served through FastAPI's static route `/screenshots`.
*   **Console Log Hooking**: Binds list-listeners to browser `console` logs (filtering for warning/error levels) and `pageerror` (capturing uncaught JS exceptions).

### 2. Multi-threaded Broken Link Validator
*   Retrieves all links (`<a>` anchors) from the parsed DOM, standardizes relative links to absolute URLs, and filters for `http/https` schemes.
*   Performs non-blocking checks on the top 15 links concurrently using `asyncio.gather`.
*   **Request Strategy**: First hits the URL using a `HEAD` request. If the server does not support `HEAD`, it falls back to a `GET` request. It includes a custom browser User-Agent: `Mozilla/5.0 ... WebsiteAuditorBot/1.0`.
*   **SSL Bypass**: Uses `ssl._create_unverified_context()` to prevent false failures caused by unverified or self-signed staging certificates.
*   **Failure Mapping**: Categorizes dead links using custom diagnostic codes:
    *   `-1` -> `Connection Timed Out` (response exceeds 10s timeout limit)
    *   `-2` -> `SSL Certificate Verification Failed`
    *   `-3` -> `DNS Lookup Failed` (target domain does not exist)
    *   `0`  -> `Connection failed during GET fallback`

### 3. Redirect Chain Tracer
To audit server-side URL mappings, the backend trace pipeline uses a custom `urllib.request.HTTPRedirectHandler` called `NoRedirectHandler`. It overrides the default behavior to prevent auto-following:
```python
class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, hdrs, newurl):
        return None
```
*   Iterates hop-by-hop up to a maximum limit of 10 redirects.
*   If a status code is in `(301, 302, 303, 307, 308)`, it extracts the `Location` header, maps the type (`Permanent` vs. `Temporary`), and checks it against a `visited` set.
*   If an loop is detected (e.g. `A -> B -> A`), it halts execution, flags a `Circular redirect loop` error, and logs the loop step.

---

## 🧮 Score Engine Deductions & Logic

All categories start with a base score of **10.0** and subtract specific penalties down to a minimum score of **1.0**:

### 1. SEO Score (40% Weight)
| Telemetry Flag | Status | Deduction |
|---|---|---|
| **Page Title** | Missing `<title>` | `-1.5` |
| **Page Title** | Length is too short (< 30 characters) or too long (> 60 characters) | `-0.5` |
| **Meta Description** | Missing description | `-1.5` |
| **Meta Description** | Length is too short (< 120 characters) or too long (> 160 characters) | `-0.5` |
| **Open Graph tags** | Count is 0 (Social Sharing) | `-0.25` |
| **Twitter Card tags** | Count is 0 (Twitter Sharing) | `-0.25` |
| **H1 Heading** | Count is 0 (No primary title) | `-1.5` |
| **H1 Heading** | Count is > 1 (Multiple top-level headings) | `-0.5` |
| **H2 Heading** | Count is 0 (No secondary layout anchors) | `-1.0` |
| **Image Alt text** | Missing `alt` tags on > 50% of images | `-2.0` |
| **Image Alt text** | Missing `alt` tags on > 0% of images | `-1.0` |
| **Broken Hyperlinks** | Dead links found on-page | `-0.5` per link (max penalty `-2.0`) |

### 2. Performance Score (30% Weight)
*   **Load Time Deductions**:
    *   $\le 1000\text{ms}$ (1.0s): `0.0` deduction (Fast loading speed)
    *   $1000\text{ms} < t \le 2500\text{ms}$: `-0.5` deduction
    *   $2500\text{ms} < t \le 5000\text{ms}$: `-1.0` deduction
    *   $5000\text{ms} < t \le 10000\text{ms}$: `-2.0` deduction
    *   $10000\text{ms} < t \le 20000\text{ms}$: `-3.0` deduction
    *   $> 20000\text{ms}$ (20.0s): `-4.0` deduction (maximum latency penalty)
*   **Image Density Deductions**:
    *   $> 50$ total image elements: `-0.2` deduction
    *   $> 100$ total image elements: `-0.5` deduction

### 3. Technical & Accessibility Score (30% Weight)
| Telemetry Flag | Status | Deduction |
|---|---|---|
| **SSL Encryption** | Insecure URL scheme (HTTP) | `-2.0` |
| **Responsive Layout** | Missing `<meta name="viewport">` | `-2.0` |
| **Response Code** | Main request status code is not 200 | `-1.5` |
| **Console Errors** | Active logs, warnings, or exceptions | `-0.8` per error trace (max penalty `-4.0`) |
| **Broken Hyperlinks** | Dead link paths on-page (accessibility block) | `-0.3` per link (max penalty `-1.5`) |

### 4. Overall Weighted Formula
$$\text{Overall Score} = (\text{SEO Score} \times 0.4) + (\text{Performance Score} \times 0.3) + (\text{Technical Score} \times 0.3)$$

---

## 🤖 Multi-Agent Orchestration (LangChain & Groq)

When a web audit is triggered, WebScout launches a pipeline that runs multiple specialized agents sequentially using LangChain. If a Groq API key is not configured, the engine falls back to a deterministic rule-based local generator.

```
                      ┌─────────────────────────┐
                      │  Scraped DOM Telemetry  │
                      └────────────┬────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
        ┌───────────────────────┐     ┌───────────────────────┐
        │  SEO Specialist Agent │     │ Performance & Security│
        │                       │     │    Specialist Agent   │
        └───────────┬───────────┘     └───────────┬───────────┘
                    │                             │
                    └──────────────┬──────────────┘
                                   ▼
                    ┌───────────────────────────┐
                    │  Executive Senior Auditor │
                    │           Agent           │
                    └──────────────┬────────────┘
                                   ▼
                    ┌───────────────────────────┐
                    │ Consolidated Markdown     │
                    │      Audit Summary        │
                    └───────────────────────────┘
```

### 1. SEO Specialist Agent
*   **Role**: Senior SEO Strategist.
*   **Inputs**: URL, calculated SEO Score, and telemetry payload (`metaTitle`, `metaDescription`, `headingStructure`, `metaDataAnalysis`, `hasTitle`, `hasMetaDescription`, `brokenLinksCount`).
*   **Goal**: Identify structural SEO wins and flaws based on the technical telemetry provided, outputting a concise, technical bulleted list of findings.

### 2. Performance & Security Specialist Agent
*   **Role**: Web Performance Engineer & Penetration Tester.
*   **Inputs**: URL, Performance Score, Technical Score, and performance/accessibility telemetry (`loadTimeMs`, `sslActive`, `responseCode`, `totalImages`, `imagesMissingAlt`, `hasViewport`, `consoleErrorsSimulated`).
*   **Goal**: Analyze performance bottlenecks, loading times, SSL certificate configurations, responsive viewports, and console errors, outputting a concise list of performance and security wins and flaws.

### 3. Executive Senior Auditor Coordinator Agent
*   **Role**: Lead Website Auditor.
*   **Inputs**: Compiled reports from the SEO Specialist and Performance/Security Specialist agents.
*   **Orchestration & Structured Output**: Combines these reports and parses the combined analysis into a structured Pydantic model (`ExecutiveSummary`):
    *   `theGood`: List of 3-5 key wins.
    *   `criticalFlaws`: List of 3-5 critical defects.
    *   `roadmap`: List of 4-6 prioritized developer tasks.
    *   `rawMarkdown`: A comprehensive, beautifully formatted markdown report.
*   **Implementation**: Utilizes LangChain's `.with_structured_output(ExecutiveSummary)` on the ChatGroq model (defaulting to `llama-3.3-70b-versatile`) to guarantee stable JSON parsing.

### 4. Rule-Based Fallback Engine
If the Groq API key is missing or invalid, WebScout runs a local rule-based analysis engine (`_generate_simulated_summary`) to guarantee functionality:
*   Parses the `AuditMetrics` and `AuditScores` using deterministic rules.
*   Matches metadata, viewport, SSL, and link counts against ideal targets.
*   Assembles a structured `ExecutiveSummary` response, formatting a markdown report complete with "Structural Wins", "Critical Accessibility Deficits", and a "Prioritized Developer Roadmap".

---

## 🔍 Retrieval-Augmented Generation (RAG) Core Math & Logic

To power context-aware chatbot answers, WebScout features an inline developer chat. When a query is submitted, the RAG engine retrieves relevant documents using a pure Python vector similarity matcher.

### 1. The Context Repositories
*   **External Reference Store (`guidelines_kb.json`)**: Contains standard web rules (such as accessibility standards, mobile viewport guidelines, heading structure recommendations, and image alt text best practices).
*   **Audited Webpage Document Store**: Created dynamically by parsing the target audit's crawled assets.
    *   The crawled HTML file is loaded from `html_store/{audit_id}.html`.
    *   Script and style tags are stripped from the HTML, and the remaining text is split into chunks of ~400 characters with a 10-word overlap.
    *   DOM elements (e.g. page titles, headings, and image tags) are extracted as structured document cards.
    *   Simulated console errors, broken links, redirects, and SEO recommendations are converted into search-ready text chunks.

### 2. Tokenization & Text Normalization
Every document chunk $D$ and user query $Q$ undergoes the following tokenization process:
$$\text{Tokenize}(T) = \text{Split}(\text{Clean}(\text{Lowercase}(T)))$$
*   **Cleaning**: Punctuations and special characters are stripped using regular expressions:
    ```python
    cleaned = re.sub(r'[^\w\s]', '', text.lower())
    tokens = cleaned.split()
    ```

### 3. Mathematical Vectorization: TF-IDF
Once the chunks are tokenized, WebScout builds a Term Frequency-Inverse Document Frequency (TF-IDF) vector space over the vocabulary:

1.  **Vocabulary Collection**: A joint vocabulary $V$ is built from the tokens of all chunks and the query.
2.  **Document Frequency (DF)**: For each word $w \in V$, WebScout counts the number of document chunks that contain $w$.
3.  **Smoothed Inverse Document Frequency (IDF)**: Computed to prevent division by zero and smooth scaling:
    $$\text{IDF}(w) = \ln\left(\frac{1 + N}{1 + \text{DF}(w)}\right) + 1.0$$
    *where $N$ is the total number of document chunks in the active pool.*
4.  **Term Frequency (TF)**: The raw count of word $w$ within a specific chunk $d$ or query $q$:
    $$\text{TF}_{d}(w) = \text{Count}(w, d)$$
5.  **Vector Calculation**: The vector elements are calculated by multiplying TF and IDF:
    $$\mathbf{v}[i] = \text{TF}(w_i) \times \text{IDF}(w_i)$$

### 4. Cosine Similarity Matching
To find the top $k$ relevant chunks, WebScout calculates the Cosine Similarity between the query vector $\mathbf{q}$ and each document vector $\mathbf{d}$:
$$\text{Cosine Similarity}(\mathbf{q}, \mathbf{d}) = \frac{\mathbf{q} \cdot \mathbf{d}}{\|\mathbf{q}\| \|\mathbf{d}\|} = \frac{\sum_{i=1}^{|V|} q_i d_i}{\sqrt{\sum_{i=1}^{|V|} q_i^2} \sqrt{\sum_{i=1}^{|V|} d_i^2}}$$
*   **Zero Division Safety**: If either magnitude $\|\mathbf{q}\|$ or $\|\mathbf{d}\|$ equals $0.0$, the similarity score is set to $0.0$.
*   The top $k=3$ guidelines and $k=3$ page chunks are retrieved, formatted, and appended to the Chatbot's prompt as context. This allows it to answer queries using both official guidelines and page-specific details.

---

## 📡 REST API Reference

### 1. General API
*   **`GET /api/health`**
    *   **Description**: Simple API health check.
    *   **Response**:
        ```json
        {
          "status": "ok",
          "timestamp": "2026-06-26T13:42:00Z",
          "engine": "FastAPI + Playwright & LangChain Agents"
        }
        ```

### 2. Audit CRUD Operations
*   **`GET /api/audits`**
    *   **Description**: Lists all audit reports, sorted newest first.
*   **`GET /api/audits/{id}`**
    *   **Description**: Retrieves a single audit report by its unique ID.
*   **`POST /api/audits`**
    *   **Description**: Triggers a web audit in the background.
    *   **Payload**:
        ```json
        {
          "url": "https://example.com",
          "waitTime": 5000
        }
        ```
    *   **Response**: `201 Created` with the pending `AuditReport` schema.
*   **`DELETE /api/audits/{id}`**
    *   **Description**: Deletes a report and its screenshot from disk.
*   **`DELETE /api/audits`**
    *   **Description**: Deletes all reports and screenshots from the server.

### 3. Comparative Diagnostics
*   **`POST /api/audits/redirects`**
    *   **Description**: Traces redirects step-by-step for a batch of URLs.
    *   **Payload**:
        ```json
        {
          "urls": ["https://example.com/old-path"],
          "maxRedirects": 10
        }
        ```
*   **`GET /api/compare/{audit_id_a}/{audit_id_b}`**
    *   **Description**: Compares two audit reports (verifies they share the same base domain) and returns score and metric deltas.
*   **`POST /api/compare/mapping`**
    *   **Description**: Maps a staging prefix against a production prefix to compare paths.
    *   **Payload**:
        ```json
        {
          "prefixA": "https://staging.site.com",
          "prefixB": "https://site.com"
        }
        ```

### 4. RAG Chatbot Integration
*   **`POST /api/audits/{id}/chat`**
    *   **Description**: Ask questions about a specific audit report.
    *   **Payload**:
        ```json
        {
          "message": "Explain why my alt tag score is low.",
          "history": [
            { "role": "user", "text": "Hi" },
            { "role": "assistant", "text": "Hello, how can I help you improve your site?" }
          ]
        }
        ```
    *   **Response**: Returns the markdown response from the assistant, the matched reference guidelines, and the matching webpage chunks.

---

## 🧪 Verification & CLI Testing

You can run CLI-based audit verification directly without launching the frontend or backend servers:

```bash
# Run a default crawl and scoring check
python test_audit.py

# Crawl a specific target URL locally
python test_audit.py https://example.com

# Request an audit through the running FastAPI server (requires backend port 3000 online)
python test_audit.py https://example.com --http
```

---

## 📂 Project Structure

```
WebScout/
├── main.py                  # FastAPI server entry point and endpoint routes
├── requirements.txt         # Backend Python packages
├── audits_db.json           # File-based database store
├── test_audit.py            # Command line audit test utility
│
├── models/
│   └── audit.py             # Pydantic schema models
│
├── services/
│   ├── scraper_service.py   # Headless browser crawler & link checker
│   ├── scoring_service.py   # Web score calculations & metrics engine
│   ├── rag_service.py       # TF-IDF Cosine Similarity vector engine
│   ├── agent_service.py     # Multi-Agent orchestrator (LangChain & Groq)
│   ├── db_service.py        # Database read/write helpers
│   └── guidelines_kb.json   # Local Reference knowledge database
│
└── frontend/                # Next.js Application
    ├── src/app/
    │   ├── layout.tsx       # Root layout wrapper
    │   ├── globals.css      # Core styling and Cyber-Gold design system
    │   ├── page.tsx         # Dashboard crawl tracker and history list
    │   └── audit/[id]/
    │       └── page.tsx     # Single Audit Report view and RAG Chat drawer
    └── package.json         # Node packaging configurations
```

---

## 📄 License

WebScout is open-source software licensed under the **Apache License 2.0**.
