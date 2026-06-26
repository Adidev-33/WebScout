"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AuditReportSummary {
  id: string;
  url: string;
  timestamp: string;
  status: string;
  scores: {
    overall: number;
  } | null;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<AuditReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/audits");
      if (!res.ok) {
        throw new Error("Failed to load audit history from server.");
      }
      const data = await res.json();
      setReports(data);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    try {
      const res = await fetch(`http://localhost:3000/api/audits/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete the audit report.");
      }

      // Refresh list
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.message || "Error deleting report.");
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/audits", {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to clear audit reports.");
      }

      setReports([]);
    } catch (err: any) {
      alert(err.message || "Error clearing reports.");
    }
  };

  const getScoreClass = (score: number) => {
    if (score >= 8.0) return "";
    if (score >= 5.0) return "orange";
    return "red";
  };

  const formatTimestamp = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "80px", textAlign: "center", color: "var(--text-secondary)" }}>
        <p>Retrieving historical audit logs...</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", paddingBottom: "48px" }}>
      <div className="logs-header">
        <div className="logs-title-section">
          <h1 className="logs-title">Audit Logs</h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Review and manage all technical intelligence scans performed on your web projects.
          </p>
        </div>
        <div className="logs-header-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {reports.length > 0 && (
            <button className="btn-danger" onClick={handleClearAll} style={{ padding: "10px 18px", borderRadius: "8px", fontSize: "13px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              <span>Clear All</span>
            </button>
          )}
          <Link href="/" className="btn-primary" style={{ textDecoration: "none", padding: "10px 20px", borderRadius: "8px", fontSize: "13px" }}>
            <span>Run New Scan</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Link>
        </div>
      </div>

      {error ? (
        <div style={{ padding: "40px", margin: "16px 40px", border: "1px solid var(--accent-red)", borderRadius: "8px", textAlign: "center" }}>
          <p style={{ color: "var(--accent-red)", marginBottom: "16px" }}>{error}</p>
          <button className="btn-secondary" onClick={fetchReports}>Retry Query</button>
        </div>
      ) : reports.length === 0 ? (
        <div style={{ margin: "16px 40px" }}>
          <div className="empty-logs">
            <div className="empty-logs-icon">🔍</div>
            <h3 className="empty-logs-title">No Audit Reports Found</h3>
            <p className="empty-logs-desc">
              Get started by submitting a target website URL to compile your first cybernetic audit report.
            </p>
            <Link href="/" className="btn-primary" style={{ textDecoration: "none", marginTop: "24px", padding: "10px 18px", fontSize: "13px" }}>
              Analyze Website
            </Link>
          </div>
        </div>
      ) : (
        <div className="logs-grid">
          {reports.map((report) => (
            <div
              key={report.id}
              className="log-card"
              style={{ cursor: "pointer" }}
              onClick={() => router.push(`/audit/${report.id}`)}
            >
              <div className="log-card-left">
                <div className={`log-score-badge ${getScoreClass(report.scores?.overall || 0)}`}>
                  {report.scores ? report.scores.overall.toFixed(1) : "0.0"}
                </div>
                <div className="log-info">
                  <span className="log-url">{report.url}</span>
                  <div className="log-meta">
                    <span>ID: {report.id}</span>
                    <span>•</span>
                    <span>{formatTimestamp(report.timestamp)}</span>
                  </div>
                </div>
              </div>

              <div className="log-card-right">
                <span className="btn-secondary" style={{ padding: "6px 12px", fontSize: "12px", borderColor: "rgba(13, 242, 163, 0.2)", color: "var(--accent-green)" }}>
                  View Report
                </span>
                <div className="delete-btn-wrapper">
                  <button
                    className="delete-btn"
                    title="Delete Audit Report"
                    onClick={(e) => handleDelete(e, report.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
