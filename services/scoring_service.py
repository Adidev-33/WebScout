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
        if not metrics.hasMetaDescription:
            seo -= 1.5
        
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

        seo = max(1.0, round(seo, 1))

        # 2. Performance Score calculation (starts at 10.0)
        performance = 10.0
        load_time = metrics.loadTimeMs

        if load_time <= 300:
            pass  # Perfect render speed
        elif load_time <= 800:
            performance -= 0.5
        elif load_time <= 1500:
            performance -= 1.5
        elif load_time <= 3000:
            performance -= 3.0
        else:
            performance -= 5.0

        # Unoptimized images density penalty
        if metrics.totalImages > 30:
            performance -= 1.5
        elif metrics.totalImages > 15:
            performance -= 0.8

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
