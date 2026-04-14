import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NOTIFICATION } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toRenderableHtml } from "@/utils/html";
import { Bell, ArrowLeft, ChevronDown } from "lucide-react";

const UpdateHistory = () => {
  const [selectedNotification, setSelectedNotification] =
    useState<NOTIFICATION | null>(null);
  const [isDetailMode, setIsDetailMode] = useState(false);
  const [expandedMonthSections, setExpandedMonthSections] = useState<
    Record<string, boolean>
  >({});

  // 관리자 공지사항 목록 조회 (조회만)
  const { data: notifications = [] } = useQuery<NOTIFICATION[], Error>({
    queryKey: ["notifications", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("NOTIFICATION")
        .select("*")
        .eq("POSITION", "0")
        .eq("POPUP_YN", false)
        .order("CREATED_AT", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const notificationGroupsByMonth = useMemo(() => {
    const grouped = new Map<string, NOTIFICATION[]>();

    notifications.forEach((notification) => {
      const createdAt = new Date(notification.CREATED_AT);
      if (Number.isNaN(createdAt.getTime())) return;

      const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
      const existing = grouped.get(key) || [];
      existing.push(notification);
      grouped.set(key, existing);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => {
        const [year, month] = key.split("-");

        return {
          key,
          label: `${year}년 ${Number(month)}월`,
          items: items.sort(
            (a, b) =>
              new Date(b.CREATED_AT).getTime() -
              new Date(a.CREATED_AT).getTime(),
          ),
        };
      });
  }, [notifications]);

  const toggleMonthSection = (monthKey: string, defaultExpanded: boolean) => {
    setExpandedMonthSections((prev) => ({
      ...prev,
      [monthKey]: !(prev[monthKey] ?? defaultExpanded),
    }));
  };

  const getPlainText = (html: string) =>
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .trim();

  const handleShowDetail = (notification: NOTIFICATION) => {
    setSelectedNotification(notification);
    setIsDetailMode(true);
  };

  const handleCloseDetail = () => {
    setSelectedNotification(null);
    setIsDetailMode(false);
  };

  // 상세보기 모드
  if (isDetailMode && selectedNotification) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleCloseDetail}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          목록으로
        </Button>
        <div className="card-classic p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-heading text-xl font-bold mb-2">
                  {selectedNotification.TITLE}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(selectedNotification.CREATED_AT)} ·{" "}
                  {selectedNotification.AUTHOR}
                </p>
              </div>
            </div>
          </div>
          <hr className="my-4" />
          <div
            className="rich-html mb-6"
            dangerouslySetInnerHTML={{
              __html: toRenderableHtml(selectedNotification.CONTENT),
            }}
          />
          <Button
            variant="outline"
            onClick={handleCloseDetail}
            className="w-full"
          >
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">업데이트 내역</p>
        <p className="text-sm text-muted-foreground">
          총 {notifications.length}개
        </p>
      </div>

      {/* Update History List */}
      <div className="space-y-3">
        {notificationGroupsByMonth.map((group, index) => {
          const defaultExpanded = index === 0;
          const isExpanded =
            expandedMonthSections[group.key] ?? defaultExpanded;

          return (
            <div key={group.key} className="card-classic p-0 overflow-hidden">
              <button
                type="button"
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                onClick={() => toggleMonthSection(group.key, defaultExpanded)}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isExpanded ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                  <p className="text-sm font-medium">{group.label}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {group.items.length}개
                </p>
              </button>

              {isExpanded && (
                <div className="border-t border-border p-2 space-y-2">
                  {group.items.map((notification) => (
                    <div
                      key={notification.ID}
                      className="p-3 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleShowDetail(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                          <Bell className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">
                            {notification.TITLE}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            {getPlainText(notification.CONTENT)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(notification.CREATED_AT)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {notificationGroupsByMonth.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            업데이트 내역이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateHistory;
