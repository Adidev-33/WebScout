"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";

interface BrokenLinkDetails {
  url: string;
  statusCode: number;
  errorDescription: string;
}

interface MetaDataAnalysisDetails {
  titleLength: number;
  titleStatus: string;
  titleRecommendations: string[];
  metaDescriptionLength: number;
  metaDescriptionStatus: string;
  metaDescriptionRecommendations: string[];
  openGraphCount: number;
  twitterCardCount: number;
}

interface AuditReport {
  id: string;
  url: string;
  timestamp: string;
  status: string;
  progress: string;
  error: string | null;
  screenshotPath?: string | null;
  scores: {
    overall: number;
    seo: number;
    performance: number;
    technical: number;
  } | null;
  metrics: {
    loadTimeMs: number;
    responseCode: number;
    sslActive: boolean;
    consoleErrorsSimulated: string[];
    totalImages: number;
    imagesMissingAlt: number;
    hasTitle: boolean;
    hasMetaDescription: boolean;
    hasViewport: boolean;
    headingStructure: {
      h1Count: number;
      h2Count: number;
      h3Count: number;
    };
    metaTitle?: string;
    metaDescription?: string;
    brokenLinksCount: number;
    brokenLinks: BrokenLinkDetails[];
    metaDataAnalysis?: MetaDataAnalysisDetails;
  } | null;
  summary: {
    theGood: string[];
    criticalFlaws: string[];
    roadmap: string[];
    rawMarkdown: string;
  } | null;
}

