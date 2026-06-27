"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";

interface AuditScores {
  overall: number;
  seo: number;
  performance: number;
  technical: number;
}

interface HeadingStructure {
  h1Count: number;
  h2Count: number;
  h3Count: number;
}

interface AuditMetrics {
  loadTimeMs: number;
  responseCode: number;
  sslActive: boolean;
  consoleErrorsSimulated: string[];
  totalImages: number;
  imagesMissingAlt: number;
  hasTitle: boolean;
  hasMetaDescription: boolean;
  hasViewport: boolean;
  headingStructure: HeadingStructure;
  metaTitle?: string;
  metaDescription?: string;
  brokenLinksCount: number;
}

interface AuditReport {
  id: string;
  url: string;
  timestamp: string;
  scores: AuditScores;
  metrics: AuditMetrics;
}

interface ScoreDelta {
  overall: number;
  seo: number;
  performance: number;
  technical: number;
}

interface MetricDelta {
  loadTimeMs: number;
  totalImages: number;
  imagesMissingAlt: number;
  brokenLinksCount: number;
}

interface ChangeItem {
  item: string;
  status: string;
  description: string;
}

interface ComparisonData {
  auditA: AuditReport;
  auditB: AuditReport;
  scoreDelta: ScoreDelta;
  metricDelta: MetricDelta;
  changes: ChangeItem[];
}

