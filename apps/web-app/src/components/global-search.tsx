"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { globalSearch } from "@repo/api-client";
import { search as searchI18n } from "@repo/i18n";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "./ui/Icon";
import { Tooltip } from "./ui/Tooltip";
import { colors } from "../styles/design-system";

export function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search results
  const { data, isLoading } = useQuery({
    queryKey: ["globalSearch", debouncedQuery],
    queryFn: () => globalSearch(debouncedQuery),
    enabled: debouncedQuery.length >= 2 && isOpen,
  });

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".global-search-modal")) {
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const results = data?.data || {
    clients: [],
    invoices: [],
    documents: [],
    riskAlerts: [],
    reports: [],
  };

  const hasResults =
    results.clients.length > 0 ||
    results.invoices.length > 0 ||
    results.documents.length > 0 ||
    results.riskAlerts.length > 0 ||
    results.reports.length > 0;

  const handleResultClick = (type: string, id: string) => {
    let path = "";
    switch (type) {
      case "clients":
        path = `/musteriler/${id}`;
        break;
      case "invoices":
        path = `/faturalar/${id}`;
        break;
      case "documents":
        path = `/belgeler/${id}`;
        break;
      case "riskAlerts":
        path = `/risk/alerts`;
        break;
      case "reports":
        path = `/raporlar`;
        break;
    }
    if (path) {
      router.push(path);
      setIsOpen(false);
      setQuery("");
    }
  };

  if (!isOpen) {
    return (
      <Tooltip content={searchI18n.hint}>
        <button
          onClick={() => setIsOpen(true)}
          style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 16px",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          backgroundColor: "white",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
          color: "#475569",
          transition: "all 0.2s ease",
          boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.08)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#2563eb";
          e.currentTarget.style.backgroundColor = "#eff6ff";
          e.currentTarget.style.color = "#1e40af";
          e.currentTarget.style.boxShadow = "0 4px 12px -2px rgba(37, 99, 235, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#e2e8f0";
          e.currentTarget.style.backgroundColor = "white";
          e.currentTarget.style.color = "#475569";
          e.currentTarget.style.boxShadow = "0 2px 4px 0 rgba(0, 0, 0, 0.08)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
        title={searchI18n.hint}
      >
        <Icon name="search" size={16} color="currentColor" />
        <span>Ara</span>
        <span
          style={{
            marginLeft: "4px",
            padding: "2px 6px",
            backgroundColor: "#f1f5f9",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 600,
            color: "#64748b",
            fontFamily: "monospace",
          }}
        >
          ⌘K
        </span>
      </button>
      </Tooltip>
    );
  }

  return (
    <div
      className="global-search-modal"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "100px",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          width: "90%",
          maxWidth: "640px",
          maxHeight: "70vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "slideDown 0.2s ease",
        }}
      >
        {/* Search Input */}
        <div style={{ padding: "20px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
          <div style={{ position: "relative" }}>
            <input
              ref={inputRef}
              type="text"
              placeholder={searchI18n.placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px 14px 44px",
                border: "2px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "16px",
                outline: "none",
                transition: "all 0.2s ease",
                backgroundColor: "white",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#2563eb";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <Icon
              name="search"
              size={18}
              color="#94a3b8"
              style={{
                position: "absolute",
                left: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
          </div>
          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>{searchI18n.hint}</span>
            <span style={{ color: "#cbd5e1" }}>•</span>
            <span>ESC ile kapat</span>
          </div>
        </div>

        {/* Results */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px",
            backgroundColor: "white",
          }}
        >
          {isLoading && debouncedQuery.length >= 2 ? (
            <div style={{ textAlign: "center", padding: "60px 40px", color: "#64748b" }}>
              <Icon name="search" size={48} color="#64748b" style={{ marginBottom: "16px", display: "block", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
              <div style={{ fontSize: "14px", fontWeight: 500 }}>{searchI18n.loading}</div>
            </div>
          ) : debouncedQuery.length < 2 ? (
            <div style={{ textAlign: "center", padding: "60px 40px", color: "#64748b" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
              <div style={{ fontSize: "14px", fontWeight: 500 }}>{searchI18n.placeholder}</div>
            </div>
          ) : !hasResults ? (
            <div style={{ textAlign: "center", padding: "60px 40px", color: "#64748b" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔎</div>
              <div style={{ fontSize: "14px", fontWeight: 500 }}>{searchI18n.emptyState}</div>
            </div>
          ) : (
            <>
              {/* Clients */}
              {results.clients.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "#333",
                    }}
                  >
                    {searchI18n.groups.clients}
                  </h3>
                  {results.clients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => handleResultClick("clients", client.id)}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        borderRadius: "8px",
                        marginBottom: "4px",
                        transition: "all 0.2s ease",
                        border: "1px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f1f5f9";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>{client.name}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {client.taxNumber}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Invoices */}
              {results.invoices.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "#333",
                    }}
                  >
                    {searchI18n.groups.invoices}
                  </h3>
                  {results.invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      onClick={() => handleResultClick("invoices", invoice.id)}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        borderRadius: "8px",
                        marginBottom: "4px",
                        transition: "all 0.2s ease",
                        border: "1px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f1f5f9";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                        {invoice.externalId || invoice.id}
                      </div>
                      {invoice.counterpartyName && (
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          {invoice.counterpartyName}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Documents */}
              {results.documents.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "#333",
                    }}
                  >
                    {searchI18n.groups.documents}
                  </h3>
                  {results.documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => handleResultClick("documents", doc.id)}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        borderRadius: "8px",
                        marginBottom: "4px",
                        transition: "all 0.2s ease",
                        border: "1px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f1f5f9";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{doc.originalFileName}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Risk Alerts */}
              {results.riskAlerts.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "#333",
                    }}
                  >
                    {searchI18n.groups.riskAlerts}
                  </h3>
                  {results.riskAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => handleResultClick("riskAlerts", alert.id)}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        borderRadius: "8px",
                        marginBottom: "4px",
                        transition: "all 0.2s ease",
                        border: "1px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f1f5f9";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>{alert.title}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Şiddet: {alert.severity}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reports */}
              {results.reports.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "#333",
                    }}
                  >
                    {searchI18n.groups.reports}
                  </h3>
                  {results.reports.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => handleResultClick("reports", report.id)}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        borderRadius: "8px",
                        marginBottom: "4px",
                        transition: "all 0.2s ease",
                        border: "1px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f1f5f9";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>{report.reportCode}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {new Date(report.startedAt).toLocaleDateString("tr-TR")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

