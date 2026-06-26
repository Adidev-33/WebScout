# -*- coding: utf-8 -*-
"""
@license
SPDX-License-Identifier: Apache-2.0
"""

from models.audit import AuditMetrics, AuditScores

class ScoringService:
    @staticmethod
    def calculate_scores(metrics: AuditMetrics) -> AuditScores:
        """
        Runs clean, deterministic Python scoring logic to calculate 
        scores out of 10 for the website metrics.
        """
        print("[Scoring] Executing deterministic scoring algorithms...")

        # 1. SEO Score calculation (starts at 10.0)
        seo = 10.0
        if not metrics.hasTitle:
            seo -= 1.5
        elif metrics.metaDataAnalysis and metrics.metaDataAnalysis.titleStatus in ("Too Short", "Too Long"):
            seo -= 0.5

        if not metrics.hasMetaDescription:
            seo -= 1.5
        elif metrics.metaDataAnalysis and metrics.metaDataAnalysis.metaDescriptionStatus in ("Too Short", "Too Long"):
            seo -= 0.5

        if metrics.metaDataAnalysis:
            if metrics.metaDataAnalysis.openGraphCount == 0:
                seo -= 0.25
            if metrics.metaDataAnalysis.twitterCardCount == 0:
                seo -= 0.25

        h1 = metrics.headingStructure.h1Count
        if h1 == 0:
            seo -= 1.5
        elif h1 > 1:
            seo -= 0.5

        if metrics.headingStructure.h2Count == 0:
            seo -= 1.0

        if metrics.totalImages > 0:
            missing_ratio = metrics.imagesMissingAlt / metrics.totalImages
            if missing_ratio > 0.5:
                seo -= 2.0
            elif missing_ratio > 0:
                seo -= 1.0

        # Broken links SEO penalty
        if metrics.brokenLinksCount > 0:
            seo -= min(2.0, metrics.brokenLinksCount * 0.5)

        seo = max(1.0, round(seo, 1))

        # 2. Performance Score calculation (starts at 10.0)
        performance = 10.0
        load_time = metrics.loadTimeMs

        if load_time <= 1000:
            pass  # Fast render speed
        elif load_time <= 2500:
            performance -= 0.5
        elif load_time <= 5000:
            performance -= 1.0
        elif load_time <= 10000:
            performance -= 2.0
        elif load_time <= 20000:
            performance -= 3.0
        else:
            performance -= 4.0

        # Unoptimized images density penalty (more relaxed thresholds)
        if metrics.totalImages > 100:
            performance -= 0.5
        elif metrics.totalImages > 50:
            performance -= 0.2

        performance = max(1.0, round(performance, 1))

        # 3. Technical & Accessibility Score calculation (starts at 10.0)
        technical = 10.0
        if not metrics.sslActive:
            technical -= 2.0  # Security deduction
        if not metrics.hasViewport:
            technical -= 2.0  # Mobile friendliness deduction

        # Penalize for console errors or warnings
        error_count = len(metrics.consoleErrorsSimulated)
        if error_count > 0:
            penalty = min(4.0, error_count * 0.8)
            technical -= penalty

        if metrics.responseCode != 200 and metrics.responseCode != 0:
            technical -= 1.5

        # Broken links technical/accessibility penalty
        if metrics.brokenLinksCount > 0:
            technical -= min(1.5, metrics.brokenLinksCount * 0.3)

        technical = max(1.0, round(technical, 1))

        # 4. Overall Health Score (Weighted average)
        # 40% SEO, 30% Performance, 30% Technical
        overall = (seo * 0.4) + (performance * 0.3) + (technical * 0.3)
        overall = round(overall, 1)

        print(f"[Scoring] Scoring output: SEO={seo}/10, PERF={performance}/10, TECH={technical}/10 -> OVERALL={overall}/10")
        
        return AuditScores(
            overall=overall,
            seo=seo,
            performance=performance,
            technical=technical
        )
