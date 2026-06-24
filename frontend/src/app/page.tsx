"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LandingPage() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    // Direct user to the progress view with the target url
    router.push(`/audit/progress?url=${encodeURIComponent(url.trim())}`);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1 }}>
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
          <form className="search-form" onSubmit={handleSubmit}>
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
              placeholder="Enter website URL to audit (e.g., https://example.com)"
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
      </div>

      <footer className="footer">
        <div>WebScout</div>
      </footer>
    </div>
  );
}