export default function CompareAuditsDashboard({ params }: { params: Promise<{ id_a: string; id_b: string }> }) {
  const { id_a, id_b } = use(params);
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/compare/${id_a}/${id_b}`);
        if (!res.ok) {
          throw new Error("One or both audit reports could not be loaded for comparison.");
        }
        const compData = await res.json();
        setData(compData);
      } catch (err: any) {
        setError(err.message || "Failed to load comparison data.");
      } finally {
        setLoading(false);
      }
    };
    fetchComparison();
  }, [id_a, id_b]);

  if (loading) {
    return (
      <div style={{ padding: "80px", textAlign: "center", color: "var(--text-secondary)" }}>
        <p>Calculating score and metric deltas... Comparing DOM states...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "80px", textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
        <h2 style={{ color: "var(--accent-red)", marginBottom: "16px" }}>Error Loading Comparison</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>{error}</p>
        <Link href="/" className="btn-secondary">Back to Home</Link>
      </div>
    );
  }

  const { auditA, auditB, scoreDelta, metricDelta, changes } = data;

  const getScoreColor = (score: number) => {
    if (score >= 8.0) return "var(--accent-green)";
    if (score >= 5.0) return "var(--accent-orange)";
    return "var(--accent-red)";
  };

  const getDeltaBadge = (delta: number) => {
    if (delta > 0) {
      return (
        <span style={{ color: "var(--accent-green)", backgroundColor: "var(--accent-green-bg)", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 600 }}>
          +{delta.toFixed(1)}
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span style={{ color: "var(--accent-red)", backgroundColor: "var(--accent-red-bg)", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 600 }}>
          {delta.toFixed(1)}
        </span>
      );
    }
    return (
      <span style={{ color: "var(--text-secondary)", backgroundColor: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 600 }}>
        0.0
      </span>
    );
  };

  return (
    <div className="comparison-wrapper">
      {/* ── Top Header Title Panel ── */}
      <div className="diff-header">
        <div>
          <Link href="/" className="btn-secondary" style={{ marginBottom: "12px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 style={{ fontFamily: "var(--font-title)", fontSize: "24px", fontWeight: 700, display: "flex", gap: "8px", alignItems: "center" }}>
            <span>Compare audits</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "16px", color: "var(--accent-green)" }}>
              {auditA.id} ⇄ {auditB.id}
            </span>
          </h1>
        </div>
      </div>

      {/* ── Target URLs comparison summary panel ── */}
      <div className="diff-grid-cols" style={{ marginBottom: "32px" }}>
        {/* Base Audit A */}
        <div className="diff-card-overall" style={{ borderLeft: "4px solid var(--accent-blue)" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Audit A (Base / Staging)</div>
          <div style={{ fontSize: "16px", fontWeight: 600, margin: "6px 0", color: "var(--accent-blue)", wordBreak: "break-all" }}>{auditA.url}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Timestamp: {new Date(auditA.timestamp).toLocaleString()}</div>
        </div>

        {/* Target Audit B */}
        <div className="diff-card-overall" style={{ borderLeft: "4px solid var(--accent-green)" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Audit B (Target / Production)</div>
          <div style={{ fontSize: "16px", fontWeight: 600, margin: "6px 0", color: "var(--accent-green)", wordBreak: "break-all" }}>{auditB.url}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Timestamp: {new Date(auditB.timestamp).toLocaleString()}</div>
        </div>
      </div>

      {/* ── Scores & Metric delta breakdowns ── */}
      <div className="dashboard-grid" style={{ padding: 0, gap: "24px", marginBottom: "32px" }}>
        
        {/* Overall side-by-side card */}
        <div className="dashboard-card span-4" style={{ minHeight: "260px", justifyContent: "space-between" }}>
          <span className="dashboard-card-title">Overall Score Drift</span>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", width: "100%", margin: "20px 0" }}>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "36px", fontWeight: 700, color: getScoreColor(auditA.scores.overall) }}>
                {auditA.scores.overall.toFixed(1)}
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Audit A</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "20px", color: "var(--text-muted)" }}>➔</span>
              {getDeltaBadge(scoreDelta.overall)}
            </div>

            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "36px", fontWeight: 700, color: getScoreColor(auditB.scores.overall) }}>
                {auditB.scores.overall.toFixed(1)}
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Audit B</span>
            </div>
          </div>
          <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-secondary)" }}>
            Overall Health Score Delta
          </div>
        </div>

        {/* Categories side-by-side table */}
        <div className="dashboard-card span-8" style={{ minHeight: "260px" }}>
          <span className="dashboard-card-title">Metric Category Progressions</span>
          
          <div className="metrics-table-wrapper" style={{ margin: 0 }}>
            <table className="metrics-table">
              <thead>
                <tr>
                  <th>Category Vector</th>
                  <th>Audit A Score</th>
                  <th>Audit B Score</th>
                  <th>Delta Drift</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="metric-name">SEO Visibility</td>
                  <td className="metric-value" style={{ color: getScoreColor(auditA.scores.seo) }}>{auditA.scores.seo.toFixed(1)}</td>
                  <td className="metric-value" style={{ color: getScoreColor(auditB.scores.seo) }}>{auditB.scores.seo.toFixed(1)}</td>
                  <td>{getDeltaBadge(scoreDelta.seo)}</td>
                </tr>
                <tr>
                  <td className="metric-name">Performance &amp; Speed</td>
                  <td className="metric-value" style={{ color: getScoreColor(auditA.scores.performance) }}>{auditA.scores.performance.toFixed(1)}</td>
                  <td className="metric-value" style={{ color: getScoreColor(auditB.scores.performance) }}>{auditB.scores.performance.toFixed(1)}</td>
                  <td>{getDeltaBadge(scoreDelta.performance)}</td>
                </tr>
                <tr>
                  <td className="metric-name">Technical Accessibility</td>
                  <td className="metric-value" style={{ color: getScoreColor(auditA.scores.technical) }}>{auditA.scores.technical.toFixed(1)}</td>
                  <td className="metric-value" style={{ color: getScoreColor(auditB.scores.technical) }}>{auditB.scores.technical.toFixed(1)}</td>
                  <td>{getDeltaBadge(scoreDelta.technical)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Metric detail side by side comparison table ── */}
      <div className="dashboard-grid" style={{ padding: 0, gap: "24px", marginBottom: "32px" }}>
        <div className="dashboard-card span-12">
          <span className="dashboard-card-title">Technical Telemetry Compares</span>
          
          <div className="metrics-table-wrapper" style={{ margin: 0 }}>
            <table className="metrics-table">
              <thead>
                <tr>
                  <th>Telemetry parameter</th>
                  <th>Audit A value</th>
                  <th>Audit B value</th>
                  <th>Delta Difference</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="metric-name">First Page Load speed</td>
                  <td className="metric-value">{auditA.metrics.loadTimeMs.toFixed(0)} ms</td>
                  <td className="metric-value">{auditB.metrics.loadTimeMs.toFixed(0)} ms</td>
                  <td>
                    <span style={{
                      color: metricDelta.loadTimeMs < 0 ? "var(--accent-green)" : metricDelta.loadTimeMs > 0 ? "var(--accent-red)" : "var(--text-secondary)",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600
                    }}>
                      {metricDelta.loadTimeMs < 0 ? "" : "+"}{metricDelta.loadTimeMs.toFixed(0)} ms
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="metric-name">SSL Encryption</td>
                  <td className="metric-value">
                    <span className={`status-tag ${auditA.metrics.sslActive ? "secure" : "critical"}`}>
                      {auditA.metrics.sslActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="metric-value">
                    <span className={`status-tag ${auditB.metrics.sslActive ? "secure" : "critical"}`}>
                      {auditB.metrics.sslActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    {auditA.metrics.sslActive === auditB.metrics.sslActive ? (
                      <span style={{ color: "var(--text-muted)" }}>Unchanged</span>
                    ) : (
                      <span style={{ color: auditB.metrics.sslActive ? "var(--accent-green)" : "var(--accent-red)", fontWeight: 600 }}>
                        {auditB.metrics.sslActive ? "Activated" : "Deactivated"}
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="metric-name">Mobile Viewport tag</td>
                  <td className="metric-value">
                    <span className={`status-tag ${auditA.metrics.hasViewport ? "secure" : "critical"}`}>
                      {auditA.metrics.hasViewport ? "Present" : "Missing"}
                    </span>
                  </td>
                  <td className="metric-value">
                    <span className={`status-tag ${auditB.metrics.hasViewport ? "secure" : "critical"}`}>
                      {auditB.metrics.hasViewport ? "Present" : "Missing"}
                    </span>
                  </td>
                  <td>
                    {auditA.metrics.hasViewport === auditB.metrics.hasViewport ? (
                      <span style={{ color: "var(--text-muted)" }}>Unchanged</span>
                    ) : (
                      <span style={{ color: auditB.metrics.hasViewport ? "var(--accent-green)" : "var(--accent-red)", fontWeight: 600 }}>
                        {auditB.metrics.hasViewport ? "Added" : "Removed"}
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="metric-name">Total images parsed</td>
                  <td className="metric-value">{auditA.metrics.totalImages} images</td>
                  <td className="metric-value">{auditB.metrics.totalImages} images</td>
                  <td>
                    <span style={{ fontFamily: "var(--font-mono)" }}>
                      {metricDelta.totalImages > 0 ? "+" : ""}{metricDelta.totalImages}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="metric-name">Images missing [alt] tag</td>
                  <td className="metric-value">{auditA.metrics.imagesMissingAlt} images</td>
                  <td className="metric-value">{auditB.metrics.imagesMissingAlt} images</td>
                  <td>
                    <span style={{
                      color: metricDelta.imagesMissingAlt < 0 ? "var(--accent-green)" : metricDelta.imagesMissingAlt > 0 ? "var(--accent-red)" : "var(--text-secondary)",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600
                    }}>
                      {metricDelta.imagesMissingAlt > 0 ? "+" : ""}{metricDelta.imagesMissingAlt}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="metric-name">Broken links count</td>
                  <td className="metric-value">{auditA.metrics.brokenLinksCount} links</td>
                  <td className="metric-value">{auditB.metrics.brokenLinksCount} links</td>
                  <td>
                    <span style={{
                      color: metricDelta.brokenLinksCount < 0 ? "var(--accent-green)" : metricDelta.brokenLinksCount > 0 ? "var(--accent-red)" : "var(--text-secondary)",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600
                    }}>
                      {metricDelta.brokenLinksCount > 0 ? "+" : ""}{metricDelta.brokenLinksCount}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="metric-name">Heading structure (H1 / H2 / H3)</td>
                  <td className="metric-value" style={{ fontFamily: "var(--font-mono)" }}>
                    {auditA.metrics.headingStructure.h1Count} / {auditA.metrics.headingStructure.h2Count} / {auditA.metrics.headingStructure.h3Count}
                  </td>
                  <td className="metric-value" style={{ fontFamily: "var(--font-mono)" }}>
                    {auditB.metrics.headingStructure.h1Count} / {auditB.metrics.headingStructure.h2Count} / {auditB.metrics.headingStructure.h3Count}
                  </td>
                  <td>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      H1 delta: {auditB.metrics.headingStructure.h1Count - auditA.metrics.headingStructure.h1Count}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Metadata detailed tag-to-tag comparison block ── */}
      <div className="dashboard-grid" style={{ padding: 0, gap: "24px", marginBottom: "32px" }}>
        {/* Meta Title comparison */}
        <div className="dashboard-card span-6">
          <span className="dashboard-card-title">Header Meta Title tag</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
            <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <span className="status-tag info" style={{ fontSize: "8px", marginBottom: "6px" }}>Audit A title</span>
              <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "var(--font-title)" }}>
                {auditA.metrics.metaTitle || <em style={{ color: "var(--text-muted)" }}>Missing title tag</em>}
              </p>
              {auditA.metrics.metaTitle && (
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  Length: {auditA.metrics.metaTitle.length} characters
                </span>
              )}
            </div>
            <div>
              <span className="status-tag secure" style={{ fontSize: "8px", marginBottom: "6px" }}>Audit B title</span>
              <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "var(--font-title)" }}>
                {auditB.metrics.metaTitle || <em style={{ color: "var(--text-muted)" }}>Missing title tag</em>}
              </p>
              {auditB.metrics.metaTitle && (
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  Length: {auditB.metrics.metaTitle.length} characters
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Meta Description comparison */}
        <div className="dashboard-card span-6">
          <span className="dashboard-card-title">Header Meta Description tag</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
            <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <span className="status-tag info" style={{ fontSize: "8px", marginBottom: "6px" }}>Audit A description</span>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                {auditA.metrics.metaDescription || <em style={{ color: "var(--text-muted)" }}>Missing description tag</em>}
              </p>
              {auditA.metrics.metaDescription && (
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  Length: {auditA.metrics.metaDescription.length} characters
                </span>
              )}
            </div>
            <div>
              <span className="status-tag secure" style={{ fontSize: "8px", marginBottom: "6px" }}>Audit B description</span>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                {auditB.metrics.metaDescription || <em style={{ color: "var(--text-muted)" }}>Missing description tag</em>}
              </p>
              {auditB.metrics.metaDescription && (
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  Length: {auditB.metrics.metaDescription.length} characters
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Highlighted changes details list ── */}
      <div className="dashboard-card span-12" style={{ padding: "28px" }}>
        <span className="dashboard-card-title">Structural Audit Delta Checklist</span>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
          {changes.map((item, cIdx) => {
            let statusIcon = "✓";
            let color = "var(--text-secondary)";
            let statusText = "UNCHANGED";
            
            if (item.status === "improved") {
              statusIcon = "▲";
              color = "var(--accent-green)";
              statusText = "IMPROVED";
            } else if (item.status === "degraded") {
              statusIcon = "▼";
              color = "var(--accent-red)";
              statusText = "REGRESSION";
            }
            
            return (
              <div key={cIdx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(20,33,61,0.5)", paddingBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <span style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: item.status === "improved" ? "var(--accent-green-bg)" : item.status === "degraded" ? "var(--accent-red-bg)" : "rgba(255,255,255,0.04)",
                    color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: "12px"
                  }}>
                    {statusIcon}
                  </span>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{item.item}</span>
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{item.description}</span>
                  </div>
                </div>

                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  fontWeight: 700,
                  color,
                  letterSpacing: "1.5px",
                  marginLeft: "auto"
                }}>
                  {statusText}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