export default function AuditReportDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/audits/${id}`);
        if (!res.ok) {
          throw new Error("Audit report not found on server.");
        }
        const data = await res.json();
        setReport(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch report.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.0) return "var(--accent-green)";
    if (score >= 5.0) return "var(--accent-orange)";
    return "var(--accent-red)";
  };

  const getScoreStatusLabel = (score: number, category: string) => {
    if (score >= 8.0) return "OPTIMIZED";
    if (score >= 5.0) return "NEEDS IMPROVEMENT";
    return category === "seo" ? "CRITICAL FLAWS" : "CRITICAL FLAWS";
  };

  const getStatusTagForMetaStatus = (status: string) => {
    if (status === "Optimal") return <span className="status-tag secure">OPTIMAL</span>;
    if (status === "Missing") return <span className="status-tag critical">MISSING</span>;
    return <span className="status-tag warning">{status.toUpperCase()}</span>;
  };

  const getStatusCodeColor = (code: number) => {
    if (code === 0) return "var(--text-muted)";
    if (code >= 500) return "var(--accent-orange)";
    return "var(--accent-red)";
  };

  if (loading) {
    return (
      <div style={{ padding: "80px", textAlign: "center", color: "var(--text-secondary)" }}>
        <p>Retrieving cybernetic analysis data...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{ padding: "80px", textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
        <h2 style={{ color: "var(--accent-red)", marginBottom: "16px" }}>Error Loading Report</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>{error || "Report does not exist."}</p>
        <Link href="/" className="btn-secondary">Back to Landing</Link>
      </div>
    );
  }

  const { scores, metrics, summary } = report;

  // Calculate circular SVG progress parameters
  const getCircleStrokeProps = (score: number, radius = 50) => {
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 10) * circumference;
    return {
      strokeDasharray: `${circumference}`,
      strokeDashoffset: `${strokeDashoffset}`,
    };
  };

  // Metric analysis values
  const missingMetaTagsCount = 
    (metrics?.hasTitle ? 0 : 1) + 
    (metrics?.hasMetaDescription ? 0 : 1) + 
    (metrics?.hasViewport ? 0 : 1);

  const hasBrokenLinks = metrics && metrics.brokenLinksCount > 0;

  return (
    <div style={{ width: "100%", paddingBottom: "48px" }}>
      {/* Top Banner Control Panel */}
      <div className="logs-header" style={{ paddingLeft: "40px", paddingRight: "40px", borderBottom: "1px solid var(--border-color)", marginBottom: "24px", background: "rgba(6, 11, 19, 0.4)" }}>
        <div className="logs-title-section">
          <h1 className="logs-title" style={{ fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>Audit Report:</span>
            <span style={{ color: "var(--accent-green)", fontFamily: "var(--font-mono)" }}>
              {new URL(report.url).hostname}
            </span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn-secondary" onClick={handlePrint}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      <div className="dashboard-grid" style={{ paddingTop: "0" }}>
        
        {/* Card 1: Overall Health Score */}
        <div className="dashboard-card span-5" style={{ minHeight: "320px", justifyContent: "space-between" }}>
          <span className="dashboard-card-title">Overall Health Score</span>
          <div className="score-circle-container">
            <svg width="150" height="150" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
              {/* Background circle */}
              <circle cx="60" cy="60" r="50" fill="transparent" stroke="#101a30" strokeWidth="10" />
              {/* Foreground animated circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="transparent"
                stroke={scores ? getScoreColor(scores.overall) : "var(--accent-green)"}
                strokeWidth="10"
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 1s ease-in-out",
                  ...getCircleStrokeProps(scores ? scores.overall : 0)
                }}
              />
            </svg>
            <div className="score-value">
              <span className="number">{scores ? scores.overall.toFixed(1) : "0.0"}</span>
              <span className="scale">/ 10</span>
            </div>
          </div>
          <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            Weighted: 40% SEO + 30% Perf + 30% Tech
          </div>
        </div>

        {/* Card 2: Three Small Category Charts */}
        <div className="dashboard-card span-7" style={{ minHeight: "320px", justifyContent: "space-between" }}>
          <span className="dashboard-card-title">Metric Vectors</span>
          <div className="metrics-row">
            {/* SEO Visibility */}
            <div className="subscore-item">
              <div className="score-circle-container" style={{ margin: "0" }}>
                <svg width="84" height="84" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="40" cy="40" r="32" fill="transparent" stroke="#101a30" strokeWidth="6" />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="transparent"
                    stroke={scores ? getScoreColor(scores.seo) : "var(--accent-green)"}
                    strokeWidth="6"
                    strokeLinecap="round"
                    style={getCircleStrokeProps(scores ? scores.seo : 0, 32)}
                  />
                </svg>
                <div className="score-value" style={{ fontSize: "14px" }}>
                  <span>{scores ? scores.seo.toFixed(1) : "0.0"}</span>
                </div>
              </div>
              <span className="subscore-label">SEO Visibility</span>
              <span className="subscore-status" style={{ color: scores ? getScoreColor(scores.seo) : "var(--accent-green)" }}>
                {scores ? getScoreStatusLabel(scores.seo, "seo") : "PENDING"}
              </span>
            </div>

            {/* Performance */}
            <div className="subscore-item">
              <div className="score-circle-container" style={{ margin: "0" }}>
                <svg width="84" height="84" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="40" cy="40" r="32" fill="transparent" stroke="#101a30" strokeWidth="6" />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="transparent"
                    stroke={scores ? getScoreColor(scores.performance) : "var(--accent-green)"}
                    strokeWidth="6"
                    strokeLinecap="round"
                    style={getCircleStrokeProps(scores ? scores.performance : 0, 32)}
                  />
                </svg>
                <div className="score-value" style={{ fontSize: "14px" }}>
                  <span>{scores ? scores.performance.toFixed(1) : "0.0"}</span>
                </div>
              </div>
              <span className="subscore-label">Performance</span>
              <span className="subscore-status" style={{ color: scores ? getScoreColor(scores.performance) : "var(--accent-green)" }}>
                {scores ? getScoreStatusLabel(scores.performance, "performance") : "PENDING"}
              </span>
            </div>

            {/* Accessibility */}
            <div className="subscore-item">
              <div className="score-circle-container" style={{ margin: "0" }}>
                <svg width="84" height="84" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="40" cy="40" r="32" fill="transparent" stroke="#101a30" strokeWidth="6" />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="transparent"
                    stroke={scores ? getScoreColor(scores.technical) : "var(--accent-green)"}
                    strokeWidth="6"
                    strokeLinecap="round"
                    style={getCircleStrokeProps(scores ? scores.technical : 0, 32)}
                  />
                </svg>
                <div className="score-value" style={{ fontSize: "14px" }}>
                  <span>{scores ? scores.technical.toFixed(1) : "0.0"}</span>
                </div>
              </div>
              <span className="subscore-label">Accessibility</span>
              <span className="subscore-status" style={{ color: scores ? getScoreColor(scores.technical) : "var(--accent-green)" }}>
                {scores ? getScoreStatusLabel(scores.technical, "technical") : "PENDING"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Full-Page Visual Capture */}
        <div className="dashboard-card span-5">
          <span className="dashboard-card-title">Full-Page Visual Capture</span>
          <div className="visual-capture-frame">
            <div className="frame-header">
              <div className="frame-dots">
                <span className="frame-dot red"></span>
                <span className="frame-dot yellow"></span>
                <span className="frame-dot green"></span>
              </div>
              <span className="frame-title" style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                {new URL(report.url).hostname}
              </span>
              <div style={{ width: "24px" }} />
            </div>
            <div className="frame-body" style={{ position: "relative", overflow: "hidden", padding: 0 }}>

              {/* ── PRIORITY 1: Real Playwright screenshot (16:9) ── */}
              {report.screenshotPath ? (
                <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden" }}>
                  <img
                    src={`http://localhost:3000/screenshots/${report.screenshotPath}`}
                    alt={`Screenshot of ${report.url}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "top center",
                      display: "block",
                    }}
                  />
                  <div style={{
                    position: "absolute",
                    bottom: 0, left: 0, right: 0,
                    padding: "10px",
                    background: "linear-gradient(transparent, rgba(6,11,19,0.92))",
                    display: "flex",
                    justifyContent: "center",
                  }}>
                    <a
                      href={report.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{ textDecoration: "none", padding: "7px 14px", fontSize: "11px" }}
                    >
                      Open Live Site →
                    </a>
                  </div>
                </div>

              ) : (
                <>
                  {/* ── PRIORITY 2: Live iframe (only when no screenshot) ── */}
                  {!iframeBlocked && (
                    <iframe
                      ref={iframeRef}
                      src={report.url}
                      title={`Live preview of ${report.url}`}
                      sandbox="allow-scripts allow-same-origin"
                      style={{
                        width: "1280px",
                        height: "900px",
                        border: "none",
                        transform: "scale(0.27)",
                        transformOrigin: "top left",
                        pointerEvents: "none",
                        background: "#fff",
                        display: iframeLoaded ? "block" : "none",
                      }}
                      onLoad={() => {
                        try {
                          const doc = iframeRef.current?.contentDocument;
                          if (!doc || doc.location.href === "about:blank") {
                            setIframeBlocked(true);
                          } else {
                            setIframeLoaded(true);
                          }
                        } catch {
                          setIframeLoaded(true);
                        }
                      }}
                      onError={() => setIframeBlocked(true)}
                    />
                  )}

                  {/* Loading shimmer */}
                  {!iframeLoaded && !iframeBlocked && (
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(135deg, #0d1520 0%, #0f1e30 50%, #0d1520 100%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "12px",
                    }}>
                      <div style={{
                        width: "32px",
                        height: "32px",
                        border: "3px solid rgba(0,255,136,0.2)",
                        borderTop: "3px solid var(--accent-green)",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }} />
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Loading preview...</span>
                    </div>
                  )}

                  {/* ── PRIORITY 3: Site blocks iframe, no screenshot available ── */}
                  {iframeBlocked && (
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(135deg, #0d1520 0%, #0f1e30 100%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "16px",
                      padding: "24px",
                    }}>
                      <img
                        src={`https://www.google.com/s2/favicons?sz=64&domain_url=${report.url}`}
                        alt="site favicon"
                        style={{ width: "48px", height: "48px", borderRadius: "10px", opacity: 0.85 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Preview not available</p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Site blocks iframe embedding</p>
                      </div>
                      <a
                        href={report.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                        style={{ textDecoration: "none", padding: "8px 16px", fontSize: "12px" }}
                      >
                        Open Live Site →
                      </a>
                    </div>
                  )}

                  {/* Overlay button on top of loaded iframe */}
                  {iframeLoaded && !iframeBlocked && (
                    <div style={{
                      position: "absolute",
                      bottom: 0, left: 0, right: 0,
                      padding: "10px",
                      background: "linear-gradient(transparent, rgba(6,11,19,0.9))",
                      display: "flex",
                      justifyContent: "center",
                    }}>
                      <a
                        href={report.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                        style={{ textDecoration: "none", padding: "7px 14px", fontSize: "11px" }}
                      >
                        Open Live Site →
                      </a>
                    </div>
                  )}
                </>
              )}


            </div>
          </div>
        </div>

        {/* Card 4: LLM Executive Summary */}
        <div className="dashboard-card span-7" style={{ minHeight: "400px" }}>
          <span className="dashboard-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>LLM Executive Summary</span>
            <span className="summary-tag">GPT-4o Engined</span>
          </span>

          <div className="summary-container">
            {/* The Good */}
            {summary && summary.theGood.length > 0 && (
              <div className="summary-section">
                <h4 className="summary-heading">
                  <span style={{ color: "var(--accent-green)" }}>●</span> The Good
                </h4>
                <ul className="bullet-list good">
                  {summary.theGood.map((good, idx) => (
                    <li key={idx} className="bullet-item">{good}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Critical Flaws */}
            {summary && summary.criticalFlaws.length > 0 && (
              <div className="summary-section">
                <h4 className="summary-heading">
                  <span style={{ color: "var(--accent-red)" }}>●</span> Critical Flaws
                </h4>
                <ul className="bullet-list flaws">
                  {summary.criticalFlaws.map((flaw, idx) => (
                    <li key={idx} className="bullet-item">{flaw}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actionable Roadmap */}
            {summary && summary.roadmap.length > 0 && (
              <div className="summary-section" style={{ marginTop: "12px" }}>
                <h4 className="summary-heading">
                  <span style={{ color: "var(--accent-green)" }}>🗺️</span> Actionable Roadmap
                </h4>
                <div className="roadmap-list">
                  {summary.roadmap.map((rec, idx) => (
                    <div className="roadmap-item" key={idx}>
                      <span className="roadmap-num">0{idx + 1}.</span>
                      <span className="roadmap-text">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 5: Raw Technical Metrics Table */}
        <div className="dashboard-card span-12">
          <span className="dashboard-card-title">Technical Diagnostics</span>
          <div className="metrics-table-wrapper">
            <table className="metrics-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* Page Load Speed */}
                <tr>
                  <td className="metric-name">Page Load Speed</td>
                  <td className="metric-value" style={{ color: metrics && metrics.loadTimeMs > 1500 ? "var(--accent-red)" : metrics && metrics.loadTimeMs > 300 ? "var(--accent-orange)" : "var(--accent-green)" }}>
                    {metrics ? `${(metrics.loadTimeMs / 1000).toFixed(2)}s` : "0.0s"}
                  </td>
                  <td>
                    {metrics && metrics.loadTimeMs > 1500 ? (
                      <span className="status-tag critical">CRITICAL</span>
                    ) : metrics && metrics.loadTimeMs > 300 ? (
                      <span className="status-tag warning">WARNING</span>
                    ) : (
                      <span className="status-tag secure">OPTIMIZED</span>
                    )}
                  </td>
                </tr>

                {/* HTTP Response Code */}
                <tr>
                  <td className="metric-name">HTTP Response Code</td>
                  <td className="metric-value" style={{ color: metrics?.responseCode === 200 ? "var(--accent-green)" : metrics?.responseCode === 0 ? "var(--text-muted)" : "var(--accent-red)" }}>
                    {metrics?.responseCode === 0 ? "N/A (offline)" : metrics?.responseCode ?? "—"}
                  </td>
                  <td>
                    {metrics?.responseCode === 200 ? (
                      <span className="status-tag secure">OK 200</span>
                    ) : metrics?.responseCode === 0 ? (
                      <span className="status-tag warning">OFFLINE</span>
                    ) : (
                      <span className="status-tag critical">ERROR</span>
                    )}
                  </td>
                </tr>

                {/* SSL Certificate */}
                <tr>
                  <td className="metric-name">SSL Certificate</td>
                  <td className="metric-value" style={{ color: metrics?.sslActive ? "var(--accent-green)" : "var(--accent-red)" }}>
                    {metrics?.sslActive ? "Valid" : "Invalid"}
                  </td>
                  <td>
                    {metrics?.sslActive ? (
                      <span className="status-tag secure">SECURE</span>
                    ) : (
                      <span className="status-tag critical">CRITICAL</span>
                    )}
                  </td>
                </tr>

                {/* Console Errors */}
                <tr>
                  <td className="metric-name">Console Errors</td>
                  <td className="metric-value" style={{ color: metrics && metrics.consoleErrorsSimulated.length > 0 ? "var(--accent-red)" : "var(--accent-green)" }}>
                    {metrics ? metrics.consoleErrorsSimulated.length : 0}
                  </td>
                  <td>
                    {metrics && metrics.consoleErrorsSimulated.length > 3 ? (
                      <span className="status-tag critical">CRITICAL</span>
                    ) : metrics && metrics.consoleErrorsSimulated.length > 0 ? (
                      <span className="status-tag warning">WARNING</span>
                    ) : (
                      <span className="status-tag secure">SECURE</span>
                    )}
                  </td>
                </tr>

                {/* Missing Meta Tags */}
                <tr>
                  <td className="metric-name">Missing Meta Tags</td>
                  <td className="metric-value" style={{ color: missingMetaTagsCount > 1 ? "var(--accent-orange)" : missingMetaTagsCount > 0 ? "var(--accent-blue)" : "var(--accent-green)" }}>
                    {missingMetaTagsCount}
                  </td>
                  <td>
                    {missingMetaTagsCount > 1 ? (
                      <span className="status-tag warning">WARNING</span>
                    ) : missingMetaTagsCount > 0 ? (
                      <span className="status-tag info">INFO</span>
                    ) : (
                      <span className="status-tag secure">SECURE</span>
                    )}
                  </td>
                </tr>

                {/* Page Title Status */}
                <tr>
                  <td className="metric-name">
                    Page Title
                    {metrics?.metaTitle && (
                      <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", fontWeight: 400, marginTop: "2px", fontFamily: "var(--font-mono)", maxWidth: "360px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        "{metrics.metaTitle}"
                      </span>
                    )}
                  </td>
                  <td className="metric-value" style={{ color: metrics?.metaDataAnalysis?.titleStatus === "Optimal" ? "var(--accent-green)" : metrics?.metaDataAnalysis?.titleStatus === "Missing" ? "var(--accent-red)" : "var(--accent-orange)" }}>
                    {metrics?.metaDataAnalysis
                      ? `${metrics.metaDataAnalysis.titleLength} chars`
                      : metrics?.hasTitle ? "Present" : "Missing"}
                  </td>
                  <td>
                    {metrics?.metaDataAnalysis
                      ? getStatusTagForMetaStatus(metrics.metaDataAnalysis.titleStatus)
                      : metrics?.hasTitle
                        ? <span className="status-tag secure">PRESENT</span>
                        : <span className="status-tag critical">MISSING</span>}
                  </td>
                </tr>

                {/* Meta Description Status */}
                <tr>
                  <td className="metric-name">
                    Meta Description
                    {metrics?.metaDescription && (
                      <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", fontWeight: 400, marginTop: "2px", fontFamily: "var(--font-mono)", maxWidth: "360px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        "{metrics.metaDescription}"
                      </span>
                    )}
                  </td>
                  <td className="metric-value" style={{ color: metrics?.metaDataAnalysis?.metaDescriptionStatus === "Optimal" ? "var(--accent-green)" : metrics?.metaDataAnalysis?.metaDescriptionStatus === "Missing" ? "var(--accent-red)" : "var(--accent-orange)" }}>
                    {metrics?.metaDataAnalysis
                      ? `${metrics.metaDataAnalysis.metaDescriptionLength} chars`
                      : metrics?.hasMetaDescription ? "Present" : "Missing"}
                  </td>
                  <td>
                    {metrics?.metaDataAnalysis
                      ? getStatusTagForMetaStatus(metrics.metaDataAnalysis.metaDescriptionStatus)
                      : metrics?.hasMetaDescription
                        ? <span className="status-tag secure">PRESENT</span>
                        : <span className="status-tag critical">MISSING</span>}
                  </td>
                </tr>

                {/* Open Graph Tags */}
                <tr>
                  <td className="metric-name">Open Graph Tags</td>
                  <td className="metric-value" style={{ color: (metrics?.metaDataAnalysis?.openGraphCount ?? 0) > 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
                    {metrics?.metaDataAnalysis?.openGraphCount ?? 0} tags
                  </td>
                  <td>
                    {(metrics?.metaDataAnalysis?.openGraphCount ?? 0) > 0 ? (
                      <span className="status-tag secure">PRESENT</span>
                    ) : (
                      <span className="status-tag critical">MISSING</span>
                    )}
                  </td>
                </tr>

                {/* Twitter Card Tags */}
                <tr>
                  <td className="metric-name">Twitter Card Tags</td>
                  <td className="metric-value" style={{ color: (metrics?.metaDataAnalysis?.twitterCardCount ?? 0) > 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
                    {metrics?.metaDataAnalysis?.twitterCardCount ?? 0} tags
                  </td>
                  <td>
                    {(metrics?.metaDataAnalysis?.twitterCardCount ?? 0) > 0 ? (
                      <span className="status-tag secure">PRESENT</span>
                    ) : (
                      <span className="status-tag critical">MISSING</span>
                    )}
                  </td>
                </tr>

                {/* Heading Structure */}
                <tr>
                  <td className="metric-name">Heading Structure (H1 / H2 / H3)</td>
                  <td className="metric-value" style={{ color: metrics?.headingStructure?.h1Count === 1 ? "var(--accent-green)" : metrics?.headingStructure?.h1Count === 0 ? "var(--accent-red)" : "var(--accent-orange)" }}>
                    {metrics ? `${metrics.headingStructure.h1Count} / ${metrics.headingStructure.h2Count} / ${metrics.headingStructure.h3Count}` : "— / — / —"}
                  </td>
                  <td>
                    {metrics?.headingStructure?.h1Count === 1 ? (
                      <span className="status-tag secure">OPTIMAL</span>
                    ) : metrics?.headingStructure?.h1Count === 0 ? (
                      <span className="status-tag critical">MISSING H1</span>
                    ) : (
                      <span className="status-tag warning">MULTIPLE H1</span>
                    )}
                  </td>
                </tr>

                {/* Images & Alt Text */}
                <tr>
                  <td className="metric-name">Images Missing Alt Text</td>
                  <td className="metric-value" style={{ color: metrics && metrics.imagesMissingAlt > 0 ? "var(--accent-red)" : "var(--accent-green)" }}>
                    {metrics ? `${metrics.imagesMissingAlt} / ${metrics.totalImages}` : "0 / 0"}
                  </td>
                  <td>
                    {metrics && metrics.imagesMissingAlt > 0 ? (
                      <span className="status-tag warning">WARNING</span>
                    ) : (
                      <span className="status-tag secure">OPTIMIZED</span>
                    )}
                  </td>
                </tr>

                {/* Broken Links Count */}
                <tr>
                  <td className="metric-name">Broken Links Detected</td>
                  <td className="metric-value" style={{ color: (metrics?.brokenLinksCount ?? 0) > 0 ? "var(--accent-red)" : "var(--accent-green)" }}>
                    {metrics?.brokenLinksCount ?? 0}
                  </td>
                  <td>
                    {(metrics?.brokenLinksCount ?? 0) > 2 ? (
                      <span className="status-tag critical">CRITICAL</span>
                    ) : (metrics?.brokenLinksCount ?? 0) > 0 ? (
                      <span className="status-tag warning">WARNING</span>
                    ) : (
                      <span className="status-tag secure">CLEAN</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 6: Broken Links Detail (only shown when broken links exist) */}
        {hasBrokenLinks && (
          <div className="dashboard-card span-12">
            <span className="dashboard-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>🔗 Broken Links &amp; Navigation Health</span>
              <span className="status-tag critical" style={{ fontSize: "9px" }}>
                {metrics!.brokenLinksCount} BROKEN
              </span>
            </span>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
              The following hyperlinks were found to be inaccessible during the audit scan. Fix these to improve SEO and user experience.
            </p>
            <div className="broken-links-table-wrapper">
              <table className="metrics-table">
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>HTTP Status</th>
                    <th>Error Description</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics!.brokenLinks.map((link, idx) => (
                    <tr key={idx}>
                      <td>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="broken-link-url"
                          title={link.url}
                        >
                          {link.url.length > 70 ? link.url.slice(0, 70) + "…" : link.url}
                        </a>
                      </td>
                      <td>
                        <span
                          className="status-code-badge"
                          style={{ color: getStatusCodeColor(link.statusCode), borderColor: getStatusCodeColor(link.statusCode) }}
                        >
                          {link.statusCode === 0 ? "ERR" : link.statusCode}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                        {link.errorDescription}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
