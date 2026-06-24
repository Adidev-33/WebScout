"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Audit Logs", path: "/logs" },
  ];

  return (
    <nav className="top-navbar">
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none" }} className="navbar-logo">
        <span className="navbar-logo-text">WebScout</span>
      </Link>

      {/* Nav Links */}
      <div className="navbar-links">
        {navLinks.map((link, idx) => {
          const isActive =
            link.path !== "/" &&
            link.path !== "#" &&
            pathname.startsWith(link.path);
          return (
            <Link
              key={idx}
              href={link.path}
              className={`navbar-link ${isActive ? "active" : ""}`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
