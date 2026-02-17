"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTask, createTask, updateTask, listClientCompanies, type Task } from "@repo/api-client";
import { colors, spacing, borderRadius, zIndex } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId?: string | null;
  onSuccess?: () => void;
}

export default function TaskModal({ isOpen, onClose, taskId, onSuccess }: TaskModalProps) {
  const { themeColors } = useTheme();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>("pending");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [clientCompanyId, setClientCompanyId] = useState<string>("");
  const [assignedToUserId, setAssignedToUserId] = useState<string>("");

  const { data: taskData } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId!),
    enabled: !!taskId && isOpen,
  });

  const { data: clientsData } = useQuery({
    queryKey: ["client-companies"],
    queryFn: () => listClientCompanies({ page: 1, pageSize: 100 }),
    enabled: isOpen,
  });

  useEffect(() => {
    if (taskData?.data) {
      const task = taskData.data;
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
      setClientCompanyId(task.clientCompanyId || "");
      setAssignedToUserId(task.assignedToUserId || "");
    } else if (!taskId) {
      // Reset for new task
      setTitle("");
      setDescription("");
      setStatus("pending");
      setPriority("medium");
      setDueDate("");
      setClientCompanyId("");
      setAssignedToUserId("");
    }
  }, [taskData, taskId]);

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-statistics"] });
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-statistics"] });
      onSuccess?.();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const taskData = {
      title,
      description: description || null,
      status,
      priority,
      dueDate: dueDate || null,
      clientCompanyId: clientCompanyId || null,
      assignedToUserId: assignedToUserId || null,
    };

    if (taskId) {
      await updateMutation.mutateAsync({ id: taskId, data: taskData });
    } else {
      await createMutation.mutateAsync(taskData);
    }
  };

  if (!isOpen) return null;

  const clients = clientsData?.data?.data || [];

  const inputStyle = {
    width: "100%",
    padding: spacing.sm,
    border: `1px solid ${themeColors.border}`,
    borderRadius: borderRadius.sm,
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: zIndex.modal,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: themeColors.white,
          borderRadius: borderRadius.md,
          padding: spacing.lg,
          maxWidth: "600px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: "20px" }}>{taskId ? "Görevi Düzenle" : "Yeni Görev"}</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: spacing.md }}>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "bold" }}>
              Başlık *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: spacing.md }}>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "bold" }}>
              Açıklama
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md, marginBottom: spacing.md }}>
            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "bold" }}>
                Durum
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
                style={inputStyle}
              >
                <option value="pending">Beklemede</option>
                <option value="in_progress">Devam Ediyor</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "bold" }}>
                Öncelik
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
                style={inputStyle}
              >
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: spacing.md }}>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "bold" }}>
              Vade Tarihi
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: spacing.md }}>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "bold" }}>
              Müşteri Şirketi
            </label>
            <select
              value={clientCompanyId}
              onChange={(e) => setClientCompanyId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Seçiniz</option>
              {clients.map((client: any) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: spacing.sm, justifyContent: "flex-end", marginTop: spacing.lg }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: themeColors.gray[100],
                border: "none",
                borderRadius: borderRadius.sm,
                cursor: "pointer",
              }}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: colors.primary,
                color: colors.white,
                border: "none",
                borderRadius: borderRadius.sm,
                cursor: "pointer",
              }}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Kaydediliyor..."
                : taskId
                ? "Güncelle"
                : "Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
