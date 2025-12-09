"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { globalSearch } from "@repo/api-client";
import { search as searchI18n } from "@repo/i18n";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: "8px 12px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          backgroundColor: "white",
          cursor: "pointer",
          fontSize: "14px",
          color: "#666",
        }}
        title={searchI18n.hint}
      >
        🔍 Ara
      </button>
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
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "100px",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          width: "90%",
          maxWidth: "600px",
          maxHeight: "70vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Search Input */}
        <div style={{ padding: "16px", borderBottom: "1px solid #eee" }}>
          <input
            ref={inputRef}
            type="text"
            placeholder={searchI18n.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px",
              outline: "none",
            }}
          />
          <div
            style={{
              marginTop: "8px",
              fontSize: "12px",
              color: "#666",
            }}
          >
            {searchI18n.hint}
          </div>
        </div>

        {/* Results */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
          }}
        >
          {isLoading && debouncedQuery.length >= 2 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
              {searchI18n.loading}
            </div>
          ) : debouncedQuery.length < 2 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
              {searchI18n.placeholder}
            </div>
          ) : !hasResults ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
              {searchI18n.emptyState}
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
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderRadius: "4px",
                        marginBottom: "4px",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{client.name}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
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
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderRadius: "4px",
                        marginBottom: "4px",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>
                        {invoice.externalId || invoice.id}
                      </div>
                      {invoice.counterpartyName && (
                        <div style={{ fontSize: "12px", color: "#666" }}>
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
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderRadius: "4px",
                        marginBottom: "4px",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{doc.originalFileName}</div>
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
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderRadius: "4px",
                        marginBottom: "4px",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{alert.title}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
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
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderRadius: "4px",
                        marginBottom: "4px",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{report.reportCode}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
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
    </div>
  );
}

