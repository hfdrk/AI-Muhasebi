"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { exchangeRateClient } from "@repo/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import { colors, spacing, borderRadius, typography, transitions } from "../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "../../../lib/toast";

export default function DovizKurlariPage() {
  const { themeColors } = useTheme();
  const [activeTab, setActiveTab] = useState<"latest" | "history" | "converter">("latest");
  const queryClient = useQueryClient();

  // History filters
  const [histCurrency, setHistCurrency] = useState<string>("USD");
  const [histQuoteCurrency, setHistQuoteCurrency] = useState<string>("TRY");
  const [histStartDate, setHistStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [histEndDate, setHistEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [historyEnabled, setHistoryEnabled] = useState(false);

  // Converter state
  const [convertAmount, setConvertAmount] = useState<number>(100);
  const [convertFrom, setConvertFrom] = useState<string>("USD");
  const [convertTo, setConvertTo] = useState<string>("TRY");

  // Manual rate form
  const [showAddRate, setShowAddRate] = useState(false);
  const [rateForm, setRateForm] = useState({
    baseCurrency: "USD",
    quoteCurrency: "TRY",
    buyRate: 0,
    sellRate: 0,
    rateDate: new Date().toISOString().split("T")[0],
    source: "MANUAL",
  });

  // Queries
  const { data: latestData, isLoading: latestLoading } = useQuery({
    queryKey: ["exchange-rates-latest"],
    queryFn: () => exchangeRateClient.getLatest(),
  });

  const { data: currenciesData } = useQuery({
    queryKey: ["exchange-rate-currencies"],
    queryFn: () => exchangeRateClient.getCurrencies(),
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["exchange-rate-history", histCurrency, histQuoteCurrency, histStartDate, histEndDate],
    queryFn: () =>
      exchangeRateClient.getHistory({
        baseCurrency: histCurrency,
        quoteCurrency: histQuoteCurrency,
        dateStart: histStartDate,
        dateEnd: histEndDate,
      }),
    enabled: activeTab === "history" && historyEnabled,
  });

  const { data: convertData, isLoading: convertLoading, refetch: refetchConvert } = useQuery({
    queryKey: ["exchange-rate-convert", convertAmount, convertFrom, convertTo],
    queryFn: () =>
      exchangeRateClient.convert({
        amount: convertAmount,
        from: convertFrom,
        to: convertTo,
      }),
    enabled: false,
  });

  // Mutations
  const fetchTCMBMutation = useMutation({
    mutationFn: () => exchangeRateClient.fetchFromTCMB(),
    onSuccess: (data) => {
      toast.success(`TCMB'den ${data.data.fetchedCount} kur verisi cekildi`);
      queryClient.invalidateQueries({ queryKey: ["exchange-rates-latest"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "TCMB kur cekme basarisiz oldu");
    },
  });

  const addRateMutation = useMutation({
    mutationFn: () => exchangeRateClient.addManualRate(rateForm),
    onSuccess: () => {
      toast.success("Manuel kur eklendi");
      queryClient.invalidateQueries({ queryKey: ["exchange-rates-latest"] });
      setShowAddRate(false);
      setRateForm({
        baseCurrency: "USD",
        quoteCurrency: "TRY",
        buyRate: 0,
        sellRate: 0,
        rateDate: new Date().toISOString().split("T")[0],
        source: "MANUAL",
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kur ekleme basarisiz oldu");
    },
  });

  const latestRates = latestData?.data || [];
  const currencies = currenciesData?.data || [];
  const historyRates = historyData?.data || [];
  const convertResult = convertData?.data;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    border: `1px solid ${themeColors.border}`,
    fontSize: typography.fontSize.sm,
    backgroundColor: themeColors.white,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
    color: themeColors.text.primary,
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1
          style={{
            fontSize: typography.fontSize["2xl"],
            fontWeight: typography.fontWeight.bold,
            color: themeColors.text.primary,
            margin: 0,
          }}
        >
          Doviz Kurlari
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            color: themeColors.text.secondary,
            margin: `${spacing.xs} 0 0`,
          }}
        >
          Guncel kurlar, gecmis veriler ve doviz cevirici
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: spacing.sm,
          marginBottom: spacing.xl,
          borderBottom: `2px solid ${themeColors.border}`,
          paddingBottom: spacing.sm,
        }}
      >
        {[
          { key: "latest", label: "Guncel Kurlar" },
          { key: "history", label: "Gecmis" },
          { key: "converter", label: "Cevirici" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: activeTab === tab.key ? colors.primary : "transparent",
              color: activeTab === tab.key ? colors.white : themeColors.text.secondary,
              border: "none",
              borderRadius: borderRadius.md,
              fontWeight: typography.fontWeight.semibold,
              fontSize: typography.fontSize.sm,
              cursor: "pointer",
              transition: `all ${transitions.normal}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Latest Rates Tab */}
      {activeTab === "latest" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: 0 }}>
              Guncel Doviz Kurlari
            </h3>
            <div style={{ display: "flex", gap: spacing.sm }}>
              <Button
                onClick={() => fetchTCMBMutation.mutate()}
                disabled={fetchTCMBMutation.isPending}
                variant="secondary"
                size="sm"
              >
                {fetchTCMBMutation.isPending ? "Cekiliyor..." : "TCMB Kurlarini Cek"}
              </Button>
              <Button onClick={() => setShowAddRate(!showAddRate)} size="sm" variant="outline">
                {showAddRate ? "Formu Kapat" : "Manuel Kur Ekle"}
              </Button>
            </div>
          </div>

          {/* Add Manual Rate Form */}
          {showAddRate && (
            <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
              <div style={{ padding: spacing.lg }}>
                <h4 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.md}` }}>
                  Manuel Kur Ekle
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: spacing.md }}>
                  <div>
                    <label style={labelStyle}>Baz Para Birimi</label>
                    <select
                      value={rateForm.baseCurrency}
                      onChange={(e) => setRateForm({ ...rateForm, baseCurrency: e.target.value })}
                      style={inputStyle}
                    >
                      {currencies.length > 0
                        ? currencies.map((c: any) => (
                            <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                          ))
                        : ["USD", "EUR", "GBP", "CHF", "JPY"].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Karsi Para Birimi</label>
                    <select
                      value={rateForm.quoteCurrency}
                      onChange={(e) => setRateForm({ ...rateForm, quoteCurrency: e.target.value })}
                      style={inputStyle}
                    >
                      {currencies.length > 0
                        ? currencies.map((c: any) => (
                            <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                          ))
                        : ["TRY", "USD", "EUR", "GBP"].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Alis Kuru</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={rateForm.buyRate}
                      onChange={(e) => setRateForm({ ...rateForm, buyRate: parseFloat(e.target.value) || 0 })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Satis Kuru</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={rateForm.sellRate}
                      onChange={(e) => setRateForm({ ...rateForm, sellRate: parseFloat(e.target.value) || 0 })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Tarih</label>
                    <input
                      type="date"
                      value={rateForm.rateDate}
                      onChange={(e) => setRateForm({ ...rateForm, rateDate: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ marginTop: spacing.md }}>
                  <Button
                    onClick={() => addRateMutation.mutate()}
                    disabled={!rateForm.buyRate || !rateForm.sellRate || addRateMutation.isPending}
                  >
                    {addRateMutation.isPending ? "Ekleniyor..." : "Kur Ekle"}
                  </Button>
                </div>
                {addRateMutation.isError && (
                  <div style={{ marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: `${colors.danger}10`, color: colors.danger, fontSize: typography.fontSize.sm }}>
                    {(addRateMutation.error as Error).message}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Rates Table */}
          <Card variant="elevated">
            <div style={{ padding: spacing.lg }}>
              {latestLoading ? (
                <Skeleton height="300px" />
              ) : latestRates.length === 0 ? (
                <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>
                  Guncel kur verisi bulunmuyor. TCMB kurlarini cekerek baslayabilirsiniz.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                        {["Para Birimi", "Alis", "Satis", "Tarih", "Kaynak"].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: "left",
                              padding: spacing.sm,
                              fontSize: typography.fontSize.xs,
                              color: themeColors.text.secondary,
                              textTransform: "uppercase",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {latestRates.map((rate: any) => (
                        <tr key={rate.id} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                          <td style={{ padding: spacing.sm }}>
                            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                              <span
                                style={{
                                  padding: `2px ${spacing.sm}`,
                                  borderRadius: borderRadius.full,
                                  fontSize: typography.fontSize.xs,
                                  fontWeight: typography.fontWeight.bold,
                                  backgroundColor: `${colors.primary}20`,
                                  color: colors.primary,
                                }}
                              >
                                {rate.baseCurrency}
                              </span>
                              <span style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>/</span>
                              <span style={{ fontSize: typography.fontSize.sm }}>{rate.quoteCurrency}</span>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: spacing.sm,
                              fontSize: typography.fontSize.sm,
                              fontWeight: typography.fontWeight.semibold,
                              color: colors.success,
                            }}
                          >
                            {Number(rate.buyRate).toLocaleString("tr-TR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </td>
                          <td
                            style={{
                              padding: spacing.sm,
                              fontSize: typography.fontSize.sm,
                              fontWeight: typography.fontWeight.semibold,
                              color: colors.danger,
                            }}
                          >
                            {Number(rate.sellRate).toLocaleString("tr-TR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </td>
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>
                            {new Date(rate.rateDate).toLocaleDateString("tr-TR")}
                          </td>
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>
                            {rate.source || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.lg}` }}>
              Gecmis Kur Verileri
            </h3>
            <div style={{ display: "flex", gap: spacing.md, alignItems: "flex-end", marginBottom: spacing.xl }}>
              <div>
                <label style={labelStyle}>Baz Para Birimi</label>
                <select
                  value={histCurrency}
                  onChange={(e) => setHistCurrency(e.target.value)}
                  style={{ ...inputStyle, width: "120px" }}
                >
                  {currencies.length > 0
                    ? currencies.map((c: any) => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))
                    : ["USD", "EUR", "GBP", "CHF", "JPY"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Karsi Para Birimi</label>
                <select
                  value={histQuoteCurrency}
                  onChange={(e) => setHistQuoteCurrency(e.target.value)}
                  style={{ ...inputStyle, width: "120px" }}
                >
                  {currencies.length > 0
                    ? currencies.map((c: any) => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))
                    : ["TRY", "USD", "EUR", "GBP"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Baslangic</label>
                <input
                  type="date"
                  value={histStartDate}
                  onChange={(e) => setHistStartDate(e.target.value)}
                  style={{ ...inputStyle, width: "160px" }}
                />
              </div>
              <div>
                <label style={labelStyle}>Bitis</label>
                <input
                  type="date"
                  value={histEndDate}
                  onChange={(e) => setHistEndDate(e.target.value)}
                  style={{ ...inputStyle, width: "160px" }}
                />
              </div>
              <Button
                onClick={() => setHistoryEnabled(true)}
                disabled={historyLoading}
              >
                {historyLoading ? "Yukleniyor..." : "Sorgula"}
              </Button>
            </div>

            {historyLoading ? (
              <Skeleton height="300px" />
            ) : !historyEnabled ? (
              <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>
                Tarih araligini secin ve Sorgula butonuna basin
              </p>
            ) : Array.isArray(historyRates) && historyRates.length === 0 ? (
              <p style={{ color: themeColors.text.muted, textAlign: "center", padding: spacing.xl }}>
                Secilen donem icin kur verisi bulunmuyor
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                      {["Tarih", "Alis", "Satis", "Degisim"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: spacing.sm, fontSize: typography.fontSize.xs, color: themeColors.text.secondary, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(historyRates) ? historyRates : []).map((rate: any, idx: number) => {
                      const prevRate = Array.isArray(historyRates) && idx > 0 ? (historyRates as any[])[idx - 1] : null;
                      const change = prevRate ? ((rate.buyRate - prevRate.buyRate) / prevRate.buyRate * 100) : 0;
                      return (
                        <tr key={rate.id || idx} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>
                            {new Date(rate.rateDate).toLocaleDateString("tr-TR")}
                          </td>
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                            {Number(rate.buyRate).toLocaleString("tr-TR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </td>
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                            {Number(rate.sellRate).toLocaleString("tr-TR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </td>
                          <td style={{ padding: spacing.sm, fontSize: typography.fontSize.sm }}>
                            {prevRate ? (
                              <span style={{ color: change >= 0 ? colors.success : colors.danger, fontWeight: typography.fontWeight.semibold }}>
                                {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                              </span>
                            ) : (
                              <span style={{ color: themeColors.text.muted }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Converter Tab */}
      {activeTab === "converter" && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.lg}` }}>
              Doviz Cevirici
            </h3>
            <div style={{ display: "flex", gap: spacing.lg, alignItems: "flex-end", marginBottom: spacing.xl }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Tutar</label>
                <input
                  type="number"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Kaynak Para Birimi</label>
                <select
                  value={convertFrom}
                  onChange={(e) => setConvertFrom(e.target.value)}
                  style={inputStyle}
                >
                  {currencies.length > 0
                    ? currencies.map((c: any) => (
                        <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                      ))
                    : ["USD", "EUR", "GBP", "TRY", "CHF", "JPY"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", padding: `0 ${spacing.sm}` }}>
                <span style={{ fontSize: typography.fontSize.xl, color: themeColors.text.muted }}>&#8594;</span>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Hedef Para Birimi</label>
                <select
                  value={convertTo}
                  onChange={(e) => setConvertTo(e.target.value)}
                  style={inputStyle}
                >
                  {currencies.length > 0
                    ? currencies.map((c: any) => (
                        <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                      ))
                    : ["TRY", "USD", "EUR", "GBP", "CHF", "JPY"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                </select>
              </div>
              <Button
                onClick={() => refetchConvert()}
                disabled={convertLoading || !convertAmount}
              >
                {convertLoading ? "Hesaplaniyor..." : "Cevir"}
              </Button>
            </div>

            {/* Conversion Result */}
            {convertResult && (
              <div
                style={{
                  padding: spacing.xl,
                  borderRadius: borderRadius.lg,
                  backgroundColor: `${colors.primary}08`,
                  border: `1px solid ${colors.primary}30`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, marginBottom: spacing.sm }}>
                  {Number(convertResult.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {convertResult.from}
                </div>
                <div style={{ fontSize: typography.fontSize["3xl"], fontWeight: typography.fontWeight.bold, color: colors.primary, marginBottom: spacing.sm }}>
                  {Number(convertResult.convertedAmount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {convertResult.to}
                </div>
                <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>
                  Kur: 1 {convertResult.from} = {Number(convertResult.rate).toLocaleString("tr-TR", { minimumFractionDigits: 4, maximumFractionDigits: 6 })} {convertResult.to}
                  {" | "}Tarih: {new Date(convertResult.date).toLocaleDateString("tr-TR")}
                </div>
              </div>
            )}

            {/* Quick Currency Cards */}
            <div style={{ marginTop: spacing.xl }}>
              <h4 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.md}` }}>
                Hizli Bakis
              </h4>
              {latestLoading ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: spacing.md }}>
                  {[1, 2, 3].map((i) => (
                    <Card key={i}><div style={{ padding: spacing.md }}><Skeleton height="60px" /></div></Card>
                  ))}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: spacing.md }}>
                  {latestRates.slice(0, 6).map((rate: any) => (
                    <Card key={rate.id} variant="elevated">
                      <div style={{ padding: spacing.md, textAlign: "center" }}>
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.primary, marginBottom: spacing.xs }}>
                          {rate.baseCurrency}/{rate.quoteCurrency}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-around" }}>
                          <div>
                            <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Alis</div>
                            <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.success }}>
                              {Number(rate.buyRate).toLocaleString("tr-TR", { minimumFractionDigits: 4 })}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Satis</div>
                            <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.danger }}>
                              {Number(rate.sellRate).toLocaleString("tr-TR", { minimumFractionDigits: 4 })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
