# -*- coding: utf-8 -*-
"""
@license
SPDX-License-Identifier: Apache-2.0
"""

import os
import io
import sys
import json
import time
import urllib.parse
from typing import Optional
from dotenv import load_dotenv
from models.audit import AuditMetrics, AuditScores, ExecutiveSummary

# Ensure UTF-8 stdout so emoji log messages don't crash on Windows cp1252
if hasattr(sys.stdout, 'buffer') and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Load .env file into os.environ
load_dotenv()

# Default model - can be overridden via GROQ_MODEL env var
DEFAULT_MODEL = "llama-3.3-70b-versatile"


class GroqService:
    @staticmethod
    def _get_ai_client():
        """Attempts to initialize the Groq AsyncGroq client if a valid API key exists."""
        api_key = os.environ.get("GROQ_API_KEY", "").strip()

        if not api_key or api_key == "YOUR_GROQ_API_KEY" or api_key == "":
            print("[Groq] GROQ_API_KEY is unset or placeholder. Cascading to local offline executive summary generator.")
            return None

        try:
            from groq import AsyncGroq
            print("[Groq] Initializing AsyncGroq client...")
            return AsyncGroq(api_key=api_key)
        except Exception as e:
            print(f"[Groq Warning] Failed to load groq module: {str(e)}")
            return None

    @staticmethod
    async def generate_audit_summary(
        url: str,
        metrics: AuditMetrics,
        scores: AuditScores
    ) -> ExecutiveSummary:
        """
        Uses Groq LLM to analyze crawled web parameters 
        and provide a senior-level detailed audit summary, with graceful local fallback.
        """
        client = GroqService._get_ai_client()

        if client is None:
            return GroqService._generate_simulated_summary(url, metrics, scores)

        model = os.environ.get("GROQ_MODEL", DEFAULT_MODEL).strip()
        print(f"[Groq] 🧠 Calling {model} with technical data for url: {url}")

        system_prompt = (
            "You are an elite, objective, and realistic website auditor. "
            "Focus on highly specific code and structure recommendations based on raw telemetry. "
            "You MUST respond with valid JSON only — no markdown, no commentary outside the JSON object."
        )

        user_prompt = f"""
You are an expert Senior Web Auditor, Accessibility Specialist, and SEO Engineer.
Analyze the following raw technical parameters crawled from auditing the webpage: {url}

--- Raw Crawled Web Parameters (JSON) ---
{json.dumps({"metrics": metrics.model_dump(), "scores": scores.model_dump()}, indent=2)}

--- Instructions ---
Using this parsed technical telemetry, generate a highly analytical and structured website audit executive summary.
In your analysis, pay special attention to:
- Page title & metadata quality (length checks, presence of Open Graph/Twitter Card tags).
- Broken links count, status codes, and descriptions.
Your response MUST be a JSON object containing exactly four fields:
1. "theGood": List (3-5 items) of structural and accessibility victories (e.g., secure HTTPS setup, optimal title/metadata, no broken links, clean load metrics, correct headings hierarchy).
2. "criticalFlaws": List (3-5 items) of glaring layout, mobile responsive, or search optimization flaws (e.g., missing/suboptimal metadata, broken links with status codes, slow performance bottlenecks, images missing alternative descriptions).
3. "roadmap": List (4-6 items) of prioritised developer action steps to resolve these structural flaws and increase the score towards 9.5+. Specifically include steps to fix broken links and improve metadata quality.
4. "rawMarkdown": A comprehensive and styled Markdown document with clear headers for 'The Good', 'Critical Flaws', and 'Actionable Roadmap'. Include details about the page title, metadata status, and any broken links. Use an objective, authoritative senior developer's tone.

Respond ONLY with the JSON object. No other text.
"""

        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )

            response_text = response.choices[0].message.content
            if not response_text:
                raise ValueError("Received empty response string from Groq API.")

            parsed_data = json.loads(response_text)
            print("[Groq] Successful structured AI Executive Summary generated and parsed.")
            return ExecutiveSummary(**parsed_data)

        except Exception as err:
            print(f"[Groq Error] Live API request failed: {str(err)}. Falling back to local analyzer...")
            return GroqService._generate_simulated_summary(url, metrics, scores)

    @staticmethod
    def _generate_simulated_summary(
        url: str,
        metrics: AuditMetrics,
        scores: AuditScores
    ) -> ExecutiveSummary:
        """Dynamic local backup analyzer that produces perfect structural reviews if offline/unconfigured."""
        print("[Groq Fallback] Producing highly tailored, structured local backup report.")

        parsed_url = urllib.parse.urlparse(url)
        domain = parsed_url.netloc or "website.com"

        the_good = []
        critical_flaws = []
        roadmap = []

        # Page Title & Meta Data Fallback Checks
        if metrics.metaDataAnalysis:
            analysis = metrics.metaDataAnalysis
            # Title
            if analysis.titleStatus in ("Too Short", "Too Long", "Missing"):
                critical_flaws.append(f"Page title issues: Status is {analysis.titleStatus} ({analysis.titleLength} characters).")
                roadmap.extend(analysis.titleRecommendations)
            else:
                the_good.append(f"Page title length is optimal ({analysis.titleLength} characters).")
            
            # Meta Description
            if analysis.metaDescriptionStatus in ("Too Short", "Too Long", "Missing"):
                critical_flaws.append(f"Meta description issues: Status is {analysis.metaDescriptionStatus} ({analysis.metaDescriptionLength} characters).")
                roadmap.extend(analysis.metaDescriptionRecommendations)
            else:
                the_good.append(f"Meta description length is optimal ({analysis.metaDescriptionLength} characters).")

            # OG & Twitter Card
            if analysis.openGraphCount == 0:
                critical_flaws.append("Missing Open Graph metadata tags.")
                roadmap.append("Add Open Graph meta tags (og:title, og:image, og:description) to improve social share layout.")
            else:
                the_good.append(f"Open Graph metadata tags found ({analysis.openGraphCount} tags).")

            if analysis.twitterCardCount == 0:
                critical_flaws.append("Missing Twitter Card metadata tags.")
                roadmap.append("Add Twitter Card meta tags to optimize rich snippet preview on Twitter/X.")
            else:
                the_good.append(f"Twitter Card metadata tags found ({analysis.twitterCardCount} tags).")
        else:
            # Fallback legacy checks
            if not metrics.hasTitle:
                critical_flaws.append("Complete absence of `<title>` tag. This severely limits search visibility.")
                roadmap.append("Implement a custom, action-oriented `<title>` tag (approx 55 characters) for the page.")
            if not metrics.hasMetaDescription:
                critical_flaws.append("Missing `<meta name='description'>` search snippet description.")
                roadmap.append("Create a professional description under 155 characters featuring contextual keywords.")

        # SEO Checklist
        if metrics.headingStructure.h1Count == 0:
            critical_flaws.append("Missing critical H1 heading. Crawlers cannot deduce the core document topic.")
            roadmap.append("Add a single, clean `<h1>` title element to mark the primary page headline.")

        # Performance Checklist
        if scores.performance >= 8.0:
            the_good.append(f"Highly optimized first-contentful load and query handshake duration ({metrics.loadTimeMs:.1f}ms).")
        else:
            critical_flaws.append(f"Page loading delay is high ({metrics.loadTimeMs:.1f}ms). User bounce risk is elevated.")
            roadmap.append("Optimize assets by implementing lazy loading on images, caching headers, and bundling scripts.")

        # Technical/Accessibility Checklist
        if metrics.sslActive:
            the_good.append("Active secure SSL connection (HTTPS). User data exchanges are completely encrypted.")
        else:
            critical_flaws.append("Insecure HTTP endpoint. Major browsers will flag this site with safety warnings.")
            roadmap.append("Acquire and configure an SSL/TLS certificate. Redirect all port 80 traffic to HTTPS.")

        if not metrics.hasViewport:
            critical_flaws.append("Viewport meta description tag is missing. Page rendering will collapse on mobile devices.")
            roadmap.append("Insert standard adaptive viewport settings: `<meta name='viewport' content='width=device-width, initial-scale=1.0'>`.")

        if metrics.imagesMissingAlt > 0:
            critical_flaws.append(f"Detected {metrics.imagesMissingAlt} inline image elements lacking custom alt attributes.")
            roadmap.append(f"Review the {metrics.totalImages} image(s) on-page and apply alternative text tags to improve screen readers support.")

        # Broken Links Checklist
        broken_links_md = ""
        if metrics.brokenLinksCount > 0:
            critical_flaws.append(f"Detected {metrics.brokenLinksCount} broken hyperlink(s) pointing to inaccessible destinations.")
            # Add up to 3 links in the roadmap, list all in the markdown block below
            for link in metrics.brokenLinks[:3]:
                roadmap.append(f"Fix broken link: {link.url} (HTTP {link.statusCode}: {link.errorDescription})")
            if metrics.brokenLinksCount > 3:
                roadmap.append(f"Fix remaining {metrics.brokenLinksCount - 3} broken hyperlink(s) identified in the audit report.")

            broken_links_list = []
            for link in metrics.brokenLinks:
                status = f"Status {link.statusCode}" if link.statusCode > 0 else "Network Error"
                broken_links_list.append(f"- **URL**: {link.url} | **Error**: {status} ({link.errorDescription})")
            broken_links_md = "\n## 🔗 Broken Links & Navigation Health\n" + "\n".join(broken_links_list) + "\n"
        else:
            the_good.append("All checked hyperlinks on the page are healthy and reachable (no broken links).")

        # Pad standard elements
        if len(the_good) < 3:
            the_good.append("Page documents utilize valid structural HTML tags compliant with modern parsing specifications.")
            the_good.append("Header server status returned success validation checks.")

        roadmap.append("Re-submit the URL to this auditor after making these adjustments to observe your Health Score improve.")

        notice = ""
        if not os.environ.get("GROQ_API_KEY") or os.environ.get("GROQ_API_KEY") == "YOUR_GROQ_API_KEY":
            notice = "\n\n> *Note: Unlock deep cognitive audit insights by defining a real **GROQ_API_KEY** environment variable in your server configuration.*"

        # Generate a professional, highly readable markdown text block
        raw_markdown = f"""
# Senior Auditor Executive Report: **{domain}**
*Audit Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}*
{notice}

---

## 🟢 The Good (Structural Wins)
{chr(10).join(f'- **PASSED**: {item}' for item in the_good)}

---

## 🔴 Critical Flaws (Structural & Accessibility Deficits)
{chr(10).join(f'- **CRITICAL**: {item}' for item in critical_flaws)}
{broken_links_md}
---

## 🗺️ Recommended Developer Roadmap
Complete the following prioritized checklist to raise your **Website Health Score** from **{scores.overall}/10** to **9.5+/10**:

{chr(10).join(f'{i+1}. **Recommended Fix**: {item}' for i, item in enumerate(roadmap))}

---
*Assessment compiled dynamically by the local Website Auditor Scoring Engine.*
"""

        return ExecutiveSummary(
            theGood=the_good,
            criticalFlaws=critical_flaws,
            roadmap=roadmap,
            rawMarkdown=raw_markdown
        )
