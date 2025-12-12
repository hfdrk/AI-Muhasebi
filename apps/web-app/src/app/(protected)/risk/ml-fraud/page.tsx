"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listClientCompanies } from "@repo/api-client";
import { getMLFraudScore, checkMLFraud } from "@repo/api-client";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../../styles/design-system";

const SEVERITY_COLORS: Record<string, string> = {
  low: colors.success,
  medium: colors.warning,
  high: colors.danger,
};

const SEVERITY_BG_COLORS: Record<string, string> = {
  low: colors.successPastel,
  medium: colors.warningPastel,
  high: colors.dangerPastel,
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
};

// Circular Progress Component
function CircularProgress({ score, size = 160 }: { score: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? colors.danger : score >= 50 ? colors.warning : colors.success;

  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.gray[200]}
          strokeWidth="12"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: `stroke-dashoffset ${transitions.slow} ease-out`,
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: typography.fontSize["4xl"],
            fontWeight: typography.fontWeight.bold,
            color: color,
            lineHeight: typography.lineHeight.tight,
          }}
        >
          {score}
        </div>
        <div
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
            marginTop: spacing.xs,
          }}
        >
          / 100
        </div>
      </div>
    </div>
  );
}

export default function MLFraudPage() {
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch client companies
  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: ["clientCompanies"],
    queryFn: () => listClientCompanies({ pageSize: 100, isActive: true }),
  });

  const companies = companiesData?.data.data || [];

  // Filter companies by search term
  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.taxNumber.includes(searchTerm)
  );

  // Fetch fraud score for selected company
  const { data: fraudScoreData, isLoading: fraudLoading } = useQuery({
    queryKey: ["ml-fraud-score", selectedCompanyId],
    queryFn: () => getMLFraudScore(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const fraudScore = fraudScoreData?.data;

  const checkMutation = useMutation({
    mutationFn: (companyId: string) => checkMLFraud(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-fraud-score", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["recent-risk-alerts"] });
      alert("ML dolandırıcılık kontrolü tamamlandı. Yüksek risk tespit edilirse uyarı oluşturulacaktır.");
    },
    onError: (error: Error) => {
      alert(`Hata: ${error.message}`);
    },
  });

  const handleCheckFraud = (companyId: string) => {
    if (confirm("Bu müşteri için ML dolandırıcılık kontrolü yapmak istediğinize emin misiniz?")) {
      checkMutation.mutate(companyId);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return colors.danger;
    if (score >= 50) return colors.warning;
    return colors.success;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return "Yüksek Risk";
    if (score >= 50) return "Orta Risk";
    return "Düşük Risk";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return colors.dangerPastel;
    if (score >= 50) return colors.warningPastel;
    return colors.successPastel;
  };

  return (
    <div
      style={{
        padding: spacing.xxl,
        maxWidth: "1600px",
        margin: "0 auto",
        backgroundColor: colors.gray[50],
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1
          style={{
            fontSize: typography.fontSize["3xl"],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          ML Dolandırıcılık Tespiti
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
          }}
        >
          Makine öğrenmesi tabanlı dolandırıcılık tespiti. Müşterilerinizin dolandırıcılık skorlarını görüntüleyin ve analiz edin.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "400px 1fr",
          gap: spacing.xl,
        }}
      >
        {/* Company List */}
        <Card variant="elevated" style={{ height: "fit-content", maxHeight: "800px", display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: spacing.md }}>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                placeholder="Müşteri ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: `${spacing.sm} ${spacing.md} ${spacing.sm} ${spacing.xl}`,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.sm,
                  fontFamily: typography.fontFamily.sans,
                  transition: `all ${transitions.normal} ease`,
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.primaryLighter}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: spacing.sm,
                  fontSize: typography.fontSize.base,
                  color: colors.text.muted,
                }}
              >
                🔍
              </span>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              borderRadius: borderRadius.md,
            }}
          >
            {companiesLoading ? (
              <div
                style={{
                  padding: spacing.xxl,
                  textAlign: "center",
                  color: colors.text.muted,
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    width: "24px",
                    height: "24px",
                    border: `3px solid ${colors.gray[200]}`,
                    borderTopColor: colors.primary,
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    marginBottom: spacing.sm,
                  }}
                />
                <p style={{ margin: 0, fontSize: typography.fontSize.sm }}>Yükleniyor...</p>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div
                style={{
                  padding: spacing.xxl,
                  textAlign: "center",
                  color: colors.text.muted,
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: spacing.sm }}>📋</div>
                <p style={{ margin: 0, fontSize: typography.fontSize.sm }}>Müşteri bulunamadı.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
                {filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => setSelectedCompanyId(company.id)}
                    style={{
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      cursor: "pointer",
                      backgroundColor:
                        selectedCompanyId === company.id ? colors.primaryLighter : "transparent",
                      border: `2px solid ${
                        selectedCompanyId === company.id ? colors.primary : "transparent"
                      }`,
                      transition: `all ${transitions.normal} ease`,
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCompanyId !== company.id) {
                        e.currentTarget.style.backgroundColor = colors.gray[50];
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCompanyId !== company.id) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <div
                      style={{
                        fontWeight: typography.fontWeight.semibold,
                        fontSize: typography.fontSize.base,
                        color: colors.text.primary,
                        marginBottom: spacing.xs,
                      }}
                    >
                      {company.name}
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.muted,
                        fontFamily: typography.fontFamily.mono,
                      }}
                    >
                      VKN: {company.taxNumber}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Fraud Score Details */}
        <div>
          {!selectedCompanyId ? (
            <Card variant="elevated">
              <div
                style={{
                  padding: spacing["3xl"],
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "64px", marginBottom: spacing.md }}>🔍</div>
                <h3
                  style={{
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.primary,
                    marginBottom: spacing.sm,
                  }}
                >
                  Müşteri Seçin
                </h3>
                <p
                  style={{
                    color: colors.text.secondary,
                    fontSize: typography.fontSize.sm,
                    margin: 0,
                  }}
                >
                  Fraud skoru görüntülemek için sol panelden bir müşteri seçin.
                </p>
              </div>
            </Card>
          ) : fraudLoading ? (
            <Card variant="elevated">
              <div
                style={{
                  padding: spacing["3xl"],
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    width: "48px",
                    height: "48px",
                    border: `4px solid ${colors.gray[200]}`,
                    borderTopColor: colors.primary,
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    marginBottom: spacing.md,
                  }}
                />
                <p
                  style={{
                    color: colors.text.muted,
                    fontSize: typography.fontSize.sm,
                    margin: 0,
                  }}
                >
                  Fraud skoru hesaplanıyor...
                </p>
              </div>
            </Card>
          ) : fraudScore ? (
            <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
              {/* Score Card */}
              <Card
                variant="elevated"
                style={{
                  background: `linear-gradient(135deg, ${getScoreBgColor(fraudScore.overallScore)} 0%, ${colors.white} 100%)`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: spacing.xl,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: typography.fontSize["2xl"],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.text.primary,
                        marginBottom: spacing.xs,
                      }}
                    >
                      Dolandırıcılık Skoru
                    </h2>
                    <p
                      style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                        margin: 0,
                      }}
                    >
                      ML algoritması tarafından hesaplanan risk skoru
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleCheckFraud(selectedCompanyId)}
                    loading={checkMutation.isPending}
                  >
                    🔄 Yeniden Kontrol Et
                  </Button>
                </div>

                <div style={{ marginBottom: spacing.xl }}>
                  <CircularProgress score={fraudScore.overallScore} size={180} />
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: spacing.lg,
                    }}
                  >
                    <div
                      style={{
                        fontSize: typography.fontSize.xl,
                        fontWeight: typography.fontWeight.semibold,
                        color: getScoreColor(fraudScore.overallScore),
                        marginBottom: spacing.xs,
                      }}
                    >
                      {getScoreLabel(fraudScore.overallScore)}
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: spacing.xs,
                        padding: `${spacing.xs} ${spacing.md}`,
                        backgroundColor: colors.gray[100],
                        borderRadius: borderRadius.full,
                        fontSize: typography.fontSize.xs,
                        color: colors.text.secondary,
                      }}
                    >
                      <span>📊</span>
                      <span>Güven: {Math.round(fraudScore.confidence * 100)}%</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Risk Factors */}
              {fraudScore.factors.length > 0 && (
                <Card variant="elevated" title="Risk Faktörleri">
                  <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                    {fraudScore.factors.map((factor, index) => (
                      <div
                        key={index}
                        style={{
                          padding: spacing.md,
                          backgroundColor: SEVERITY_BG_COLORS[factor.severity] || colors.gray[50],
                          borderRadius: borderRadius.md,
                          borderLeft: `4px solid ${SEVERITY_COLORS[factor.severity] || colors.gray[400]}`,
                          transition: `all ${transitions.normal} ease`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateX(4px)";
                          e.currentTarget.style.boxShadow = shadows.md;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateX(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: spacing.xs,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: spacing.sm,
                            }}
                          >
                            <span style={{ fontSize: typography.fontSize.lg }}>
                              {factor.severity === "high" ? "🔴" : factor.severity === "medium" ? "🟡" : "🟢"}
                            </span>
                            <span
                              style={{
                                fontWeight: typography.fontWeight.semibold,
                                fontSize: typography.fontSize.base,
                                color: colors.text.primary,
                              }}
                            >
                              {factor.name}
                            </span>
                          </div>
                          <span
                            style={{
                              padding: `${spacing.xs} ${spacing.sm}`,
                              borderRadius: borderRadius.full,
                              fontSize: typography.fontSize.xs,
                              fontWeight: typography.fontWeight.semibold,
                              backgroundColor: SEVERITY_COLORS[factor.severity] || colors.gray[400],
                              color: colors.white,
                            }}
                          >
                            {SEVERITY_LABELS[factor.severity] || factor.severity}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: spacing.sm,
                            fontSize: typography.fontSize.sm,
                            color: colors.text.secondary,
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: "6px",
                              backgroundColor: colors.gray[200],
                              borderRadius: borderRadius.full,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${factor.contribution}%`,
                                height: "100%",
                                backgroundColor: SEVERITY_COLORS[factor.severity] || colors.gray[400],
                                borderRadius: borderRadius.full,
                                transition: `width ${transitions.slow} ease-out`,
                              }}
                            />
                          </div>
                          <span style={{ minWidth: "60px", textAlign: "right" }}>
                            {factor.contribution.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Recommendations */}
              {fraudScore.recommendations.length > 0 && (
                <Card
                  variant="elevated"
                  title="Öneriler"
                  style={{
                    backgroundColor: colors.warningPastel,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                    {fraudScore.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: spacing.sm,
                          padding: spacing.md,
                          backgroundColor: colors.white,
                          borderRadius: borderRadius.md,
                          borderLeft: `3px solid ${colors.warning}`,
                        }}
                      >
                        <span style={{ fontSize: typography.fontSize.base, flexShrink: 0 }}>
                          💡
                        </span>
                        <p
                          style={{
                            margin: 0,
                            fontSize: typography.fontSize.sm,
                            color: colors.text.primary,
                            lineHeight: typography.lineHeight.relaxed,
                          }}
                        >
                          {rec}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <Card variant="elevated">
              <div
                style={{
                  padding: spacing["3xl"],
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "64px", marginBottom: spacing.md }}>⚠️</div>
                <h3
                  style={{
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.primary,
                    marginBottom: spacing.sm,
                  }}
                >
                  Fraud Skoru Bulunamadı
                </h3>
                <p
                  style={{
                    color: colors.text.secondary,
                    fontSize: typography.fontSize.sm,
                    marginBottom: spacing.lg,
                  }}
                >
                  Bu müşteri için henüz fraud skoru hesaplanmamış.
                </p>
                <Button
                  variant="primary"
                  onClick={() => handleCheckFraud(selectedCompanyId)}
                  loading={checkMutation.isPending}
                >
                  Fraud Kontrolü Yap
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
