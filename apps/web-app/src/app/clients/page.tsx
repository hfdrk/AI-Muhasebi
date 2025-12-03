"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listClientCompanies } from "@repo/api-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["clientCompanies", search, isActiveFilter, page],
    queryFn: () =>
      listClientCompanies({
        search: search || undefined,
        isActive: isActiveFilter,
        page,
        pageSize,
      }),
  });

  const clients = data?.data.data || [];
  const pagination = data?.data || { total: 0, page: 1, pageSize: 20, totalPages: 1 };

  return (
    <div style={{ padding: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>Müşteri Şirketler</h1>
        <Link
          href="/clients/new"
          style={{
            padding: "8px 16px",
            backgroundColor: "#0066cc",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          Yeni Şirket Ekle
        </Link>
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <input
          type="text"
          placeholder="Şirket adı veya vergi numarası ile ara…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "16px",
          }}
        />
        <select
          value={isActiveFilter === undefined ? "all" : isActiveFilter ? "active" : "inactive"}
          onChange={(e) => {
            const value = e.target.value;
            setIsActiveFilter(value === "all" ? undefined : value === "active");
            setPage(1);
          }}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "16px",
          }}
        >
          <option value="all">Tümü</option>
          <option value="active">Aktif</option>
          <option value="inactive">Pasif</option>
        </select>
      </div>

      {isLoading ? (
        <p>Yükleniyor...</p>
      ) : clients.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>Henüz müşteri şirketi bulunmamaktadır.</p>
          <Link
            href="/clients/new"
            style={{
              display: "inline-block",
              marginTop: "16px",
              padding: "8px 16px",
              backgroundColor: "#0066cc",
              color: "white",
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            İlk Müşteri Şirketini Ekle
          </Link>
        </div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Şirket Adı</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Vergi Numarası</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Sektör</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Durum</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Oluşturulma Tarihi</th>
                <th style={{ padding: "12px", textAlign: "left" }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px" }}>
                    <Link
                      href={`/clients/${client.id}`}
                      style={{ color: "#0066cc", textDecoration: "none" }}
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td style={{ padding: "12px" }}>{client.taxNumber}</td>
                  <td style={{ padding: "12px" }}>{client.sector || "-"}</td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor: client.isActive ? "#d4edda" : "#f8d7da",
                        color: client.isActive ? "#155724" : "#721c24",
                        fontSize: "12px",
                      }}
                    >
                      {client.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    {new Date(client.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <Link
                      href={`/clients/${client.id}/edit`}
                      style={{
                        padding: "4px 8px",
                        color: "#0066cc",
                        textDecoration: "none",
                        fontSize: "14px",
                      }}
                    >
                      Düzenle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "24px" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                Önceki
              </button>
              <span style={{ padding: "8px 16px", display: "flex", alignItems: "center" }}>
                Sayfa {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: page === pagination.totalPages ? "not-allowed" : "pointer",
                  opacity: page === pagination.totalPages ? 0.5 : 1,
                }}
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

