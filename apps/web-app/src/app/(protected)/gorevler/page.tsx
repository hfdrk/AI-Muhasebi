"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTasks, getTaskStatistics, updateTask, deleteTask, type Task } from "@repo/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import { spacing, colors } from "@/styles/design-system";
import TaskModal from "@/components/task-modal";
import TaskList from "@/components/task-list";
import TaskDashboardWidget from "@/components/task-dashboard-widget";

export default function TasksPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; taskId: string | null }>({ open: false, taskId: null });
  const [filters, setFilters] = useState<{
    status?: "pending" | "in_progress" | "completed" | "cancelled";
    priority?: "low" | "medium" | "high";
    overdue?: boolean;
    clientCompanyId?: string;
  }>({});

  const queryClient = useQueryClient();

  const { data: tasksData, isLoading, error } = useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => listTasks(filters),
  });

  const { data: statsData } = useQuery({
    queryKey: ["task-statistics"],
    queryFn: () => getTaskStatistics(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-statistics"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-statistics"] });
    },
  });

  const handleCreateTask = () => {
    setSelectedTaskId(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeleteModal({ open: true, taskId });
  };

  const handleStatusChange = async (taskId: string, status: Task["status"]) => {
    await updateMutation.mutateAsync({ id: taskId, data: { status } });
  };

  const tasks = tasksData?.data?.data || [];
  const stats = statsData?.data;

  return (
    <PageTransition>
      <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <PageHeader
        title="Görevler"
        actions={
          <button
            onClick={handleCreateTask}
            style={{
              padding: "10px 20px",
              backgroundColor: colors.primary,
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            + Yeni Görev
          </button>
        }
      />

      {stats && <TaskDashboardWidget statistics={stats} />}

      <div style={{ marginTop: "24px" }}>
        <div style={{ marginBottom: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <select
            value={filters.status || ""}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value as any || undefined })
            }
            style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
          >
            <option value="">Tüm Durumlar</option>
            <option value="pending">Beklemede</option>
            <option value="in_progress">Devam Ediyor</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal Edildi</option>
          </select>

          <select
            value={filters.priority || ""}
            onChange={(e) =>
              setFilters({ ...filters, priority: e.target.value as any || undefined })
            }
            style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
          >
            <option value="">Tüm Öncelikler</option>
            <option value="low">Düşük</option>
            <option value="medium">Orta</option>
            <option value="high">Yüksek</option>
          </select>

          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={filters.overdue || false}
              onChange={(e) =>
                setFilters({ ...filters, overdue: e.target.checked || undefined })
              }
            />
            Sadece Vadesi Geçenler
          </label>
        </div>

        {isLoading ? (
          <Card>
            <div style={{ padding: spacing.lg }}>
              <SkeletonTable rows={5} columns={4} />
            </div>
          </Card>
        ) : (
          <TaskList
            tasks={tasks}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {isModalOpen && (
        <TaskModal
          taskId={selectedTaskId}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTaskId(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            queryClient.invalidateQueries({ queryKey: ["task-statistics"] });
            setIsModalOpen(false);
            setSelectedTaskId(null);
          }}
        />
      )}

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, taskId: null })}
        title="Görevi Sil"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p>Bu görevi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setDeleteModal({ open: false, taskId: null })}>
            İptal
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (deleteModal.taskId) {
                deleteMutation.mutate(deleteModal.taskId);
                setDeleteModal({ open: false, taskId: null });
              }
            }}
            loading={deleteMutation.isPending}
          >
            Sil
          </Button>
        </div>
      </Modal>
    </div>
    </PageTransition>
  );
}



