"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadDocument, getMyClientCompany } from "@repo/api-client";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "@/lib/toast";

export default function ClientUploadPage() {
  const { themeColors } = useTheme();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const queryClient = useQueryClient();

  const { data: clientCompanyData } = useQuery({
    queryKey: ["myClientCompany"],
    queryFn: () => getMyClientCompany(),
  });

  const clientCompanyId = clientCompanyData?.data?.id;

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return uploadDocument(file, { clientCompanyId: clientCompanyId || "" });
    },
    onSuccess: () => {
      setUploadStatus("success");
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["client-dashboard-documents"] });
      setTimeout(() => setUploadStatus("idle"), 3000);
    },
    onError: () => {
      setUploadStatus("error");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
      if (!allowedTypes.includes(file.type)) {
        toast.warning("Lütfen PDF veya resim dosyası seçin (PDF, JPG, PNG)");
        return;
      }

      // Validate file size (20MB max)
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (file.size > maxSize) {
        toast.warning("Dosya boyutu 20MB'dan küçük olmalıdır");
        return;
      }

      setSelectedFile(file);
      setUploadStatus("idle");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      await uploadMutation.mutateAsync(selectedFile);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Belge Yükle" />

      <Card style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ marginBottom: spacing.lg }}>
          <h3 style={{ fontSize: "18px", fontWeight: "semibold", marginBottom: spacing.sm }}>
            Yeni Belge Yükle
          </h3>
          <p style={{ color: themeColors.text.secondary, marginBottom: spacing.md }}>
            Fatura, makbuz, banka ekstresi veya diğer muhasebe belgelerinizi yükleyebilirsiniz.
            Desteklenen formatlar: PDF, JPG, PNG (Maksimum 20MB)
          </p>
        </div>

        <div style={{ marginBottom: spacing.lg }}>
          <label
            htmlFor="file-input"
            style={{
              display: "block",
              padding: spacing.xl,
              border: `2px dashed ${themeColors.gray[300]}`,
              borderRadius: "8px",
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: themeColors.gray[50],
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.primary;
              e.currentTarget.style.backgroundColor = colors.primaryLighter;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = themeColors.gray[300];
              e.currentTarget.style.backgroundColor = themeColors.gray[50];
            }}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              style={{ display: "none" }}
              disabled={uploading}
            />
            <div style={{ fontSize: "48px", marginBottom: spacing.sm }}>📄</div>
            <div style={{ fontWeight: "medium", marginBottom: spacing.xs }}>
              {selectedFile ? selectedFile.name : "Dosya Seçin"}
            </div>
            <div style={{ fontSize: "14px", color: themeColors.text.secondary }}>
              {selectedFile
                ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                : "PDF, JPG veya PNG dosyası seçin"}
            </div>
          </label>
        </div>

        {selectedFile && (
          <div style={{ marginBottom: spacing.lg }}>
            <Button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                width: "100%",
                padding: spacing.md,
                backgroundColor: colors.primary,
                color: colors.white,
                border: "none",
                borderRadius: "6px",
                cursor: uploading ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: "medium",
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? "Yükleniyor..." : "📤 Belgeyi Yükle"}
            </Button>
          </div>
        )}

        {uploadStatus === "success" && (
          <div
            style={{
              padding: spacing.md,
              backgroundColor: colors.successLighter,
              color: colors.success,
              borderRadius: "6px",
              marginTop: spacing.md,
            }}
          >
            ✅ Belge başarıyla yüklendi! İşleme alındı.
          </div>
        )}

        {uploadStatus === "error" && (
          <div
            style={{
              padding: spacing.md,
              backgroundColor: colors.errorLighter,
              color: colors.error,
              borderRadius: "6px",
              marginTop: spacing.md,
            }}
          >
            ❌ Belge yüklenirken bir hata oluştu. Lütfen tekrar deneyin.
          </div>
        )}

        <div style={{ marginTop: spacing.xl, padding: spacing.md, backgroundColor: themeColors.gray[50], borderRadius: "6px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: "semibold", marginBottom: spacing.sm }}>💡 İpuçları:</h4>
          <ul style={{ fontSize: "14px", color: themeColors.text.secondary, paddingLeft: spacing.lg }}>
            <li>Belgelerin net ve okunabilir olduğundan emin olun</li>
            <li>Faturaları ve makbuzları eksiksiz yükleyin</li>
            <li>Banka ekstrelerini PDF formatında yükleyin</li>
            <li>Belgeler otomatik olarak işlenecek ve analiz edilecektir</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
