"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";

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

interface RedirectStep {
  url: string;
  statusCode: number;
  redirectType: string;
  errorDescription: string | null;
}

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
  error: string | null;
  screenshotPath?: string | null;
  redirectChain?: RedirectStep[];
  previousAuditId?: string | null;
  scores: AuditScores | null;
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

// Markdown rendering helper
const renderMarkdown = (text: string) => {
  const parseInline = (line: string) => {
    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={idx} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={idx} style={{ fontStyle: "italic" }}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code 
            key={idx} 
            style={{ 
              fontFamily: "var(--font-mono)", 
              fontSize: "11px", 
              backgroundColor: "rgba(255, 255, 255, 0.15)", 
              padding: "2px 6px", 
              borderRadius: "4px",
              color: "var(--accent-orange)"
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  
  let currentList: React.ReactNode[] = [];
  let isNumberedList = false;

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushList = (key: number) => {
    if (currentList.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol 
            key={`ol-${key}`} 
            style={{ 
              paddingLeft: "20px", 
              margin: "6px 0", 
              fontSize: "13px", 
              listStyleType: "decimal",
              width: "100%",
              boxSizing: "border-box"
            }}
          >
            {...currentList}
          </ol>
        );
      } else {
        elements.push(
          <ul 
            key={`ul-${key}`} 
            style={{ 
              paddingLeft: "20px", 
              margin: "6px 0", 
              fontSize: "13px", 
              listStyleType: "disc",
              width: "100%",
              boxSizing: "border-box"
            }}
          >
            {...currentList}
          </ul>
        );
      }
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    
    // Check for code blocks
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        elements.push(
          <pre 
            key={`code-${idx}`} 
            style={{ 
              fontFamily: "var(--font-mono)", 
              fontSize: "12px", 
              backgroundColor: "rgba(0, 0, 0, 0.5)", 
              border: "1px solid var(--border-color)",
              padding: "12px", 
              borderRadius: "6px",
              margin: "10px 0",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              color: "#e2e8f0",
              maxWidth: "100%",
              width: "100%",
              overflowX: "auto",
              boxSizing: "border-box"
            }}
          >
            <code style={{ fontFamily: "inherit", color: "inherit" }}>
              {codeBlockLines.join("\n")}
            </code>
          </pre>
        );
        codeBlockLines = [];
      } else {
        flushList(idx);
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // Check for headers
    if (trimmed.startsWith("##### ")) {
      flushList(idx);
      elements.push(
        <h6 key={idx} style={{ fontSize: "11px", fontWeight: 700, marginTop: "12px", marginBottom: "4px", color: "var(--accent-green)" }}>
          {parseInline(trimmed.slice(6))}
        </h6>
      );
      return;
    }
    if (trimmed.startsWith("#### ")) {
      flushList(idx);
      elements.push(
        <h5 key={idx} style={{ fontSize: "12px", fontWeight: 700, marginTop: "12px", marginBottom: "4px", color: "var(--accent-green)" }}>
          {parseInline(trimmed.slice(5))}
        </h5>
      );
      return;
    }
    if (trimmed.startsWith("### ")) {
      flushList(idx);
      elements.push(
        <h4 key={idx} style={{ fontSize: "13px", fontWeight: 700, marginTop: "14px", marginBottom: "6px", color: "var(--accent-green)" }}>
          {parseInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith("## ")) {
      flushList(idx);
      elements.push(
        <h3 key={idx} style={{ fontSize: "15px", fontWeight: 700, marginTop: "16px", marginBottom: "8px", color: "var(--accent-green)" }}>
          {parseInline(trimmed.slice(3))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith("# ")) {
      flushList(idx);
      elements.push(
        <h2 key={idx} style={{ fontSize: "17px", fontWeight: 700, marginTop: "18px", marginBottom: "10px", color: "var(--accent-green)" }}>
          {parseInline(trimmed.slice(2))}
        </h2>
      );
      return;
    }

    // Check for bullet list items
    const bulletMatch = trimmed.match(/^([-*•])\s+(.*)$/);
    if (bulletMatch) {
      if (isNumberedList) {
        flushList(idx);
      }
      isNumberedList = false;
      currentList.push(
        <li key={idx} style={{ lineHeight: "1.5", margin: "4px 0", wordBreak: "break-word", overflowWrap: "break-word" }}>
          {parseInline(bulletMatch[2])}
        </li>
      );
      return;
    }

    // Check for numbered list items
    const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberMatch) {
      if (!isNumberedList) {
        flushList(idx);
      }
      isNumberedList = true;
      currentList.push(
        <li key={idx} style={{ lineHeight: "1.5", margin: "4px 0", wordBreak: "break-word", overflowWrap: "break-word" }}>
          {parseInline(numberMatch[2])}
        </li>
      );
      return;
    }

    // Paragraph or empty line
    if (trimmed === "") {
      flushList(idx);
    } else {
      flushList(idx);
      elements.push(
        <p key={idx} style={{ margin: "4px 0", lineHeight: "1.5", fontSize: "13px" }}>
          {parseInline(line)}
        </p>
      );
    }
  });

  flushList(lines.length);

  // If text ended but code block wasn't closed, flush it
  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <pre 
        key={`code-end`} 
        style={{ 
          fontFamily: "var(--font-mono)", 
          fontSize: "12px", 
          backgroundColor: "rgba(0, 0, 0, 0.5)", 
          border: "1px solid var(--border-color)",
          padding: "12px", 
          borderRadius: "6px",
          margin: "10px 0",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          color: "#e2e8f0",
          maxWidth: "100%",
          width: "100%",
          overflowX: "auto",
          boxSizing: "border-box"
        }}
      >
        <code style={{ fontFamily: "inherit", color: "inherit" }}>
          {codeBlockLines.join("\n")}
        </code>
      </pre>
    );
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%", minWidth: 0 }}>{elements}</div>;
};

export default function AuditReportDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Chatbot states
  interface ChatMessage {
    sender: "user" | "ai";
    text: string;
    timestamp: string;
  }
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showConsoleModal, setShowConsoleModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      const timer = setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isChatOpen]);

  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    const userText = chatInput.trim();
    setChatInput("");
    
    const userMsg: ChatMessage = {
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsSendingChat(true);

    try {
      const historyPayload = chatMessages.map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        text: msg.text
      }));

      const res = await fetch(`${API_BASE_URL}/api/audits/${id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userText,
          history: historyPayload
        })
      });

      if (res.ok) {
        const chatData = await res.json();
        const aiMsg: ChatMessage = {
          sender: "ai",
          text: chatData.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error("Chat failed");
      }
    } catch (err) {
      const errMsg: ChatMessage = {
        sender: "ai",
        text: "I encountered a connection error reaching the AI Auditor backend. Please verify your server status.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setIsSendingChat(false);
    }
  };

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/audits/${id}`);
        if (!res.ok) {
          throw new Error("Audit report not found on server.");
        }
        const data = await res.json();
        setReport(data);

        // Fetch comparison if consecutive audit exists
        if (data.previousAuditId) {
          try {
            const compRes = await fetch(`${API_BASE_URL}/api/compare/${data.previousAuditId}/${data.id}`);
            if (compRes.ok) {
              const compData = await compRes.json();
              setComparison(compData);
            }
          } catch (compErr) {
            console.error("Failed to load consecutive comparison:", compErr);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch report.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

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
    if (code === 0) return "var(--accent-red)";
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
    <div 
      className="audit-dashboard-container"
      style={{ 
        width: isChatOpen ? "calc(100% - 420px)" : "100%", 
        paddingBottom: "48px",
        transition: "width 0.3s ease-in-out",
        boxSizing: "border-box"
      }}
    >
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
      </div>

      <div className="dashboard-grid" style={{ paddingTop: "0" }}>
        
        {/* Card 1: Total Score */}
        <div className="dashboard-card span-5" style={{ minHeight: "320px", justifyContent: "space-between" }}>
          <span className="dashboard-card-title">Total Score</span>
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
                    src={`${API_BASE_URL}/screenshots/${report.screenshotPath}`}
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

        {/* Card: Redirection Path Analysis */}
        {report.redirectChain && report.redirectChain.length > 0 && (
          <div className="dashboard-card span-12">
            <span className="dashboard-card-title">Redirection Path Analysis</span>
            <div style={{ marginTop: "12px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", padding: "16px", backgroundColor: "rgba(6, 11, 19, 0.4)", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                {report.redirectChain.map((step, idx) => {
                  const isEnd = idx === report.redirectChain!.length - 1;
                  const code = step.statusCode;
                  let color = "var(--text-secondary)";
                  let bg = "rgba(255,255,255,0.05)";
                  
                  if (code >= 300 && code < 400) {
                    color = "var(--accent-orange)";
                    bg = "var(--accent-orange-bg)";
                  } else if (code === 200) {
                    color = "var(--accent-green)";
                    bg = "var(--accent-green-bg)";
                  } else if (code >= 400 || code === 0) {
                    color = "var(--accent-red)";
                    bg = "var(--accent-red-bg)";
                  }
                  
                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", color, backgroundColor: bg }}>
                          {code > 0 ? code : "ERR"}
                        </span>
                        <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)", fontWeight: 500 }}>
                          {step.url}
                        </span>
                      </div>
                      {!isEnd && (
                        <span style={{ color: "var(--text-muted)", fontSize: "16px", fontWeight: "bold" }}>➔</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p style={{ marginTop: "10px", fontSize: "12px", color: "var(--text-secondary)" }}>
                {report.redirectChain!.length > 1 ? (
                  <span>Traced redirect hops: <strong>{report.redirectChain!.length - 1} redirects</strong> detected leading to destination.</span>
                ) : (
                  <span>Direct load connection. No redirects mapped.</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Card: Consecutive Audit Comparison */}
        {comparison && (
          <div className="dashboard-card span-12" style={{ padding: "28px" }}>
            <span className="dashboard-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>📊 Consecutive Crawl Comparison</span>
              <span className="status-tag info" style={{ fontSize: "10px", fontFamily: "var(--font-mono)" }}>
                Auto-compared with previous run: {comparison.auditA.id}
              </span>
            </span>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
              A consecutive scan was detected for the same website root domain. Below are the comparative deltas between the previous audit (Audit A) and this current audit (Audit B).
            </p>

            <div className="dashboard-grid" style={{ padding: 0, gap: "20px", width: "100%", marginBottom: "20px" }}>
              {/* Score deltas */}
              <div className="dashboard-card span-4" style={{ minHeight: "180px", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.01)" }}>
                <span className="dashboard-card-title" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Overall Score Delta</span>
                <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", width: "100%", margin: "10px 0" }}>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "28px", fontWeight: 700, color: getScoreColor(comparison.auditA.scores!.overall) }}>
                      {comparison.auditA.scores!.overall.toFixed(1)}
                    </span>
                    <span style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>Previous</span>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", alignContent: "center", alignItems: "center" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "16px" }}>➔</span>
                    <span style={{
                      color: comparison.scoreDelta.overall > 0 ? "var(--accent-green)" : comparison.scoreDelta.overall < 0 ? "var(--accent-red)" : "var(--text-secondary)",
                      backgroundColor: comparison.scoreDelta.overall > 0 ? "var(--accent-green-bg)" : comparison.scoreDelta.overall < 0 ? "var(--accent-red-bg)" : "rgba(255,255,255,0.05)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      marginTop: "4px"
                    }}>
                      {comparison.scoreDelta.overall >= 0 ? "+" : ""}{comparison.scoreDelta.overall.toFixed(1)}
                    </span>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "28px", fontWeight: 700, color: getScoreColor(comparison.auditB.scores!.overall) }}>
                      {comparison.auditB.scores!.overall.toFixed(1)}
                    </span>
                    <span style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>Current</span>
                  </div>
                </div>
              </div>

              {/* Metric progression table */}
              <div className="dashboard-card span-8" style={{ minHeight: "180px", backgroundColor: "rgba(255,255,255,0.01)" }}>
                <span className="dashboard-card-title" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Vector Progressions</span>
                <div className="metrics-table-wrapper" style={{ margin: 0, width: "100%" }}>
                  <table className="metrics-table" style={{ fontSize: "12px" }}>
                    <thead>
                      <tr>
                        <th>Category Vector</th>
                        <th>Previous</th>
                        <th>Current</th>
                        <th>Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="metric-name" style={{ padding: "8px" }}>SEO Visibility</td>
                        <td style={{ color: getScoreColor(comparison.auditA.scores!.seo) }}>{comparison.auditA.scores!.seo.toFixed(1)}</td>
                        <td style={{ color: getScoreColor(comparison.auditB.scores!.seo) }}>{comparison.auditB.scores!.seo.toFixed(1)}</td>
                        <td>
                          <span style={{ color: comparison.scoreDelta.seo > 0 ? "var(--accent-green)" : comparison.scoreDelta.seo < 0 ? "var(--accent-red)" : "var(--text-secondary)", fontWeight: 600 }}>
                            {comparison.scoreDelta.seo >= 0 ? "+" : ""}{comparison.scoreDelta.seo.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="metric-name" style={{ padding: "8px" }}>Performance &amp; Speed</td>
                        <td style={{ color: getScoreColor(comparison.auditA.scores!.performance) }}>{comparison.auditA.scores!.performance.toFixed(1)}</td>
                        <td style={{ color: getScoreColor(comparison.auditB.scores!.performance) }}>{comparison.auditB.scores!.performance.toFixed(1)}</td>
                        <td>
                          <span style={{ color: comparison.scoreDelta.performance > 0 ? "var(--accent-green)" : comparison.scoreDelta.performance < 0 ? "var(--accent-red)" : "var(--text-secondary)", fontWeight: 600 }}>
                            {comparison.scoreDelta.performance >= 0 ? "+" : ""}{comparison.scoreDelta.performance.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="metric-name" style={{ padding: "8px" }}>Accessibility Vector</td>
                        <td style={{ color: getScoreColor(comparison.auditA.scores!.technical) }}>{comparison.auditA.scores!.technical.toFixed(1)}</td>
                        <td style={{ color: getScoreColor(comparison.auditB.scores!.technical) }}>{comparison.auditB.scores!.technical.toFixed(1)}</td>
                        <td>
                          <span style={{ color: comparison.scoreDelta.technical > 0 ? "var(--accent-green)" : comparison.scoreDelta.technical < 0 ? "var(--accent-red)" : "var(--text-secondary)", fontWeight: 600 }}>
                            {comparison.scoreDelta.technical >= 0 ? "+" : ""}{comparison.scoreDelta.technical.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Telemetry comparatives table */}
            <div className="metrics-table-wrapper" style={{ margin: "20px 0" }}>
              <table className="metrics-table">
                <thead>
                  <tr>
                    <th>Telemetry Parameter</th>
                    <th>Previous Value</th>
                    <th>Current Value</th>
                    <th>Drift</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="metric-name">First Page Load Speed</td>
                    <td className="metric-value">{comparison.auditA.metrics?.loadTimeMs.toFixed(0) || "—"} ms</td>
                    <td className="metric-value">{comparison.auditB.metrics?.loadTimeMs.toFixed(0) || "—"} ms</td>
                    <td>
                      <span style={{
                        color: comparison.metricDelta.loadTimeMs < 0 ? "var(--accent-green)" : comparison.metricDelta.loadTimeMs > 0 ? "var(--accent-red)" : "var(--text-secondary)",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600
                      }}>
                        {comparison.metricDelta.loadTimeMs < 0 ? "" : "+"}{comparison.metricDelta.loadTimeMs.toFixed(0)} ms
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="metric-name">SSL Encryption Status</td>
                    <td className="metric-value">
                      <span className={`status-tag ${comparison.auditA.metrics?.sslActive ? "secure" : "critical"}`}>
                        {comparison.auditA.metrics?.sslActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="metric-value">
                      <span className={`status-tag ${comparison.auditB.metrics?.sslActive ? "secure" : "critical"}`}>
                        {comparison.auditB.metrics?.sslActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {comparison.auditA.metrics?.sslActive === comparison.auditB.metrics?.sslActive ? (
                        <span style={{ color: "var(--text-muted)" }}>Unchanged</span>
                      ) : (
                        <span style={{ color: comparison.auditB.metrics?.sslActive ? "var(--accent-green)" : "var(--accent-red)", fontWeight: 600 }}>
                          {comparison.auditB.metrics?.sslActive ? "Activated" : "Deactivated"}
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="metric-name">Total Images Extracted</td>
                    <td className="metric-value">{comparison.auditA.metrics?.totalImages ?? 0}</td>
                    <td className="metric-value">{comparison.auditB.metrics?.totalImages ?? 0}</td>
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)" }}>
                        {comparison.metricDelta.totalImages > 0 ? "+" : ""}{comparison.metricDelta.totalImages}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="metric-name">Images Missing Alt Attribute</td>
                    <td className="metric-value">{comparison.auditA.metrics?.imagesMissingAlt ?? 0}</td>
                    <td className="metric-value">{comparison.auditB.metrics?.imagesMissingAlt ?? 0}</td>
                    <td>
                      <span style={{
                        color: comparison.metricDelta.imagesMissingAlt < 0 ? "var(--accent-green)" : comparison.metricDelta.imagesMissingAlt > 0 ? "var(--accent-red)" : "var(--text-secondary)",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600
                      }}>
                        {comparison.metricDelta.imagesMissingAlt > 0 ? "+" : ""}{comparison.metricDelta.imagesMissingAlt}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="metric-name">Broken Hyperlinks</td>
                    <td className="metric-value">{comparison.auditA.metrics?.brokenLinksCount ?? 0}</td>
                    <td className="metric-value">{comparison.auditB.metrics?.brokenLinksCount ?? 0}</td>
                    <td>
                      <span style={{
                        color: comparison.metricDelta.brokenLinksCount < 0 ? "var(--accent-green)" : comparison.metricDelta.brokenLinksCount > 0 ? "var(--accent-red)" : "var(--text-secondary)",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600
                      }}>
                        {comparison.metricDelta.brokenLinksCount > 0 ? "+" : ""}{comparison.metricDelta.brokenLinksCount}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Checklist of structural changes */}
            <div style={{ marginTop: "24px" }}>
              <span className="dashboard-card-title" style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "12px", display: "block" }}>
                Comparative Structural Progress
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {comparison.changes.map((item, idx) => {
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
                    <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          backgroundColor: item.status === "improved" ? "var(--accent-green-bg)" : item.status === "degraded" ? "var(--accent-red-bg)" : "rgba(255,255,255,0.04)",
                          color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          fontSize: "11px"
                        }}>
                          {statusIcon}
                        </span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{item.item}</span>
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{item.description}</span>
                        </div>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", fontWeight: 700, color }}>
                        {statusText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

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
                <tr 
                  onClick={() => {
                    if (metrics && metrics.consoleErrorsSimulated.length > 0) {
                      setShowConsoleModal(true);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (metrics && metrics.consoleErrorsSimulated.length > 0) {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  style={{ 
                    cursor: metrics && metrics.consoleErrorsSimulated.length > 0 ? "pointer" : "default",
                    transition: "background-color 0.2s ease"
                  }}
                >
                  <td className="metric-name">
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Console Errors
                      {metrics && metrics.consoleErrorsSimulated.length > 0 && (
                        <span style={{ fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic", fontWeight: 400 }}>
                          (click to view logs)
                        </span>
                      )}
                    </span>
                  </td>
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
                <tr 
                  onClick={() => {
                    if (hasBrokenLinks) {
                      const element = document.getElementById("broken-links-card");
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (hasBrokenLinks) {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  style={{ 
                    cursor: hasBrokenLinks ? "pointer" : "default",
                    transition: "background-color 0.2s ease"
                  }}
                >
                  <td className="metric-name">
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Broken Links Detected
                      {hasBrokenLinks && (
                        <span style={{ fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic", fontWeight: 400 }}>
                          (click to view details)
                        </span>
                      )}
                    </span>
                  </td>
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
          <div id="broken-links-card" className="dashboard-card span-12">
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
                          {link.statusCode === 0 
                            ? (link.errorDescription.toLowerCase().includes("timeout") || link.errorDescription.toLowerCase().includes("timed out")
                              ? "TIMEOUT"
                              : (link.errorDescription.toLowerCase().includes("ssl") || link.errorDescription.toLowerCase().includes("certificate")
                                ? "SSL"
                                : (link.errorDescription.toLowerCase().includes("dns") || link.errorDescription.toLowerCase().includes("getaddrinfo")
                                  ? "DNS"
                                  : "CONN")))
                            : link.statusCode}
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

        {/* Floating Chat Button */}
        {report && !isChatOpen && (
          <button
            className="floating-chat-button"
            onClick={() => {
              setIsChatOpen(true);
              if (chatMessages.length === 0) {
                setChatMessages([
                  {
                    sender: "ai",
                    text: `Hello! I am your AI Web Auditor. Ask me anything about the audit results for **${new URL(report.url).hostname}**. For example: \n\n- *How do I optimize slow load times?*\n- *Why are missing image alt tags a problem?*\n- *Explain viewport meta declaration warnings.*`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ]);
              }
            }}
            style={{
              position: "fixed",
              bottom: "32px",
              right: "32px",
              zIndex: 100,
              backgroundColor: "var(--accent-green)",
              color: "var(--bg-primary)",
              border: "none",
              borderRadius: "50px",
              padding: "14px 24px",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "var(--font-title)",
              boxShadow: "0px 8px 24px rgba(255, 184, 0, 0.3)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              transition: "all 0.3s ease",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Ask AI Auditor
          </button>
        )}

        {/* Side Chat Drawer */}
        {report && (
          <div
            className="chat-drawer"
            style={{
              position: "fixed",
              top: "var(--navbar-height)",
              right: 0,
              bottom: 0,
              width: "420px",
              maxWidth: "100%",
              backgroundColor: "rgba(10, 16, 26, 0.95)",
              borderLeft: "1px solid var(--border-color)",
              boxShadow: "-10px 0px 40px rgba(0,0,0,0.6)",
              backdropFilter: "blur(20px)",
              zIndex: 90,
              display: "flex",
              flexDirection: "column",
              transform: isChatOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.3s ease-in-out",
              visibility: isChatOpen ? "visible" : "hidden",
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(6, 11, 19, 0.6)",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontFamily: "var(--font-title)", fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                  AI Auditor Chatbot
                </h3>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  RAG Knowledge Core v1.0
                </span>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Messages Stream */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    width: "85%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      backgroundColor: msg.sender === "user" ? "var(--accent-green)" : "rgba(20, 33, 61, 0.4)",
                      color: msg.sender === "user" ? "var(--bg-primary)" : "var(--text-primary)",
                      border: msg.sender === "user" ? "none" : "1px solid var(--border-color)",
                      padding: "12px 16px",
                      borderRadius: msg.sender === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      fontSize: "13px",
                      lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                      width: "100%",
                      minWidth: 0,
                      wordBreak: "break-word",
                      overflowWrap: "anywhere"
                    }}
                  >
                    {renderMarkdown(msg.text)}
                  </div>
                  <span style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {isSendingChat && (
                <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", backgroundColor: "rgba(20, 33, 61, 0.2)", border: "1px solid var(--border-color)", borderRadius: "12px 12px 12px 2px" }}>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <span style={{ width: "6px", height: "6px", backgroundColor: "var(--accent-green)", borderRadius: "50%" }} />
                    <span style={{ width: "6px", height: "6px", backgroundColor: "var(--accent-green)", borderRadius: "50%" }} />
                    <span style={{ width: "6px", height: "6px", backgroundColor: "var(--accent-green)", borderRadius: "50%" }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form Footer */}
            <form
              onSubmit={handleSendChatMessage}
              style={{
                padding: "20px 24px",
                borderTop: "1px solid var(--border-color)",
                background: "rgba(6, 11, 19, 0.6)",
                display: "flex",
                gap: "10px",
              }}
            >
              <input
                ref={chatInputRef}
                type="text"
                className="chat-input"
                style={{ flex: 1 }}
                placeholder="Ask a question about this audit..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isSendingChat}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isSendingChat}
                style={{
                  backgroundColor: chatInput.trim() && !isSendingChat ? "var(--accent-green)" : "rgba(255,255,255,0.05)",
                  color: chatInput.trim() && !isSendingChat ? "var(--bg-primary)" : "var(--text-muted)",
                  border: "none",
                  borderRadius: "4px",
                  width: "38px",
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: chatInput.trim() && !isSendingChat ? "pointer" : "default",
                  boxShadow: chatInput.trim() && !isSendingChat ? "var(--glow-shadow)" : "none",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </div>
        )}

      {/* Console Errors Modal overlay */}
      {showConsoleModal && metrics && (
        <div 
          className="console-modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(8, 20, 37, 0.4)",
            backdropFilter: "blur(16px)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowConsoleModal(false)}
        >
          <div 
            style={{
              backgroundColor: "rgba(15, 28, 46, 0.6)",
              border: "1px solid rgba(255, 184, 0, 0.2)",
              borderRadius: "12px",
              width: "650px",
              maxWidth: "100%",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "85vh",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(6, 11, 19, 0.4)",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontFamily: "var(--font-title)", fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  Console Diagnostic Logs
                </h3>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "4px", display: "block" }}>
                  Simulated logs and runtime console traces
                </span>
              </div>
              <button
                onClick={() => setShowConsoleModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                  transition: "color 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-red)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Body (Logs) */}
            <div 
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                backgroundColor: "rgba(5, 9, 16, 0.4)",
              }}
            >
              {metrics.consoleErrorsSimulated.map((log, idx) => {
                const isError = log.startsWith("[Error]");
                const isWarning = log.startsWith("[Warning]");
                let iconColor = "var(--text-muted)";
                let bgColor = "rgba(255, 255, 255, 0.02)";
                let borderColor = "var(--border-color)";
                let tagText = "INFO";
                let tagBg = "rgba(255, 255, 255, 0.1)";

                if (isError) {
                  iconColor = "var(--accent-red)";
                  bgColor = "rgba(239, 68, 68, 0.05)";
                  borderColor = "rgba(239, 68, 68, 0.2)";
                  tagText = "ERROR";
                  tagBg = "rgba(239, 68, 68, 0.15)";
                } else if (isWarning) {
                  iconColor = "var(--accent-orange)";
                  bgColor = "rgba(245, 158, 11, 0.05)";
                  borderColor = "rgba(245, 158, 11, 0.2)";
                  tagText = "WARNING";
                  tagBg = "rgba(245, 158, 11, 0.15)";
                }

                const cleanContent = log
                  .replace(/^\[(Error|Warning)\]\s+/, "")
                  .replace(/^\[(SEO|Performance|Accessibility|Responsive|Network)\]\s+/, "");

                const categoryMatch = log.match(/^\[(?:Error|Warning)\]\s+\[([a-zA-Z]+)\]/);
                const category = categoryMatch ? categoryMatch[1].toUpperCase() : "GENERAL";

                return (
                  <div 
                    key={idx}
                    style={{
                      backgroundColor: bgColor,
                      border: `1px solid ${borderColor}`,
                      borderRadius: "8px",
                      padding: "12px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      lineHeight: "1.4",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span 
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: tagBg,
                            color: iconColor,
                            letterSpacing: "0.5px"
                          }}
                        >
                          {tagText}
                        </span>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 600 }}>
                          {category}
                        </span>
                      </div>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                        Trace #{idx + 1}
                      </span>
                    </div>
                    <div style={{ color: "var(--text-primary)", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
                      {cleanContent}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div 
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                background: "rgba(6, 11, 19, 0.4)",
              }}
            >
              <button
                onClick={() => {
                  const plainTextLogs = metrics.consoleErrorsSimulated.join("\n");
                  navigator.clipboard.writeText(plainTextLogs);
                  alert("Diagnostic logs copied to clipboard!");
                }}
                className="btn-secondary"
                style={{ fontSize: "12px", padding: "8px 16px" }}
              >
                Copy Logs
              </button>
              <button
                onClick={() => setShowConsoleModal(false)}
                className="btn-secondary"
                style={{ 
                  fontSize: "12px", 
                  padding: "8px 16px",
                  backgroundColor: "var(--accent-green)",
                  color: "var(--bg-primary)",
                  border: "none",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
