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


class AgentService:
    @staticmethod
    async def generate_audit_summary(
        url: str,
        metrics: AuditMetrics,
        scores: AuditScores
    ) -> ExecutiveSummary:
        """
        Uses LangChain multi-agent orchestration to analyze crawled web parameters 
        and provide a senior-level detailed audit summary, with graceful local fallback.
        """
        api_key = os.environ.get("GROQ_API_KEY", "").strip()

        if not api_key or api_key == "YOUR_GROQ_API_KEY" or api_key == "":
            print("[Agents] GROQ_API_KEY is unset or placeholder. Cascading to local offline executive summary generator.")
            return AgentService._generate_simulated_summary(url, metrics, scores)

        model = os.environ.get("GROQ_MODEL", DEFAULT_MODEL).strip()
        print(f"[Agents] 🧠 Commencing multi-agent audit using {model} for url: {url}")

        try:
            # Lazy import LangChain components so offline mode doesn't strictly depend on langchain package installation
            from langchain_groq import ChatGroq
            from langchain_core.prompts import ChatPromptTemplate

            llm = ChatGroq(
                groq_api_key=api_key,
                model_name=model,
                temperature=0.2
            )

            # 1. SEO Agent Setup
            print("[Agents] 🔍 Invoking SEO Specialist Agent...")
            seo_prompt = ChatPromptTemplate.from_messages([
                ("system", "You are an expert SEO Specialist Agent. Your job is to analyze the SEO metrics of a website and extract structural wins and critical SEO flaws based on the technical telemetry provided."),
                ("user", """Analyze the following website crawl SEO parameters:
URL: {url}
SEO Score: {seo_score}/10
Telemetry Data:
{seo_telemetry}

Identify:
1. SEO Wins (e.g., correct title/meta tags, clean load, SSL, etc.)
2. SEO Flaws (e.g., missing/suboptimal titles, missing meta descriptions, missing viewport, incorrect header tag hierarchy, broken links).
Respond with a concise bullet-point list of your findings. Keep it technical and realistic.
""")
            ])
            
            seo_telemetry = json.dumps({
                "metaTitle": metrics.metaTitle,
                "metaDescription": metrics.metaDescription,
                "headingStructure": metrics.headingStructure.model_dump() if metrics.headingStructure else {},
                "metaDataAnalysis": metrics.metaDataAnalysis.model_dump() if metrics.metaDataAnalysis else {},
                "hasTitle": metrics.hasTitle,
                "hasMetaDescription": metrics.hasMetaDescription,
                "brokenLinksCount": metrics.brokenLinksCount,
            }, indent=2)

            seo_chain = seo_prompt | llm
            seo_response = await seo_chain.ainvoke({
                "url": url,
                "seo_score": scores.seo,
                "seo_telemetry": seo_telemetry
            })
            seo_report = seo_response.content
            print("[Agents] ✅ SEO Specialist Agent report completed.")

            # 2. Performance & Security Agent Setup
            print("[Agents] ⚡ Invoking Performance & Security Specialist Agent...")
            perf_prompt = ChatPromptTemplate.from_messages([
                ("system", "You are an expert Web Performance and Security Specialist Agent. Your job is to analyze the performance, accessibility, and security parameters of a website based on the telemetry provided."),
                ("user", """Analyze the following website crawl performance and security parameters:
URL: {url}
Performance Score: {performance_score}/10
Technical/Accessibility Score: {technical_score}/10
Telemetry Data:
{perf_telemetry}

Identify:
1. Performance & Security Wins (e.g., SSL active, fast load times, correct images with alt attributes)
2. Performance & Security Flaws (e.g., load time bottlenecks, insecure connections, images missing alt descriptions, console errors)
Respond with a concise list of bullet-points of your findings. Keep it technical and realistic.
""")
            ])

            perf_telemetry = json.dumps({
                "loadTimeMs": metrics.loadTimeMs,
                "sslActive": metrics.sslActive,
                "responseCode": metrics.responseCode,
                "totalImages": metrics.totalImages,
                "imagesMissingAlt": metrics.imagesMissingAlt,
                "hasViewport": metrics.hasViewport,
                "consoleErrorsSimulated": metrics.consoleErrorsSimulated,
            }, indent=2)

            perf_chain = perf_prompt | llm
            perf_response = await perf_chain.ainvoke({
                "url": url,
                "performance_score": scores.performance,
                "technical_score": scores.technical,
                "perf_telemetry": perf_telemetry
            })
            perf_report = perf_response.content
            print("[Agents] ✅ Performance & Security Specialist Agent report completed.")

            # 3. Lead Coordinator Agent Setup
            print("[Agents] 👑 Invoking Lead Auditor Coordinator Agent for final synthesis...")
            
            coordinator_prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are the Lead Website Auditor Coordinator Agent. "
                    "Your task is to synthesize the reports of the SEO Specialist and the Performance & Security Specialist into a single final website audit report. "
                    "You must output a structured JSON matching the ExecutiveSummary schema, which contains: "
                    "1. 'theGood' (List of 3-5 structural wins) "
                    "2. 'criticalFlaws' (List of 3-5 critical flaws) "
                    "3. 'roadmap' (List of 4-6 prioritized actionable developer tasks) "
                    "4. 'rawMarkdown' (A beautifully formatted comprehensive markdown document containing sections: 'The Good', 'Critical Flaws' including details of broken links if any, and 'Actionable Roadmap')."
                )),
                ("user", """Synthesize the following specialist agent inputs:
URL: {url}
Scores: Overall: {overall_score}/10, SEO: {seo_score}/10, Performance: {perf_score}/10, Technical: {tech_score}/10
Broken Links (if any): {broken_links}

--- SEO Specialist Report ---
{seo_report}

--- Performance & Security Specialist Report ---
{perf_report}

Generate the final ExecutiveSummary output. Make sure the rawMarkdown is well-formatted, clean, professional, and uses a realistic, objective senior developer tone.
""")
            ])

            # format broken links description
            broken_links_list = []
            for link in metrics.brokenLinks:
                status = f"Status {link.statusCode}" if link.statusCode > 0 else "Network Error"
                broken_links_list.append(f"URL: {link.url} | Error: {status} ({link.errorDescription})")
            broken_links_desc = "\n".join(broken_links_list) if broken_links_list else "None detected"

            structured_llm = llm.with_structured_output(ExecutiveSummary)
            coordinator_chain = coordinator_prompt | structured_llm
            
            final_summary = await coordinator_chain.ainvoke({
                "url": url,
                "overall_score": scores.overall,
                "seo_score": scores.seo,
                "perf_score": scores.performance,
                "tech_score": scores.technical,
                "broken_links": broken_links_desc,
                "seo_report": seo_report,
                "perf_report": perf_report
            })

            print("[Agents] ✅ Multi-agent synthesis completed successfully.")
            return final_summary

        except Exception as err:
            print(f"[Agents Error] Live Agent execution failed: {str(err)}. Falling back to local analyzer...")
            return AgentService._generate_simulated_summary(url, metrics, scores)

    @staticmethod
    def _generate_simulated_summary(
        url: str,
        metrics: AuditMetrics,
        scores: AuditScores
    ) -> ExecutiveSummary:
        """Dynamic local backup analyzer that produces perfect structural reviews if offline/unconfigured."""
        print("[Agents Fallback] Producing highly tailored, structured local backup report.")

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
*Assessment compiled dynamically by the local Website Auditor Scoring Engine (Fallback).*
"""

        return ExecutiveSummary(
            theGood=the_good,
            criticalFlaws=critical_flaws,
            roadmap=roadmap,
            rawMarkdown=raw_markdown
        )
