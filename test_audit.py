# -*- coding: utf-8 -*-
"""
@license
SPDX-License-Identifier: Apache-2.0
"""

import sys
import asyncio
import urllib.parse

# Import services directly for standalone terminal tests
try:
    from services.scraper_service import ScraperService
    from services.scoring_service import ScoringService
    from services.groq_service import GroqService
    from models.audit import AuditReport
except ImportError:
    print("[Test Script Info] Services not directly importable from root. Proceeding with HTTP mode.")

DEFAULT_URL = "https://example.com"

async def run_direct_audit(target_url: str):
    """Executes the entire backend pipeline directly in-memory and outputs details."""
    print("\n" + "="*70)
    print("🔍 WEBSITE AUDITOR - DIRECT INTERNAL TEST")
    print(f"📡 Auditing URL: {target_url}")
    print("="*70 + "\n")

    try:
        # 1. Scrape DOM
        print("[STAGE 1/3] Crawling target webpage & extracting HTML metrics...")
        metrics = await ScraperService.scrape_url(target_url)
        
        # 2. Score
        print("\n[STAGE 2/3] Analyzing and calculating health scores...")
        scores = ScoringService.calculate_scores(metrics)
        
        # 3. AI Cognitive summary
        print("\n[STAGE 3/3] Generating executive summary and developer roadmap...")
        summary = await GroqService.generate_audit_summary(target_url, metrics, scores)

        # Output gorgeous visual summary to the CLI terminal
        print("\n" + "🟢 [SUCCESS] AUDIT COMPLETE!".center(70, "-"))
        print(f"🔗 Target:           {target_url}")
        print(f"🏆 Overall Score:    [ {scores.overall} / 10 ]")
        print(f"🔍 SEO Score:        [ {scores.seo} / 10 ]")
        print(f"⚡ Performance:      [ {scores.performance} / 10 ]")
        print(f"⚙️  Technical/Accessibility: [ {scores.technical} / 10 ]")
        print("-" * 70)
        
        print("\n🖥️  RAW TECHNICAL METRICS:")
        print(f"  ⏱️  Load Latency:     {metrics.loadTimeMs:.2f} ms")
        print(f"  🔒 SSL Secure:       {'Yes ✅' if metrics.sslActive else 'No ❌'}")
        print(f"  🖼️  Total Images:     {metrics.totalImages} ({metrics.imagesMissingAlt} missing alt texts)")
        print(f"  🏷️  Header Tags:      H1: {metrics.headingStructure.h1Count}, H2: {metrics.headingStructure.h2Count}, H3: {metrics.headingStructure.h3Count}")
        print(f"  📑  Meta Title:      {metrics.metaTitle}")
        print(f"  📝  Meta Description: {metrics.metaDescription}")
        
        if metrics.consoleErrorsSimulated:
            print("\n  ⚠️  Console Warnings & Layout Audits:")
            for log in metrics.consoleErrorsSimulated:
                print(f"    - {log}")

        print("\n" + "🧠 AI SENIOR WEB AUDITOR SUMMARY".center(70, "-"))
        print("\n🌟 The Good:")
        for idx, item in enumerate(summary.theGood):
            print(f"  ✅ {item}")
            
        print("\n🚨 Critical Flaws:")
        for idx, item in enumerate(summary.criticalFlaws):
            print(f"  ❌ {item}")

        print("\n🗺️  Actionable Developer Roadmap:")
        for idx, item in enumerate(summary.roadmap):
            print(f"  {idx+1}. {item}")

        print("="*70 + "\n")

    except Exception as e:
        print(f"\n❌ [ERROR] Standalone Direct execution failed: {str(e)}")
        print("Please check internet connections and module configurations.\n")

def run_http_audit(target_url: str):
    """Executes the pipeline by querying the running FastAPI backend server."""
    print("\n" + "="*70)
    print("📡 WEBSITE AUDITOR - API HTTP CLIENT TEST")
    print(f"🔗 Querying FastAPI Endpoint for: {target_url}")
    print("="*70 + "\n")

    import urllib.request
    import json

    api_url = "http://localhost:3000/api/audits"
    payload = json.dumps({"url": target_url}).encode("utf-8")
    
    req = urllib.request.Request(
        api_url, 
        data=payload, 
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            status_code = response.getcode()
            response_data = json.loads(response.read().decode("utf-8"))
            
            print(f"🟢 [SUCCESS] Received response with status {status_code}!")
            scores = response_data.get("scores", {})
            metrics = response_data.get("metrics", {})
            summary = response_data.get("summary", {})

            print("-" * 70)
            print(f"🏆 Overall Health Score: [ {scores.get('overall')}/10 ]")
            print(f"🔍 SEO: {scores.get('seo')}/10 | ⚡ Performance: {scores.get('performance')}/10 | ⚙️ Technical: {scores.get('technical')}/10")
            print("-" * 70)
            
            print("\n🧠 AI Summary Roadmap:")
            for idx, item in enumerate(summary.get("roadmap", [])):
                print(f"  {idx+1}. {item}")
            print("\n" + "="*70 + "\n")
            
    except Exception as e:
        print(f"❌ [HTTP ERROR] Could not connect to the FastAPI backend: {str(e)}")
        print("👉 Tip: Start the FastAPI server first by running: `uvicorn main:app --host 0.0.0.0 --port 3000` inside /backend")
        print("="*70 + "\n")

if __name__ == "__main__":
    # Retrieve URL from terminal arguments
    args = sys.argv[1:]
    target_url = args[0] if len(args) > 0 else DEFAULT_URL
    
    # Check if user requests API mode
    use_http = "--http" in args
    if use_http:
        # Filter out argument flag
        filtered_args = [a for a in args if a != "--http"]
        target_url = filtered_args[0] if len(filtered_args) > 0 else DEFAULT_URL
        run_http_audit(target_url)
    else:
        # Direct stand-alone execution
        asyncio.run(run_direct_audit(target_url))
