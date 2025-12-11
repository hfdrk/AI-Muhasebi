"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emailTemplateClient } from "@repo/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/styles/design-system";

const TEMPLATE_NAMES = [
  { name: "notification", label: "Bildirim Şablonu", description: "Sistem bildirimleri için" },
  { name: "report", label: "Rapor Şablonu", description: "Zamanlanmış raporlar için" },
  { name: "risk-alert", label: "Risk Uyarısı Şablonu", description: "Risk uyarıları için" },
  { name: "client-communication", label: "Müşteri İletişim Şablonu", description: "Müşteri mesajları için" },
  { name: "welcome", label: "Hoş Geldin Şablonu", description: "Yeni kullanıcılar için" },
];

export default function EmailTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateContent, setTemplateContent] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const queryClient = useQueryClient();

  const { data: templatesData } = useQuery({
    queryKey: ["email-templates"],
    queryFn: () => emailTemplateClient.listTemplates(),
  });

  const { data: templateData, isLoading: templateLoading } = useQuery({
    queryKey: ["email-template", selectedTemplate],
    queryFn: () => emailTemplateClient.getTemplate(selectedTemplate!),
    enabled: !!selectedTemplate,
  });

  // Update content when template data loads
  useEffect(() => {
    if (templateData?.data && selectedTemplate) {
      setTemplateContent(templateData.data.content);
    }
  }, [templateData, selectedTemplate]);

  const updateTemplateMutation = useMutation({
    mutationFn: (content: string) => emailTemplateClient.updateTemplate(selectedTemplate!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      queryClient.invalidateQueries({ queryKey: ["email-template", selectedTemplate] });
      alert("Şablon başarıyla güncellendi!");
    },
  });

  const previewMutation = useMutation({
    mutationFn: () => emailTemplateClient.previewTemplate(selectedTemplate!),
    onSuccess: (data) => {
      setPreviewHtml(data.data.html);
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: () =>
      emailTemplateClient.sendTestEmail(selectedTemplate!, testEmail, `Test: ${selectedTemplate}`),
    onSuccess: () => {
      alert("Test e-postası gönderildi!");
      setTestEmail("");
    },
  });

  const handleSave = () => {
    if (!selectedTemplate || !templateContent.trim()) {
      alert("Lütfen şablon içeriğini doldurun.");
      return;
    }
    updateTemplateMutation.mutate(templateContent);
  };

  const handlePreview = () => {
    previewMutation.mutate();
  };

  const handleSendTest = () => {
    if (!testEmail.trim()) {
      alert("Lütfen test e-posta adresini girin.");
      return;
    }
    testEmailMutation.mutate();
  };

  const templates = templatesData?.data?.data || [];
  const currentTemplate = templateData?.data;

  return (
    <div>
      <PageHeader title="E-posta Şablonları" />

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: spacing.lg }}>
        {/* Template List */}
        <Card>
          <div style={{ padding: spacing.md, borderBottom: `1px solid ${colors.gray[200]}` }}>
            <h3 style={{ fontSize: "16px", fontWeight: "semibold" }}>Şablonlar</h3>
          </div>
          <div>
            {TEMPLATE_NAMES.map((template) => {
              const templateInfo = templates.find((t) => t.name === template.name);
              const isSelected = selectedTemplate === template.name;

              return (
                <button
                  key={template.name}
                  onClick={() => {
                    setSelectedTemplate(template.name);
                    setPreviewHtml(null);
                  }}
                  style={{
                    width: "100%",
                    padding: spacing.md,
                    border: "none",
                    borderBottom: `1px solid ${colors.gray[200]}`,
                    backgroundColor: isSelected ? colors.primaryLighter : "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    color: isSelected ? colors.primary : colors.text.primary,
                  }}
                >
                  <div style={{ fontWeight: isSelected ? "semibold" : "normal", marginBottom: spacing.xs }}>
                    {template.label}
                  </div>
                  <div style={{ fontSize: "12px", color: colors.text.secondary }}>{template.description}</div>
                  {templateInfo && (
                    <div style={{ fontSize: "11px", color: colors.text.secondary, marginTop: spacing.xs }}>
                      {templateInfo.size} karakter
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Template Editor */}
        <div>
          {!selectedTemplate ? (
            <Card>
              <div style={{ padding: spacing.xl, textAlign: "center", color: colors.text.secondary }}>
                <div style={{ fontSize: "48px", marginBottom: spacing.md }}>📧</div>
                <div>Düzenlemek için bir şablon seçin</div>
              </div>
            </Card>
          ) : templateLoading ? (
            <Card>
              <div style={{ padding: spacing.xl, textAlign: "center" }}>Yükleniyor...</div>
            </Card>
          ) : (
            <>
              <Card style={{ marginBottom: spacing.md }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "semibold" }}>
                    {TEMPLATE_NAMES.find((t) => t.name === selectedTemplate)?.label}
                  </h3>
                  <div style={{ display: "flex", gap: spacing.sm }}>
                    <Button onClick={handlePreview} disabled={previewMutation.isPending}>
                      {previewMutation.isPending ? "Önizleniyor..." : "Önizle"}
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={updateTemplateMutation.isPending}
                      style={{ backgroundColor: colors.primary, color: colors.white }}
                    >
                      {updateTemplateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                    </Button>
                  </div>
                </div>

                <textarea
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: "400px",
                    padding: spacing.md,
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    lineHeight: "1.5",
                  }}
                  placeholder="Şablon içeriğini buraya yazın..."
                />

                <div style={{ marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.gray[50], borderRadius: "6px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "semibold", marginBottom: spacing.sm }}>💡 Kullanılabilir Değişkenler:</h4>
                  <div style={{ fontSize: "12px", color: colors.text.secondary }}>
                    <div>• <code>{`{{title}}`}</code> - Başlık</div>
                    <div>• <code>{`{{message}}`}</code> - Mesaj içeriği</div>
                    <div>• <code>{`{{year}}`}</code> - Yıl</div>
                    <div>• <code>{`{{#if condition}}...{{/if}}`}</code> - Koşullu içerik</div>
                    <div>• <code>{`{{#each items}}...{{/each}}`}</code> - Döngü</div>
                  </div>
                </div>
              </Card>

              {/* Preview */}
              {previewHtml && (
                <Card style={{ marginBottom: spacing.md }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
                    <h3 style={{ fontSize: "18px", fontWeight: "semibold" }}>Önizleme</h3>
                    <Button
                      onClick={() => setPreviewHtml(null)}
                      style={{ backgroundColor: colors.gray[300], color: colors.text.primary }}
                    >
                      Kapat
                    </Button>
                  </div>
                  <div
                    style={{
                      border: `1px solid ${colors.gray[300]}`,
                      borderRadius: "6px",
                      padding: spacing.md,
                      backgroundColor: colors.white,
                    }}
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </Card>
              )}

              {/* Test Email */}
              <Card>
                <h3 style={{ fontSize: "18px", fontWeight: "semibold", marginBottom: spacing.md }}>Test E-postası Gönder</h3>
                <div style={{ display: "flex", gap: spacing.sm, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: spacing.xs, fontSize: "14px" }}>
                      E-posta Adresi
                    </label>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      style={{
                        width: "100%",
                        padding: spacing.sm,
                        border: `1px solid ${colors.gray[300]}`,
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleSendTest}
                    disabled={!testEmail.trim() || testEmailMutation.isPending}
                    style={{ backgroundColor: colors.success, color: colors.white }}
                  >
                    {testEmailMutation.isPending ? "Gönderiliyor..." : "Test Gönder"}
                  </Button>
                </div>
                {testEmailMutation.isError && (
                  <div style={{ marginTop: spacing.sm, color: colors.error, fontSize: "14px" }}>
                    {(testEmailMutation.error as Error)?.message || "Test e-postası gönderilirken bir hata oluştu."}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

