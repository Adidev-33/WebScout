"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ProgressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUrl = searchParams.get("url") || "";

  const [step, setStep] = useState(1);
  const [percent, setPercent] = useState(10);
  const [statusText, setStatusText] = useState("Initializing cybernetic intelligence modules...");
  const [error, setError] = useState<string | null>(null);
  
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!targetUrl) {
      setError("No target URL specified for audit.");
      return;
    }

    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    // 1. Start simulated visual progress steps
    const progressTimer = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 90) return 90; // cap at 90% until backend finishes
        return prev + Math.floor(Math.random() * 5) + 2;
      });
    }, 400);

    const stepTimer = setInterval(() => {
      setStep((prevStep) => {
        if (prevStep >= 4) return 4;
        const nextStep = prevStep + 1;
        if (nextStep === 2) {
          setStatusText("Running cybernetic SEO checks...");
        } else if (nextStep === 3) {
          setStatusText("Compiling layout metrics & calculating raw scores...");
        } else if (nextStep === 4) {
          setStatusText("Prompting senior cognitive auditor LLM core...");
        }
        return nextStep;
      });
    }, 3000);

    // 2. Perform the actual API POST request to the backend
    const triggerAudit = async () => {
      try {
        console.log(`[Frontend] Posting audit for URL: ${targetUrl}`);
        const response = await fetch("http://localhost:3000/api/audits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: targetUrl }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ detail: "Pipeline failed" }));
          throw new Error(errData.detail || "Server failed to audit website.");
        }

        const report = await response.json();
        
        // Finalize visual progress
        clearInterval(progressTimer);
        clearInterval(stepTimer);
        setStep(4);
        setPercent(100);
        setStatusText("Audit complete. Opening dashboard...");

        // Small delay for animations to finish
        setTimeout(() => {
          router.push(`/audit/${report.id}`);
        }, 800);

      } catch (err: any) {
        clearInterval(progressTimer);
        clearInterval(stepTimer);
        setError(err.message || "An unexpected error occurred during the audit.");
      }
    };

    triggerAudit();

    return () => {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
    };
  }, [targetUrl, router]);

  if (error) {
    return (
      <div className="progress-container" style={{ borderColor: "var(--accent-red)", maxWidth: "550px", textAlign: "center" }}>
        <h2 style={{ color: "var(--accent-red)", marginBottom: "16px", fontFamily: "var(--font-title)" }}>
          Audit Pipeline Failure
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
          {error}
        </p>
        <Link href="/" className="btn-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Input
        </Link>
      </div>
    );
  }

  return (
    <div className="progress-container">
      <div className="progress-header">
        <div className="progress-title-section">
          <h2 className="progress-main-title">Precision Audit in Progress</h2>
          <span className="progress-sub">{statusText}</span>
        </div>
        <div className="progress-percent-container">
          <span className="progress-percent">{percent}%</span>
          <span className="progress-percent-label">Active Task</span>
        </div>
      </div>

      <div className="progress-list">
        {/* Step 1 */}
        <div className={`progress-step ${step === 1 ? "active" : step > 1 ? "completed" : "pending"}`}>
          <div className="step-indicator">{step > 1 ? "✓" : "01"}</div>
          <div className="step-details">
            <span className="step-title">Step 1: Scraping DOM &amp; Launching Playwright Instance...</span>
            <span className="step-subtitle">Initializing headless browser environment...</span>
          </div>
          <span className="step-status-tag">{step === 1 ? "Processing" : step > 1 ? "Ready" : "Waiting"}</span>
          {step === 1 && <div className="progress-bar-fill" style={{ width: `${percent}%` }} />}
        </div>

        {/* Step 2 */}
        <div className={`progress-step ${step === 2 ? "active" : step > 2 ? "completed" : "pending"}`}>
          <div className="step-indicator">{step > 2 ? "✓" : "02"}</div>
          <div className="step-details">
            <span className="step-title">Step 2: Parsing Metadata &amp; Running Technical SEO Checks...</span>
            <span className="step-subtitle">Inspecting viewport configurations &amp; title semantics...</span>
          </div>
          <span className="step-status-tag">{step === 2 ? "Processing" : step > 2 ? "Ready" : "Waiting"}</span>
          {step === 2 && <div className="progress-bar-fill" style={{ width: `${(percent - 25) * 4}%` }} />}
        </div>

        {/* Step 3 */}
        <div className={`progress-step ${step === 3 ? "active" : step > 3 ? "completed" : "pending"}`}>
          <div className="step-indicator">{step > 3 ? "✓" : "03"}</div>
          <div className="step-details">
            <span className="step-title">Step 3: Compiling Analytics &amp; Calculating Scores...</span>
            <span className="step-subtitle">Analyzing layout constraints and latency timings...</span>
          </div>
          <span className="step-status-tag">{step === 3 ? "Processing" : step > 3 ? "Ready" : "Waiting"}</span>
          {step === 3 && <div className="progress-bar-fill" style={{ width: `${(percent - 50) * 4}%` }} />}
        </div>

        {/* Step 4 */}
        <div className={`progress-step ${step === 4 ? "active" : "pending"}`}>
          <div className="step-indicator">{percent === 100 ? "✓" : "04"}</div>
          <div className="step-details">
            <span className="step-title">Step 4: Prompting Vision-Language Core for Executive Summary...</span>
            <span className="step-subtitle">Generating semantic insights and developer roadmap...</span>
          </div>
          <span className="step-status-tag">{percent === 100 ? "Ready" : step === 4 ? "Processing" : "Waiting"}</span>
          {step === 4 && percent < 100 && <div className="progress-bar-fill" style={{ width: `${(percent - 75) * 6.6}%` }} />}
        </div>
      </div>

    </div>
  );
}

export default function ProgressPage() {
  return (
    <Suspense fallback={
      <div className="progress-container" style={{ textAlign: "center", padding: "64px" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading cybernetic modules...</p>
      </div>
    }>
      <ProgressContent />
    </Suspense>
  );
}
