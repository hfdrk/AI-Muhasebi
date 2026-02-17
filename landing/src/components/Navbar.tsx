"use client";

import { useState, useEffect } from "react";
import { BarChart3, Menu, X } from "lucide-react";
import { COLORS, NAV_LINKS, LOGIN_URL, REGISTER_URL } from "@/lib/constants";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: "72px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s ease",
          background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(8px)" : "none",
          boxShadow: scrolled ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1280px",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <a
            href="#"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontWeight: 700,
              fontSize: "20px",
              color: COLORS.primary,
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BarChart3 size={20} color="#fff" />
            </div>
            AI Muhasebi
          </a>

          {/* Desktop Nav */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "32px",
            }}
            className="desktop-nav"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  fontSize: "15px",
                  fontWeight: 500,
                  color: COLORS.text.secondary,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = COLORS.primary)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = COLORS.text.secondary)
                }
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop Buttons */}
          <div
            style={{ display: "flex", gap: "12px", alignItems: "center" }}
            className="desktop-nav"
          >
            <a
              href={LOGIN_URL}
              style={{
                padding: "8px 20px",
                fontSize: "14px",
                fontWeight: 600,
                color: COLORS.primary,
                borderRadius: "10px",
                border: `1.5px solid ${COLORS.border}`,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = COLORS.primary;
                e.currentTarget.style.background = COLORS.backgroundAlt;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = COLORS.border;
                e.currentTarget.style.background = "transparent";
              }}
            >
              Giriş Yap
            </a>
            <a
              href={REGISTER_URL}
              style={{
                padding: "8px 20px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#fff",
                borderRadius: "10px",
                background: COLORS.accent,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = COLORS.accentDark)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = COLORS.accent)
              }
            >
              Ücretsiz Deneyin
            </a>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="mobile-only"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: "none",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              color: COLORS.text.primary,
            }}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: "rgba(255,255,255,0.98)",
            backdropFilter: "blur(10px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "32px",
          }}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                fontSize: "24px",
                fontWeight: 600,
                color: COLORS.text.primary,
              }}
            >
              {link.label}
            </a>
          ))}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              width: "240px",
            }}
          >
            <a
              href={LOGIN_URL}
              style={{
                padding: "14px",
                textAlign: "center",
                fontSize: "16px",
                fontWeight: 600,
                color: COLORS.primary,
                borderRadius: "12px",
                border: `2px solid ${COLORS.border}`,
              }}
            >
              Giriş Yap
            </a>
            <a
              href={REGISTER_URL}
              style={{
                padding: "14px",
                textAlign: "center",
                fontSize: "16px",
                fontWeight: 600,
                color: "#fff",
                borderRadius: "12px",
                background: COLORS.accent,
              }}
            >
              Ücretsiz Deneyin
            </a>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-only {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
