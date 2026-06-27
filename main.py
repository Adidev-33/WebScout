# -*- coding: utf-8 -*-
"""
@license
SPDX-License-Identifier: Apache-2.0
"""

import uvicorn
import time
import random
import string
import sys
import asyncio
import io

# Force UTF-8 encoding on stdout/stderr so emoji in log messages
# don't crash on Windows terminals using cp1252 (Python 3.12+)
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Force ProactorEventLoop on Windows to support subprocesses (required by Playwright)
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from fastapi import FastAPI, HTTPException, Body, status, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List
import os

from models.audit import (
    AuditReport, RedirectStep, RedirectAuditResult, RedirectBatchResponse,
    ScoreDelta, MetricDelta, ChangeItem, AuditComparisonResponse,
    MappedPathPair, URLMappingResponse
)
from services.db_service import DbService
from services.scraper_service import ScraperService
from services.scoring_service import ScoringService
from services.agent_service import AgentService

app = FastAPI(
    title="Website Auditor Backend API",
    description="Automated crawling, scoring, and AI summary generation for website auditing.",
    version="1.0.0"
)

# Serve captured screenshots as static files
DATA_DIR = os.environ.get("DATA_DIR", os.path.dirname(os.path.abspath(__file__)))
SCREENSHOTS_DIR = os.path.join(DATA_DIR, "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
app.mount("/screenshots", StaticFiles(directory=SCREENSHOTS_DIR), name="screenshots")

# Configure CORS to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# API Endpoints
# -------------------------------------------------------------

@app.get("/api/health")
async def health_check():
    """Simple API status and health check."""
    return {
        "status": "ok",
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        "engine": "FastAPI + Playwright & LangChain Agents"
    }

@app.get("/api/audits", response_model=List[AuditReport])
async def list_audits():
    """Retrieves all past website audit reports, sorted by newest first."""
    print("[API] GET /api/audits - Listing all recorded reports")
    try:
        reports = DbService.get_reports()
        # Sort in-memory newest first
        sorted_reports = sorted(
            reports, 
            key=lambda r: r.timestamp, 
            reverse=True
        )
        return sorted_reports
    except Exception as e:
        print(f"[API Error] Failed to retrieve audits: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to load reports: {str(e)}"
        )

@app.get("/api/audits/{audit_id}", response_model=AuditReport)
async def get_audit(audit_id: str):
    """Retrieves a single website audit report by its unique ID."""
    print(f"[API] GET /api/audits/{audit_id} - Querying report")
    report = DbService.get_report_by_id(audit_id)
    if not report:
        raise HTTPException(status_code=404, detail="Audit report not found")
    
    # Dynamically resolve previousAuditId if report is completed
    if report.status == "completed":
        reports = DbService.get_reports()
        completed_reports = [r for r in reports if r.status == "completed"]
        
        # Sort chronologically by timestamp ascending
        completed_reports.sort(key=lambda r: r.timestamp)
        
        try:
            idx = next(i for i, r in enumerate(completed_reports) if r.id == report.id)
        except StopIteration:
            idx = -1
            
        if idx > 0:
            prev_report = completed_reports[idx - 1]
            
            import urllib.parse
            def get_base_domain(url_str: str) -> str:
                try:
                    parsed = urllib.parse.urlparse(url_str)
                    hostname = parsed.hostname or ""
                    parts = hostname.lower().split('.')
                    if len(parts) >= 2:
                        return ".".join(parts[-2:])
                    return hostname
                except Exception:
                    return url_str
                    
            if get_base_domain(report.url) == get_base_domain(prev_report.url):
                report.previousAuditId = prev_report.id
            else:
                report.previousAuditId = None
        else:
            report.previousAuditId = None
            
    return report

async def run_audit_pipeline(report: AuditReport, normalized_url: str, render_js: bool, wait_time: int, audit_id: str):
    """Executes the audit pipeline stages in the background and saves progress updates."""
    try:
        # ----- Stage 0: Tracing Redirect Path -----
        print(f"\n[PIPELINE] [STAGE 0/3] Tracing redirection path...")
        report.status = "processing"
        report.progress = "Step 0: Tracing Redirects..."
        DbService.save_report(report)

        redirect_trace = await ScraperService.trace_redirects_for_url(normalized_url)
        report.redirectChain = [RedirectStep(**step) for step in redirect_trace["chain"]]

        if redirect_trace["hasLoop"]:
            raise Exception(f"Circular redirect loop detected: {redirect_trace['error'] or 'circular redirection'}")

        crawl_url = redirect_trace["finalUrl"]

        # ----- Stage 1: Scrape DOM and get technical parameters -----
        print(f"\n[PIPELINE] [STAGE 1/3] Triggering Web Scraping Crawl for final URL: {crawl_url}...")
        report.progress = "Step 1: Scraping DOM..."
        DbService.save_report(report)

        metrics, screenshot_path = await ScraperService.scrape_url(crawl_url, render_js, wait_time, audit_id=audit_id)
        report.metrics = metrics
        report.screenshotPath = screenshot_path

        # ----- Stage 2: Calculate deterministic scores -----
        print(f"\n[PIPELINE] [STAGE 2/3] Initiating Scoring Engine...")
        report.progress = "Step 2: Calculating Scores..."
        DbService.save_report(report)

        scores = ScoringService.calculate_scores(metrics)
        report.scores = scores

        # ----- Stage 3: LLM Senior Web Auditor summary generation -----
        print(f"\n[PIPELINE] [STAGE 3/3] Requesting AI Auditor Analysis summary...")
        report.progress = "Step 3: Multi-Agent Analysis..."
        DbService.save_report(report)

        summary = await AgentService.generate_audit_summary(normalized_url, metrics, scores)
        report.summary = summary

        # Complete the pipeline successfully
        report.status = "completed"
        report.progress = "Finished."
        DbService.save_report(report)

        print("\n" + "="*60)
        print(f"✅ [PIPELINE SUCCESS] Audit completed perfectly for ID: {audit_id}!")
        print("="*60 + "\n")

    except Exception as e:
        print("\n" + "="*60)
        print(f"❌ [PIPELINE ERROR] Pipeline failed on ID: {audit_id}!")
        print(f"Reason: {str(e)}")
        print("="*60 + "\n")

        # Save the failed state
        report.status = "failed"
        report.progress = "Failed."
        report.error = str(e)
        DbService.save_report(report)


@app.post("/api/audits", response_model=AuditReport, status_code=status.HTTP_201_CREATED)
async def create_audit(payload: dict = Body(...), background_tasks: BackgroundTasks = None):
    """
    Submits a website URL to trigger the audit execution pipeline asynchronously:
    1. Scrapes the webpage via Playwright browser or fallback fetch.
    2. Runs a clean, deterministic scoring algorithm out of 10.
    3. Leverages LangChain multi-agents to generate a professional summary.
    """
    url = payload.get("url")
    render_js = True
    wait_time = payload.get("waitTime", 5000)
    if not url or not isinstance(url, str) or url.strip() == "":
        raise HTTPException(
            status_code=400, 
            detail="A valid target website URL is required in the body payload."
        )

    normalized_url = ScraperService.normalize_url(url)
    
    # Generate unique 9-character audit ID
    audit_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
    timestamp_str = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

    # Create initial report in 'pending' status
    report = AuditReport(
        id=audit_id,
        url=normalized_url,
        timestamp=timestamp_str,
        status="pending",
        progress="Step 0: Tracing Redirects...",
        error=None,
        scores=None,
        metrics=None,
        summary=None
    )

    print("\n" + "="*60)
    print(f"🚀 [PIPELINE BEGIN] Commencing Async Python Website Audit. ID: {audit_id}")
    print(f"🔗 Target Endpoint: {normalized_url}")
    print("="*60)

    # Save to disk database
    DbService.save_report(report)

    # Trigger background execution pipeline
    if background_tasks is not None:
        background_tasks.add_task(
            run_audit_pipeline,
            report,
            normalized_url,
            render_js,
            wait_time,
            audit_id
        )
    else:
        asyncio.create_task(
            run_audit_pipeline(
                report,
                normalized_url,
                render_js,
                wait_time,
                audit_id
            )
        )

    return report

@app.delete("/api/audits/{audit_id}")
async def delete_audit(audit_id: str):
    """Deletes an audit report by ID."""
    print(f"[API] DELETE /api/audits/{audit_id} - Deleting report")
    # Clean up single screenshot
    report = DbService.get_report_by_id(audit_id)
    if report and report.screenshotPath:
        try:
            scr_path = os.path.join(SCREENSHOTS_DIR, report.screenshotPath)
            if os.path.exists(scr_path):
                os.remove(scr_path)
                print(f"[API] Deleted screenshot file: {scr_path}")
        except Exception as e:
            print(f"[API Error] Failed to delete screenshot file: {e}")
            
    # Clean up crawled HTML file
    try:
        html_store_dir = os.path.join(DATA_DIR, "html_store")
        html_path = os.path.join(html_store_dir, f"{audit_id}.html")
        if os.path.exists(html_path):
            os.remove(html_path)
            print(f"[API] Deleted crawled HTML file: {html_path}")
    except Exception as e:
        print(f"[API Error] Failed to delete crawled HTML file: {e}")

    deleted = DbService.delete_report(audit_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Audit report not found")
    return {"success": True, "message": f"Audit report '{audit_id}' deleted successfully."}

@app.delete("/api/audits")
async def delete_all_audits():
    """Deletes all audit reports and clears their screenshots and crawled HTML files."""
    print("[API] DELETE /api/audits - Clearing all reports")
    try:
        if os.path.exists(SCREENSHOTS_DIR):
            for filename in os.listdir(SCREENSHOTS_DIR):
                file_path = os.path.join(SCREENSHOTS_DIR, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
            print("[API] All screenshots cleared successfully.")
    except Exception as e:
        print(f"[API Error] Fails to delete screenshots: {str(e)}")

    try:
        html_store_dir = os.path.join(DATA_DIR, "html_store")
        if os.path.exists(html_store_dir):
            for filename in os.listdir(html_store_dir):
                file_path = os.path.join(html_store_dir, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
            print("[API] All crawled HTML files cleared successfully.")
    except Exception as e:
        print(f"[API Error] Fails to delete crawled HTML files: {str(e)}")

    cleared = DbService.clear_all_reports()
    if not cleared:
        raise HTTPException(status_code=500, detail="Failed to clear audit reports from database.")
    return {"success": True, "message": "All audit reports deleted successfully."}



@app.post("/api/audits/redirects", response_model=RedirectBatchResponse)
async def audit_redirects(payload: dict = Body(...)):
    """Traces redirects step-by-step for a batch list of target URLs."""
    urls = payload.get("urls", [])
    max_redirects = payload.get("maxRedirects", 10)
    if not urls or not isinstance(urls, list):
        raise HTTPException(status_code=400, detail="A list of target URLs is required in the payload.")
    
    # Cap batch size at 50
    target_urls = urls[:50]
    tasks = [ScraperService.trace_redirects_for_url(url, max_redirects) for url in target_urls]
    results = await asyncio.gather(*tasks)
    return {"results": results}


@app.get("/api/compare/{audit_id_a}/{audit_id_b}", response_model=AuditComparisonResponse)
async def compare_audits(audit_id_a: str, audit_id_b: str):
    """Calculates score and metric deltas and detailed changes between two audits."""
    audit_a = DbService.get_report_by_id(audit_id_a)
    audit_b = DbService.get_report_by_id(audit_id_b)
    if not audit_a or not audit_b:
        raise HTTPException(status_code=404, detail="One or both audits not found.")
    
    # Ensure comparison is done only for crawls of the same website
    import urllib.parse
    def get_base_domain(url: str) -> str:
        parsed = urllib.parse.urlparse(url)
        hostname = parsed.hostname or ""
        parts = hostname.lower().split('.')
        if len(parts) >= 2:
            return ".".join(parts[-2:])
        return hostname

    domain_a = get_base_domain(audit_a.url)
    domain_b = get_base_domain(audit_b.url)
    if domain_a != domain_b:
        raise HTTPException(
            status_code=400,
            detail=f"Comparison is only permitted between crawls of the same website. Website '{domain_a}' does not match '{domain_b}'."
        )
    
    # Calculate score deltas
    score_delta = ScoreDelta(
        overall=round(audit_b.scores.overall - audit_a.scores.overall, 1) if audit_a.scores and audit_b.scores else 0.0,
        seo=round(audit_b.scores.seo - audit_a.scores.seo, 1) if audit_a.scores and audit_b.scores else 0.0,
        performance=round(audit_b.scores.performance - audit_a.scores.performance, 1) if audit_a.scores and audit_b.scores else 0.0,
        technical=round(audit_b.scores.technical - audit_a.scores.technical, 1) if audit_a.scores and audit_b.scores else 0.0,
    )
    
    # Calculate metric deltas
    metric_delta = MetricDelta(
        loadTimeMs=round(audit_b.metrics.loadTimeMs - audit_a.metrics.loadTimeMs, 2) if audit_a.metrics and audit_b.metrics else 0.0,
        totalImages=(audit_b.metrics.totalImages - audit_a.metrics.totalImages) if audit_a.metrics and audit_b.metrics else 0,
        imagesMissingAlt=(audit_b.metrics.imagesMissingAlt - audit_a.metrics.imagesMissingAlt) if audit_a.metrics and audit_b.metrics else 0,
        brokenLinksCount=(audit_b.metrics.brokenLinksCount - audit_a.metrics.brokenLinksCount) if audit_a.metrics and audit_b.metrics else 0,
    )
    
    # Construct structural change list
    changes = []
    
    # SSL Check
    if audit_a.metrics and audit_b.metrics:
        if audit_a.metrics.sslActive != audit_b.metrics.sslActive:
            status = "improved" if audit_b.metrics.sslActive else "degraded"
            desc = "SSL became active in Audit B" if audit_b.metrics.sslActive else "SSL became inactive in Audit B"
        else:
            status = "unchanged"
            desc = "SSL status remains " + ("active" if audit_a.metrics.sslActive else "inactive")
        changes.append(ChangeItem(item="SSL Security", status=status, description=desc))
        
        # Title tag Check
        if audit_a.metrics.hasTitle != audit_b.metrics.hasTitle:
            status = "improved" if audit_b.metrics.hasTitle else "degraded"
            desc = "Title tag was added in Audit B" if audit_b.metrics.hasTitle else "Title tag was removed in Audit B"
        else:
            status = "unchanged"
            desc = f"Title: '{audit_b.metrics.metaTitle or 'None'}'" if audit_b.metrics.hasTitle else "Title tag is missing in both"
        changes.append(ChangeItem(item="Page Title Tag", status=status, description=desc))
        
        # Meta Description Check
        if audit_a.metrics.hasMetaDescription != audit_b.metrics.hasMetaDescription:
            status = "improved" if audit_b.metrics.hasMetaDescription else "degraded"
            desc = "Meta description was added in Audit B" if audit_b.metrics.hasMetaDescription else "Meta description was removed in Audit B"
        else:
            status = "unchanged"
            desc = f"Meta description is set in Audit B" if audit_b.metrics.hasMetaDescription else "Meta description is missing in both"
        changes.append(ChangeItem(item="Meta Description Tag", status=status, description=desc))
        
        # Viewport Check
        if audit_a.metrics.hasViewport != audit_b.metrics.hasViewport:
            status = "improved" if audit_b.metrics.hasViewport else "degraded"
            desc = "Mobile viewport meta tag added in Audit B" if audit_b.metrics.hasViewport else "Mobile viewport meta tag removed in Audit B"
        else:
            status = "unchanged"
            desc = "Mobile viewport tag is " + ("active" if audit_a.metrics.hasViewport else "missing")
        changes.append(ChangeItem(item="Responsive Viewport Meta", status=status, description=desc))
    
    return {
        "auditA": audit_a,
        "auditB": audit_b,
        "scoreDelta": score_delta,
        "metricDelta": metric_delta,
        "changes": changes
    }


@app.post("/api/compare/mapping", response_model=URLMappingResponse)
async def compare_mapping(payload: dict = Body(...)):
    """Maps prefix A (staging) and prefix B (production) path-by-path to match crawls."""
    prefix_a = payload.get("prefixA", "").strip().rstrip("/")
    prefix_b = payload.get("prefixB", "").strip().rstrip("/")
    if not prefix_a or not prefix_b:
        raise HTTPException(status_code=400, detail="Both prefixA and prefixB are required.")
    
    # Get all audits
    reports = DbService.get_reports()
    
    # Normalizer to extract path
    def get_path_and_normalize(url: str, prefix: str) -> Optional[str]:
        norm_url = url.strip().rstrip("/")
        if norm_url.startswith(prefix):
            path = norm_url[len(prefix):]
            if not path.startswith("/"):
                path = "/" + path
            return path
        return None
    
    # Group audits by prefix
    audits_a = {}
    audits_b = {}
    
    # Sort reports newest first so we get the latest audit per path
    sorted_reports = sorted(reports, key=lambda r: r.timestamp, reverse=True)
    
    for r in sorted_reports:
        if r.status != "completed":
            continue
        # Check if matches prefix A
        path_a = get_path_and_normalize(r.url, prefix_a)
        if path_a is not None:
            if path_a not in audits_a:
                audits_a[path_a] = r
        # Check if matches prefix B
        path_b = get_path_and_normalize(r.url, prefix_b)
        if path_b is not None:
            if path_b not in audits_b:
                audits_b[path_b] = r
                
    # Merge paths
    all_paths = sorted(list(set(audits_a.keys()) | set(audits_b.keys())))
    
    pairs = []
    for path in all_paths:
        audit_a = audits_a.get(path)
        audit_b = audits_b.get(path)
        
        delta = None
        if audit_a and audit_b and audit_a.scores and audit_b.scores:
            delta = round(audit_b.scores.overall - audit_a.scores.overall, 1)
            
        pairs.append(MappedPathPair(
            path=path,
            auditA=audit_a,
            auditB=audit_b,
            scoreDelta=delta
        ))
        
    return {
        "prefixA": prefix_a,
        "prefixB": prefix_b,
        "pairs": pairs
    }


@app.post("/api/audits/{audit_id}/chat")
async def chat_with_audit_report(audit_id: str, payload: dict = Body(...)):
    """Allows developers to chat with an audit report using context-enhanced RAG."""
    message = payload.get("message", "").strip()
    history = payload.get("history", [])
    if not message:
        raise HTTPException(status_code=400, detail="A user message is required.")
        
    report = DbService.get_report_by_id(audit_id)
    if not report:
        raise HTTPException(status_code=404, detail="Audit report not found.")
        
    # Retrieve technical knowledge base documents using RAG
    from services.rag_service import RagService
    guidelines = RagService.retrieve(message, k=3)
    
    # Retrieve report-specific chunks from Document Store using RAG
    report_chunks = RagService.retrieve_report_chunks(message, audit_id, report, k=3)
    
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if api_key and api_key != "YOUR_GROQ_API_KEY" and api_key != "":
        try:
            # Lazy import LangChain
            from langchain_groq import ChatGroq
            from langchain_core.prompts import ChatPromptTemplate
            
            model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
            llm = ChatGroq(
                groq_api_key=api_key,
                model_name=model,
                temperature=0.2
            )
            
            system_prompt = (
                "You are the senior AI Web Auditor Chatbot for WebScout.\n"
                "Your task is to answer developer questions about the website audit report of the target site: {url}.\n"
                "You are provided with:\n"
                "1. The current Website Audit Scores and Technical Metrics.\n"
                "2. Retrieved official guidelines and resolution guides (RAG guidelines context).\n"
                "3. Sliced chunks from the page's actual HTML content, DOM elements, and warnings (RAG report chunks context).\n\n"
                "Analyze these metrics, guidelines, and page-specific chunks to formulate clear, technical, step-by-step resolution "
                "advice for the developer. Keep your responses highly actionable, professional, and concise. "
                "Use Markdown format for headers, lists, and code blocks."
            )
            
            messages = [("system", system_prompt)]
            # Add past history if formatted correctly
            for h_msg in history[-8:]: # limit history context size
                role = h_msg.get("role", "user")
                content = h_msg.get("text", "") # frontend sends 'text' in history
                if role in ("user", "assistant", "system"):
                    messages.append((role, content))
            
            # Format RAG docs into string
            rag_docs = ""
            for idx, g in enumerate(guidelines):
                rag_docs += f"Guideline {idx+1}: {g['title']} ({g['category']})\n{g['content']}\n\n"
                
            # Format report chunks into string
            rep_docs = ""
            for idx, c in enumerate(report_chunks):
                rep_docs += f"Report Chunk {idx+1}: {c['title']} ({c['category']})\n{c['content']}\n\n"
                
            metrics = report.metrics
            scores = report.scores
            
            user_prompt = (
                f"Website URL: {report.url}\n"
                f"Scores: Overall={scores.overall if scores else 0.0}/10, SEO={scores.seo if scores else 0.0}/10, Performance={scores.performance if scores else 0.0}/10, Accessibility={scores.technical if scores else 0.0}/10\n"
                f"Page Load Latency: {metrics.loadTimeMs if metrics else 0.0} ms\n"
                f"SSL Encryption: {'Active' if metrics and metrics.sslActive else 'Inactive'}\n"
                f"Broken Links: {metrics.brokenLinksCount if metrics else 0} found\n"
                f"Images Missing Alt: {metrics.imagesMissingAlt if metrics else 0} / {metrics.totalImages if metrics else 0}\n\n"
                f"--- Retrieved Guidelines (RAG External References) ---\n"
                f"{rag_docs}\n"
                f"--- Retrieved Webpage Details (RAG Page Content & Warnings) ---\n"
                f"{rep_docs}\n"
                f"--- User Query ---\n"
                f"{message}"
            )
            messages.append(("user", user_prompt))
            
            prompt = ChatPromptTemplate.from_messages(messages)
            chain = prompt | llm
            
            response = await chain.ainvoke({
                "url": report.url
            })
            
            return {
                "response": response.content,
                "guidelines": guidelines,
                "reportChunks": report_chunks
            }
            
        except Exception as e:
            print(f"[Chat Error] Groq API execution failed: {e}")
            # Fall through to offline mode
            
    # Offline Fallback Mode
    response_text = f"**[Offline Fallback Mode]**\n\n"
    response_text += f"We analyzed your query *'{message}'* against the audit database for **{report.url}**.\n\n"
    
    if guidelines:
        response_text += "### 📖 Retrieved Guideline Reference:\n"
        for g in guidelines:
            response_text += f"- **{g['title']}** ({g['category']}): {g['content']}\n"
        response_text += "\n"
        
    if report_chunks:
        response_text += "### 🔍 Retrieved Webpage Details:\n"
        for c in report_chunks:
            response_text += f"- **{c['title']}** ({c['category']}): {c['content']}\n"
        response_text += "\n"
        
    response_text += "### 📊 Current Website Telemetry:\n"
    if report.scores and report.metrics:
        load_time_sec = report.metrics.loadTimeMs / 1000.0
        response_text += f"- **Health Score**: {report.scores.overall}/10 (SEO: {report.scores.seo}, Perf: {report.scores.performance}, Access: {report.scores.technical})\n"
        response_text += f"- **Page Speed**: {load_time_sec:.2f} seconds ({report.metrics.loadTimeMs} ms)\n"
        response_text += f"- **SSL Secure**: {'Yes' if report.metrics.sslActive else 'No'}\n"
        response_text += f"- **Alt tag coverage**: {report.metrics.totalImages - report.metrics.imagesMissingAlt} / {report.metrics.totalImages} images set\n"
        response_text += f"- **Broken links**: {report.metrics.brokenLinksCount} dead hyperlink paths\n"
        
    response_text += "\n### 🛠️ Actionable Recommendation:\n"
    low_message = message.lower()
    if any(k in low_message for k in ["alt", "image", "alt tag", "accessibility"]):
        response_text += "1. Inspect all `<img>` tags on your landing page.\n"
        response_text += "2. Set the `alt='description'` attribute describing the content of each image.\n"
        response_text += "3. For screen readers, avoid generic alt texts like 'image' or 'graphic'."
    elif any(k in low_message for k in ["load", "speed", "time", "latency", "performance", "slow"]):
        response_text += "1. Compress all static images using an optimized format like WebP.\n"
        response_text += "2. Implement browser caching on static assets to reduce server request roundtrips.\n"
        response_text += "3. Postpone or lazy-load heavy non-critical render-blocking JavaScript files."
    elif any(k in low_message for k in ["viewport", "mobile", "responsive", "screen"]):
        response_text += "1. Ensure the `<meta name='viewport' content='width=device-width, initial-scale=1'>` header tag is set in your layout `<head>`.\n"
        response_text += "2. Avoid explicit pixel widths on container elements; use CSS flexbox, grids, or percent widths."
    else:
        response_text += "To get dynamically-generated AI auditor answers, please check your Groq API key configuration in the backend `.env` file."
        
    return {
        "response": response_text,
        "guidelines": guidelines,
        "reportChunks": report_chunks
    }


# Entrypoint for direct execution (e.g. `python backend/main.py`)
if __name__ == "__main__":
    print("Initializing Website Auditor FastAPI Backend...")
    port = int(os.environ.get("PORT", 3000))
    reload = os.environ.get("ENV", "development").lower() == "development"
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=reload)
