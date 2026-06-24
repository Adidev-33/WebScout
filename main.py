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
from fastapi import FastAPI, HTTPException, Body, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List
import os

from models.audit import AuditReport
from services.db_service import DbService
from services.scraper_service import ScraperService
from services.scoring_service import ScoringService
from services.groq_service import GroqService

app = FastAPI(
    title="Website Auditor Backend API",
    description="Automated crawling, scoring, and AI summary generation for website auditing.",
    version="1.0.0"
)

# Serve captured screenshots as static files
SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
app.mount("/screenshots", StaticFiles(directory=SCREENSHOTS_DIR), name="screenshots")

# Configure CORS to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
        "engine": "FastAPI + Playwright & Groq"
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
    return report

@app.post("/api/audits", response_model=AuditReport, status_code=status.HTTP_201_CREATED)
async def create_audit(payload: dict = Body(...)):
    """
    Submits a website URL to trigger the audit execution pipeline:
    1. Scrapes the webpage via Playwright browser or fallback fetch.
    2. Runs a clean, deterministic scoring algorithm out of 10.
    3. Leverages a Groq-hosted LLM to generate a professional summary.
    """
    url = payload.get("url")
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
        progress="Step 1: Scraping DOM...",
        error=None,
        scores=None,
        metrics=None,
        summary=None
    )

    print("\n" + "="*60)
    print(f"🚀 [PIPELINE BEGIN] Commencing Python Website Audit. ID: {audit_id}")
    print(f"🔗 Target Endpoint: {normalized_url}")
    print("="*60)

    # Save to disk database
    DbService.save_report(report)

    try:
        # ----- Stage 1: Scrape DOM and get technical parameters -----
        print(f"\n[PIPELINE] [STAGE 1/3] Triggering Web Scraping Crawl...")
        report.status = "processing"
        report.progress = "Step 1: Scraping DOM..."
        DbService.save_report(report)

        metrics, screenshot_path = await ScraperService.scrape_url(normalized_url)
        report.metrics = metrics
        report.screenshotPath = screenshot_path

        # ----- Stage 2: Calculate deterministic scores -----
        print(f"\n[PIPELINE] [STAGE 2/3] Initiating Scoring Engine...")
        report.progress = "Step 2: Running SEO Checks..."
        DbService.save_report(report)

        scores = ScoringService.calculate_scores(metrics)
        report.scores = scores

        # ----- Stage 3: LLM Senior Web Auditor summary generation -----
        print(f"\n[PIPELINE] [STAGE 3/3] Requesting AI Auditor Analysis summary...")
        report.progress = "Step 3: LLM Analysis..."
        DbService.save_report(report)

        summary = await GroqService.generate_audit_summary(normalized_url, metrics, scores)
        report.summary = summary

        # Complete the pipeline successfully
        report.status = "completed"
        report.progress = "Finished."
        DbService.save_report(report)

        print("\n" + "="*60)
        print(f"✅ [PIPELINE SUCCESS] Audit completed perfectly for ID: {audit_id}!")
        print("="*60 + "\n")
        
        return report

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
        
        return JSONResponse(
            status_code=500,
            content=report.model_dump()
        )

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
            
    deleted = DbService.delete_report(audit_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Audit report not found")
    return {"success": True, "message": f"Audit report '{audit_id}' deleted successfully."}

@app.delete("/api/audits")
async def delete_all_audits():
    """Deletes all audit reports and clears their screenshots."""
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

    cleared = DbService.clear_all_reports()
    if not cleared:
        raise HTTPException(status_code=500, detail="Failed to clear audit reports from database.")
    return {"success": True, "message": "All audit reports deleted successfully."}


# Entrypoint for direct execution (e.g. `python backend/main.py`)
if __name__ == "__main__":
    print("Initializing Website Auditor FastAPI Backend...")
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)
