"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";

interface AuditScores {
  overall: number;
  seo: number;
  performance: number;
  technical: number;
}

interface AuditReport {
  id: string;
  url: string;
  timestamp: string;
  status: string;
  progress: string;
  scores: AuditScores | null;
}

export default function LandingPage() {
  const router = useRouter();
  
  // Web Auditor states
  const [url, setUrl] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);
  const [percent, setPercent] = useState(10);
  const [statusText, setStatusText] = useState("Initializing cybernetic intelligence modules...");
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Handle single URL audit submit
  const handleAuditorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setIsAuditing(true);
    setError(null);
    setStep(1);
    setPercent(10);
    setStatusText("Spawning Chromium WRS probe...");
  };

  // Run URL Auditor execution pipeline
  useEffect(() => {
    if (!isAuditing) return;

    let pollInterval: NodeJS.Timeout;

    const triggerAudit = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/audits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: url.trim(),
            renderJs: true,
            waitTime: 5000,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ detail: "Pipeline failed" }));
          throw new Error(errData.detail || "Server failed to initiate website audit.");
        }

        const report = await response.json();
        const auditId = report.id;

        // Poll status from backend
        pollInterval = setInterval(async () => {
          try {
            const pollRes = await fetch(`${API_BASE_URL}/api/audits/${auditId}`);
            if (!pollRes.ok) return;
            const pollData = await pollRes.json();

            if (pollData.status === "processing") {
              const progress = pollData.progress;
              setStatusText(progress);

              if (progress.toLowerCase().includes("step 0") || progress.toLowerCase().includes("redirects")) {
                setStep(1);
                setPercent(15);
              } else if (progress.toLowerCase().includes("step 1") || progress.toLowerCase().includes("scrape") || progress.toLowerCase().includes("dom")) {
                setStep(2);
                setPercent(40);
              } else if (progress.toLowerCase().includes("step 2") || progress.toLowerCase().includes("scoring") || progress.toLowerCase().includes("checks")) {
                setStep(3);
                setPercent(65);
              } else if (progress.toLowerCase().includes("step 3") || progress.toLowerCase().includes("multi-agent") || progress.toLowerCase().includes("analysis")) {
                setStep(4);
                setPercent(85);
              }
            } else if (pollData.status === "completed") {
              clearInterval(pollInterval);
              setStep(4);
              setPercent(100);
              setStatusText("Audit complete. Opening dashboard...");
              setTimeout(() => {
                router.push(`/audit/${auditId}`);
              }, 850);
            } else if (pollData.status === "failed") {
              clearInterval(pollInterval);
              setError(pollData.error || "Audit pipeline failed on backend.");
              setIsAuditing(false);
            }
          } catch (pollErr) {
            console.error("Error polling status:", pollErr);
          }
        }, 1000);

      } catch (err: any) {
        if (pollInterval) clearInterval(pollInterval);
        setError(err.message || "An unexpected error occurred during the audit.");
        setIsAuditing(false);
      }
    };

    triggerAudit();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isAuditing]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: "64px" }}>
      <div style={{ flex: 1 }}>
        {isAuditing ? (
          /* Visual Progress Screen for single crawl audit */
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "64px 20px" }}>
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
                <div className={`progress-step ${step === 1 ? "active" : step > 1 ? "completed" : "pending"}`}>
                  <div className="step-indicator">{step > 1 ? "✓" : "01"}</div>
                  <div className="step-details">
                    <span className="step-title">Step 1: Scraping DOM &amp; Launching Playwright Instance...</span>
                    <span className="step-subtitle">Initializing headless browser environment...</span>
                  </div>
                  <span className="step-status-tag">{step === 1 ? "Processing" : step > 1 ? "Ready" : "Waiting"}</span>
                  {step === 1 && <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />}
                </div>

                <div className={`progress-step ${step === 2 ? "active" : step > 2 ? "completed" : "pending"}`}>
                  <div className="step-indicator">{step > 2 ? "✓" : "02"}</div>
                  <div className="step-details">
                    <span className="step-title">Step 2: Parsing Metadata &amp; Running Technical SEO Checks...</span>
                    <span className="step-subtitle">Inspecting viewport configurations &amp; title semantics...</span>
                  </div>
                  <span className="step-status-tag">{step === 2 ? "Processing" : step > 2 ? "Ready" : "Waiting"}</span>
                  {step === 2 && <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.max(0, (percent - 25) * 4))}%` }} />}
                </div>

                <div className={`progress-step ${step === 3 ? "active" : step > 3 ? "completed" : "pending"}`}>
                  <div className="step-indicator">{step > 3 ? "✓" : "03"}</div>
                  <div className="step-details">
                    <span className="step-title">Step 3: Compiling Analytics &amp; Calculating Scores...</span>
                    <span className="step-subtitle">Analyzing layout constraints and latency timings...</span>
                  </div>
                  <span className="step-status-tag">{step === 3 ? "Processing" : step > 3 ? "Ready" : "Waiting"}</span>
                  {step === 3 && <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.max(0, (percent - 50) * 4))}%` }} />}
                </div>

                <div className={`progress-step ${step === 4 ? "active" : "pending"}`}>
                  <div className="step-indicator">{percent === 100 ? "✓" : "04"}</div>
                  <div className="step-details">
                    <span className="step-title">Step 4: Prompting Vision-Language Core for Executive Summary...</span>
                    <span className="step-subtitle">Generating semantic insights and developer roadmap...</span>
                  </div>
                  <span className="step-status-tag">{percent === 100 ? "Ready" : step === 4 ? "Processing" : "Waiting"}</span>
                  {step === 4 && percent < 100 && <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.max(0, (percent - 75) * 6.6))}%` }} />}
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          /* Error display */
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "64px 20px" }}>
            <div className="progress-container" style={{ borderColor: "var(--accent-red)", maxWidth: "550px", textAlign: "center" }}>
              <h2 style={{ color: "var(--accent-red)", marginBottom: "16px", fontFamily: "var(--font-title)" }}>
                Audit Pipeline Failure
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
                {error}
              </p>
              <button
                onClick={() => setError(null)}
                className="btn-secondary"
                style={{ cursor: "pointer", border: "none" }}
              >
                Back to Input
              </button>
            </div>
          </div>
        ) : (
          /* Simplified homepage input */
          <>
            <div className="landing-hero">
              <div className="badge">
                <span className="badge-dot"></span>
                Ready for Audit
              </div>
              <h1 className="hero-title">
                Precision Engineering for<br />
                <span>Cybernetic Web Intelligence</span>
              </h1>
              <p className="hero-subtitle">
                Deploy deep-scan probes to analyze SEO health, accessibility compliance, and performance metrics in real-time.
              </p>
            </div>

            <div className="search-container">
              <form className="search-form" onSubmit={handleAuditorSubmit}>
                <div className="search-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Enter website URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
                <button type="submit" className="btn-primary">
                  <span>Generate Audit</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </button>
              </form>
            </div>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    <line x1="15" y1="3" x2="15" y2="21" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="3" y1="15" x2="21" y2="15" />
                  </svg>
                </div>
                <h3 className="feature-title">Data Density</h3>
                <p className="feature-desc">
                  High-fidelity metrics visualized through a professional developer's lens.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3 className="feature-title">Precision Scan</h3>
                <p className="feature-desc">
                  Automated technical audits ensuring 100% compliance with modern standards.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3 className="feature-title">Real-Time Core</h3>
                <p className="feature-desc">
                  Instant feedback loops for ultra-fast performance optimization cycles.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
