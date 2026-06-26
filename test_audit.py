# -*- coding: utf-8 -*-
"""
@license
SPDX-License-Identifier: Apache-2.0
"""

import sys
import io
# Force UTF-8 encoding on stdout/stderr so emoji in log messages
# don't crash on Windows terminals using cp1252 (Python 3.12+)
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import asyncio
import urllib.parse

# Import services directly for standalone terminal tests
try:
    from services.scraper_service import ScraperService
    from services.scoring_service import ScoringService
    from services.agent_service import AgentService
    from services.db_service import DbService
    from models.audit import AuditReport, RedirectStep
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
        normalized_url = ScraperService.normalize_url(target_url)
        
        # 0. Redirect Trace
        print("[STAGE 0] Tracing redirection path...")
        redirect_trace = await ScraperService.trace_redirects_for_url(normalized_url)
        print("  Redirection Chain:")
        for idx, step in enumerate(redirect_trace["chain"]):
            print(f"    - Step {idx+1}: {step['url']} (Status: {step['statusCode']}, Type: {step['redirectType']})")
        
        if redirect_trace["hasLoop"]:
            raise Exception(f"Circular redirect loop detected: {redirect_trace['error'] or 'circular redirection'}")
            
        crawl_url = redirect_trace["finalUrl"]

        # 1. Scrape DOM
        print(f"\n[STAGE 1/3] Crawling target webpage ({crawl_url}) & extracting HTML metrics...")
        metrics, screenshot_path = await ScraperService.scrape_url(crawl_url)
        
        # 2. Score
        print("\n[STAGE 2/3] Analyzing and calculating health scores...")
        scores = ScoringService.calculate_scores(metrics)
        
        # 3. AI Cognitive summary
        print("\n[STAGE 3/3] Generating executive summary and developer roadmap via LangChain agents...")
        summary = await AgentService.generate_audit_summary(normalized_url, metrics, scores)

        # Output gorgeous visual summary to the CLI terminal
        print("\n" + "🟢 [SUCCESS] AUDIT COMPLETE!".center(70, "-"))
        print(f"🔗 Target:           {normalized_url}")
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
        
        # Page Title & Meta Data Analysis CLI print
        if metrics.metaDataAnalysis:
            analysis = metrics.metaDataAnalysis
            print("\n🔍 PAGE TITLE & METADATA ANALYSIS:")
            print(f"  🏷️  Title Status:     {analysis.titleStatus} ({analysis.titleLength} chars)")
            if analysis.titleRecommendations:
                for rec in analysis.titleRecommendations:
                    print(f"      👉 {rec}")
            print(f"  📝  Meta Desc Status:  {analysis.metaDescriptionStatus} ({analysis.metaDescriptionLength} chars)")
            if analysis.metaDescriptionRecommendations:
                for rec in analysis.metaDescriptionRecommendations:
                    print(f"      👉 {rec}")
            print(f"  🌐  Open Graph Tags:  {analysis.openGraphCount} found")
            print(f"  🐦  Twitter Cards:    {analysis.twitterCardCount} found")

        # Broken Links CLI print
        print(f"\n🔗 BROKEN HYPERLINKS AUDIT:")
        print(f"  🚨 Broken Links:     {metrics.brokenLinksCount} found")
        if metrics.brokenLinks:
            for idx, link in enumerate(metrics.brokenLinks):
                code_str = f"HTTP {link.statusCode}" if link.statusCode > 0 else "Connection Error"
                print(f"    {idx+1}. URL:  {link.url}")
                print(f"       Code: {code_str} | Description: {link.errorDescription}")
        
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

        print("="*70)

        # Check database for previous completed audit of the same website
        try:
            reports = DbService.get_reports()
            completed_reports = [r for r in reports if r.status == "completed"]
            # Sort chronologically by timestamp ascending
            completed_reports.sort(key=lambda r: r.timestamp)
            
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
            
            # Find the most recent completed audit in the db for the same base domain
            prev_report = None
            domain_curr = get_base_domain(normalized_url)
            for r in reversed(completed_reports):
                if get_base_domain(r.url) == domain_curr:
                    prev_report = r
                    break
            
            if prev_report:
                print("\n" + "📊 CONSECUTIVE CRAWL COMPARISON METRICS".center(70, "-"))
                print(f"Comparing current run against previous audit ID: {prev_report.id} ({prev_report.timestamp})")
                
                # Overall Score Delta
                overall_delta = scores.overall - prev_report.scores.overall
                seo_delta = scores.seo - prev_report.scores.seo
                perf_delta = scores.performance - prev_report.scores.performance
                tech_delta = scores.technical - prev_report.scores.technical
                
                print(f"  🏆 Overall Score:    {prev_report.scores.overall:.1f} ➔ {scores.overall:.1f} ({'+' if overall_delta >= 0 else ''}{overall_delta:.1f})")
                print(f"  🔍 SEO Score:        {prev_report.scores.seo:.1f} ➔ {scores.seo:.1f} ({'+' if seo_delta >= 0 else ''}{seo_delta:.1f})")
                print(f"  ⚡ Performance:      {prev_report.scores.performance:.1f} ➔ {scores.performance:.1f} ({'+' if perf_delta >= 0 else ''}{perf_delta:.1f})")
                print(f"  ⚙️  Accessibility:   {prev_report.scores.technical:.1f} ➔ {scores.technical:.1f} ({'+' if tech_delta >= 0 else ''}{tech_delta:.1f})")
                
                # Telemetry Deltas
                load_time_delta = metrics.loadTimeMs - prev_report.metrics.loadTimeMs
                img_delta = metrics.totalImages - prev_report.metrics.totalImages
                missing_alt_delta = metrics.imagesMissingAlt - prev_report.metrics.imagesMissingAlt
                broken_delta = metrics.brokenLinksCount - prev_report.metrics.brokenLinksCount
                
                print("\n  ⏱️  Telemetry Deltas:")
                print(f"    - Load Time:       {prev_report.metrics.loadTimeMs:.0f} ms ➔ {metrics.loadTimeMs:.0f} ms ({'+' if load_time_delta >= 0 else ''}{load_time_delta:.0f} ms)")
                print(f"    - Total Images:    {prev_report.metrics.totalImages} ➔ {metrics.totalImages} ({'+' if img_delta >= 0 else ''}{img_delta})")
                print(f"    - Missing Alt:     {prev_report.metrics.imagesMissingAlt} ➔ {metrics.imagesMissingAlt} ({'+' if missing_alt_delta >= 0 else ''}{missing_alt_delta})")
                print(f"    - Broken Links:    {prev_report.metrics.brokenLinksCount} ➔ {metrics.brokenLinksCount} ({'+' if broken_delta >= 0 else ''}{broken_delta})")
                
                # SSL / Viewport changes
                print("\n  Checklist Drift:")
                if prev_report.metrics.sslActive != metrics.sslActive:
                    status = "Activated" if metrics.sslActive else "Deactivated"
                    print(f"    - SSL Certificate: {status}")
                if prev_report.metrics.hasViewport != metrics.hasViewport:
                    status = "Added" if metrics.hasViewport else "Removed"
                    print(f"    - Mobile Viewport: {status}")
                print("-" * 70)
        except Exception as db_err:
            print(f"\n[Test Script Warning] Could not calculate comparative metrics: {db_err}")

        print("\n")

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
        with urllib.request.urlopen(req, timeout=120) as response:
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
            
            # Page Title & Meta Data Analysis CLI print
            metaDataAnalysis = metrics.get("metaDataAnalysis")
            if metaDataAnalysis:
                print("\n🔍 PAGE TITLE & METADATA ANALYSIS:")
                print(f"  🏷️  Title Status:     {metaDataAnalysis.get('titleStatus')} ({metaDataAnalysis.get('titleLength')} chars)")
                if metaDataAnalysis.get("titleRecommendations"):
                    for rec in metaDataAnalysis.get("titleRecommendations"):
                        print(f"      👉 {rec}")
                print(f"  📝  Meta Desc Status:  {metaDataAnalysis.get('metaDescriptionStatus')} ({metaDataAnalysis.get('metaDescriptionLength')} chars)")
                if metaDataAnalysis.get("metaDescriptionRecommendations"):
                    for rec in metaDataAnalysis.get("metaDescriptionRecommendations"):
                        print(f"      👉 {rec}")
                print(f"  🌐  Open Graph Tags:  {metaDataAnalysis.get('openGraphCount')} found")
                print(f"  🐦  Twitter Cards:    {metaDataAnalysis.get('twitterCardCount')} found")

            # Broken Links CLI print
            print(f"\n🔗 BROKEN HYPERLINKS AUDIT:")
            brokenLinksCount = metrics.get("brokenLinksCount", 0)
            print(f"  🚨 Broken Links:     {brokenLinksCount} found")
            brokenLinks = metrics.get("brokenLinks", [])
            if brokenLinks:
                for idx, link in enumerate(brokenLinks):
                    code_str = f"HTTP {link.get('statusCode')}" if link.get('statusCode', 0) > 0 else "Connection Error"
                    print(f"    {idx+1}. URL:  {link.get('url')}")
                    print(f"       Code: {code_str} | Description: {link.get('errorDescription')}")

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
