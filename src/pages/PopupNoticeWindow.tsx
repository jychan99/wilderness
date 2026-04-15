import { useEffect, useMemo, useState } from "react";
import { NOTIFICATION } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toRenderableHtml } from "@/utils/html";

const THEME_VARS_STORAGE_KEY = "erp-theme-vars";
const POPUP_NOTICE_HIDE_TODAY_KEY = "erp-popup-notice-hide-today";

const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateTime = (dateStr: string) => {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPopupPeriod = (
  startAt: string | null | undefined,
  endAt: string | null | undefined,
) => {
  if (!startAt && !endAt) return "";
  if (startAt && endAt) {
    return `${formatDateTime(startAt)} ~ ${formatDateTime(endAt)}`;
  }
  if (startAt) return `${formatDateTime(startAt)} ~`;
  return `~ ${formatDateTime(endAt as string)}`;
};

const isTodayInPopupRange = (startAt: string | null, endAt: string | null) => {
  if (!startAt || !endAt) return false;

  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }

  const now = new Date();
  return now >= start && now <= end;
};

const PopupNoticeWindow = () => {
  const [notices, setNotices] = useState<NOTIFICATION[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(THEME_VARS_STORAGE_KEY);
    if (!raw) return;

    try {
      const vars = JSON.parse(raw) as Record<string, string>;
      Object.entries(vars).forEach(([key, value]) => {
        if (typeof key === "string" && typeof value === "string") {
          document.documentElement.style.setProperty(key, value);
        }
      });
    } catch {
      // ignore invalid theme cache
    }
  }, []);

  const closeWindow = () => {
    window.close();
  };

  const hideTodayAndClose = () => {
    localStorage.setItem(POPUP_NOTICE_HIDE_TODAY_KEY, getTodayKey());
    closeWindow();
  };

  useEffect(() => {
    let isMounted = true;

    const fetchNotices = async () => {
      try {
        const { data, error } = await supabase
          .from("NOTIFICATION")
          .select("*")
          .eq("POSITION", "0")
          .eq("POPUP_YN", true)
          .order("CREATED_AT", { ascending: false });

        if (error || !isMounted) return;

        const activeNotices = (data as NOTIFICATION[]).filter((item) =>
          isTodayInPopupRange(item.POPUP_START_AT, item.POPUP_END_AT),
        );

        setNotices(activeNotices);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchNotices();

    return () => {
      isMounted = false;
    };
  }, []);

  const title = useMemo(() => {
    if (notices.length === 0) return "공지사항";
    if (notices.length === 1) return notices[0].TITLE;
    return `공지사항 ${notices.length}건`;
  }, [notices]);

  return (
    <main className="min-h-screen bg-background p-4 text-foreground">
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="rounded-lg border border-border bg-card p-4">
          <h1 className="font-heading text-xl font-bold">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            본 창은 시스템 내부 공지 전용 팝업입니다.
          </p>
        </header>

        {isLoading && (
          <section className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            공지사항을 불러오는 중입니다...
          </section>
        )}

        {!isLoading && notices.length === 0 && (
          <section className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            현재 표시할 팝업 공지사항이 없습니다.
          </section>
        )}

        {!isLoading &&
          notices.map((notice) => (
            <article
              key={notice.ID}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="mb-3">
                <h2 className="text-base font-semibold">{notice.TITLE}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  등록일시: {formatDateTime(notice.CREATED_AT)}
                </p>
              </div>
              <div
                className="rich-html"
                dangerouslySetInnerHTML={{
                  __html: toRenderableHtml(notice.CONTENT),
                }}
              />
            </article>
          ))}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={hideTodayAndClose}>
            오늘 하루 보지 않기
          </Button>
          <Button type="button" onClick={closeWindow}>
            닫기
          </Button>
        </div>
      </div>
    </main>
  );
};

export default PopupNoticeWindow;
