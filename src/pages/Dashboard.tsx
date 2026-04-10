import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import koLocale from "@fullcalendar/core/locales/ko";
import type {
  DayCellContentArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SCHEDULE, MEETING, NOTIFICATION, STU_MAIN } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toRenderableHtml } from "@/utils/html";

interface DashboardProps {
  onTabChange?: (tab: string) => void;
}

interface DailyMissaResponse {
  date: string;
  url: string;
  missaTitle: string | null;
  count: number;
  gospelHeaderTexts: string[];
  gospelStartTexts: string[];
  gospelSectionTexts: string[];
}

interface DailyMissaLegacyResponse {
  date: string;
  url: string;
  missaTitle: string | null;
  count?: number;
  h4Texts?: string[];
  gospelHeaderTexts?: string[];
  gospelStartTexts?: string[];
  gospelProclamationTexts?: string[];
  gospelSectionTexts?: string[];
}

const DEFAULT_SCHEDULE_COLOR = "#3B82F6";

interface NewScheduleForm {
  title: string;
  startDate: string;
  endDate: string;
  description: string;
  color: string;
}

const normalizeExternalUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const getTodayKstDateForInput = () => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
};

const shiftDateString = (date: string, days: number) => {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;

  const shiftedDate = new Date(Date.UTC(year, month - 1, day + days));
  return shiftedDate.toISOString().split("T")[0];
};

const toExclusiveEndDate = (date: string) => {
  return shiftDateString(date, 1);
};

const toInclusiveEndDate = (
  startDate: string,
  exclusiveEndDate?: string | null,
) => {
  if (!exclusiveEndDate) return startDate;

  const inclusiveEndDate = shiftDateString(exclusiveEndDate, -1);
  return inclusiveEndDate < startDate ? startDate : inclusiveEndDate;
};

const normalizeHexColor = (value?: string | null) => {
  const raw = (value || "").trim();
  if (!raw) return DEFAULT_SCHEDULE_COLOR;

  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9A-Fa-f]{6}$/.test(withHash)
    ? withHash.toUpperCase()
    : DEFAULT_SCHEDULE_COLOR;
};

const getContrastingTextColor = (hexColor?: string | null) => {
  const hex = normalizeHexColor(hexColor).slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Perceived luminance (WCAG) to pick readable text color.
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.5 ? "#FFFFFF" : "#111827";
};

const generateRandomHexColor = () => {
  const randomNumber = Math.floor(Math.random() * 0xffffff);
  return `#${randomNumber.toString(16).padStart(6, "0").toUpperCase()}`;
};

const Dashboard = ({ onTabChange }: DashboardProps = {}) => {
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<NewScheduleForm>({
    title: "",
    startDate: "",
    endDate: "",
    description: "",
    color: generateRandomHexColor(),
  });
  const [selectedEvent, setSelectedEvent] = useState<SCHEDULE | null>(null);
  const [editingEvent, setEditingEvent] = useState<SCHEDULE | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dailyMissaDate, setDailyMissaDate] = useState(getTodayKstDateForInput);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isScheduleAdmin = user?.position === "0";

  const canManageSchedule = (event: SCHEDULE | null) => {
    if (!user || !event) return false;
    return isScheduleAdmin || event.USER_CODE === user.USER_CODE;
  };

  // 캘린더 이벤트 조회
  const { data: events = [], isLoading: eventsLoading } = useQuery<
    SCHEDULE[],
    Error
  >({
    queryKey: ["calendar_events"],
    queryFn: async (): Promise<SCHEDULE[]> => {
      const { data, error } = await supabase.from("SCHEDULE").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // 회의록 조회
  const { data: meetingNotes = [], isLoading: meetingLoading } = useQuery<
    MEETING[],
    Error
  >({
    queryKey: ["meetings"],
    queryFn: async (): Promise<MEETING[]> => {
      const { data, error } = await supabase
        .from("MEETING")
        .select("*")
        .order("DATE", { ascending: false })
        .order("ID", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data || [];
    },
  });

  // 학생 축일 조회
  const { data: students = [] } = useQuery<STU_MAIN[], Error>({
    queryKey: ["students"],
    queryFn: async (): Promise<STU_MAIN[]> => {
      const { data, error } = await supabase.from("STU_MAIN").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // 관리자 공지사항 조회
  const {
    data: adminNotifications = [],
    isLoading: adminNotificationsLoading,
  } = useQuery<NOTIFICATION[], Error>({
    queryKey: ["notifications", "admin"],
    queryFn: async (): Promise<NOTIFICATION[]> => {
      const { data, error } = await supabase
        .from("NOTIFICATION")
        .select("*")
        .eq("POSITION", "0")
        .order("CREATED_AT", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data || [];
    },
  });

  // 회장 공지사항 조회
  const {
    data: chairmanNotifications = [],
    isLoading: chairmanNotificationsLoading,
  } = useQuery<NOTIFICATION[], Error>({
    queryKey: ["notifications", "chairman"],
    queryFn: async (): Promise<NOTIFICATION[]> => {
      const { data, error } = await supabase
        .from("NOTIFICATION")
        .select("*")
        .eq("POSITION", "1")
        .order("CREATED_AT", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data || [];
    },
  });

  // 매일미사 스크래핑 조회
  const {
    data: dailyMissa,
    isLoading: dailyMissaLoading,
    isFetching: dailyMissaFetching,
    error: dailyMissaError,
  } = useQuery<DailyMissaResponse, Error>({
    queryKey: ["daily_missa", dailyMissaDate],
    enabled: Boolean(dailyMissaDate),
    queryFn: async (): Promise<DailyMissaResponse> => {
      const { data, error } = await supabase.functions.invoke("daily_missa", {
        body: { date: dailyMissaDate },
      });

      if (error) {
        throw new Error(error.message || "매일미사 조회에 실패했습니다.");
      }

      if (!data || typeof data !== "object") {
        throw new Error("매일미사 응답 형식이 올바르지 않습니다.");
      }

      const payload = data as DailyMissaLegacyResponse;
      const gospelHeaderTexts = Array.isArray(payload.gospelHeaderTexts)
        ? payload.gospelHeaderTexts
        : [];
      const gospelStartTexts = Array.isArray(payload.gospelStartTexts)
        ? payload.gospelStartTexts
        : Array.isArray(payload.gospelProclamationTexts)
          ? payload.gospelProclamationTexts
          : [];
      const gospelSectionTexts = Array.isArray(payload.gospelSectionTexts)
        ? payload.gospelSectionTexts
        : Array.isArray(payload.h4Texts)
          ? payload.h4Texts
          : null;

      if (!gospelSectionTexts) {
        throw new Error("매일미사 응답 형식이 올바르지 않습니다.");
      }

      return {
        date: payload.date,
        url: payload.url,
        missaTitle: payload.missaTitle ?? null,
        count:
          typeof payload.count === "number"
            ? payload.count
            : gospelSectionTexts.length,
        gospelHeaderTexts,
        gospelStartTexts,
        gospelSectionTexts,
      };
    },
  });

  // 이벤트 추가 뮤테이션
  const addEventMutation = useMutation<void, Error, SCHEDULE>({
    mutationFn: async (event: SCHEDULE) => {
      const { error } = await (supabase as any).from("SCHEDULE").insert([
        {
          ID: event.ID,
          TITLE: event.TITLE,
          START_DATE: event.START_DATE,
          END_DATE: event.END_DATE,
          CONTENT: event.CONTENT,
          USER_CODE: event.USER_CODE,
          COLOR: event.COLOR,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
      setNewEvent({
        title: "",
        startDate: "",
        endDate: "",
        description: "",
        color: generateRandomHexColor(),
      });
      setShowAddEvent(false);
    },
  });

  // 이벤트 수정 뮤테이션
  const editEventMutation = useMutation<void, Error, SCHEDULE>({
    mutationFn: async (event: SCHEDULE) => {
      if (!user) throw new Error("사용자 정보가 없습니다.");

      let query = (supabase as any)
        .from("SCHEDULE")
        .update({
          TITLE: event.TITLE,
          START_DATE: event.START_DATE,
          END_DATE: event.END_DATE,
          CONTENT: event.CONTENT,
          COLOR: event.COLOR,
        })
        .eq("ID", event.ID);

      if (!isScheduleAdmin) {
        query = query.eq("USER_CODE", user.USER_CODE);
      }

      const { data, error } = await query.select("ID");
      if (error) throw error;
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("수정 권한이 없거나 일정을 찾을 수 없습니다.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
      setEditingEvent(null);
      setIsEditMode(false);
      setSelectedEvent(null);
    },
    onError: (error) => {
      toast({
        title: "일정 수정 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 이벤트 삭제 뮤테이션
  const deleteEventMutation = useMutation<void, Error, SCHEDULE>({
    mutationFn: async (event: SCHEDULE) => {
      if (!user) throw new Error("사용자 정보가 없습니다.");

      let query = supabase.from("SCHEDULE").delete().eq("ID", event.ID);

      if (!isScheduleAdmin) {
        query = query.eq("USER_CODE", user.USER_CODE);
      }

      const { data, error } = await query.select("ID");
      if (error) throw error;
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("삭제 권한이 없거나 일정을 찾을 수 없습니다.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
      setSelectedEvent(null);
      setEditingEvent(null);
      setIsEditMode(false);
    },
    onError: (error) => {
      toast({
        title: "일정 삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const latestMeeting = meetingNotes[0] || null;

  const todayStr = new Date().toISOString().split("T")[0];
  const [, todayMonthPart, todayDayPart] = todayStr.split("-");
  const todayMonthDay = `${todayMonthPart}-${todayDayPart}`;

  const feastLabelsByMonthDay = useMemo(() => {
    const map = new Map<string, string[]>();

    students.forEach((student) => {
      if (!student.NAME_DAY) return;

      const [monthPart, dayPart] = student.NAME_DAY.split("-");
      const feastMonth = Number(monthPart);
      const feastDay = Number(dayPart);
      const monthKey = String(feastMonth).padStart(2, "0");
      const dayKey = String(feastDay).padStart(2, "0");
      const monthDayKey = `${monthKey}-${dayKey}`;
      const feastLabel = `${student.NAME}${student.BAP_NAME ? ` ${student.BAP_NAME}` : ""} 축일`;

      if (!Number.isFinite(feastMonth) || !Number.isFinite(feastDay)) {
        return;
      }

      const existing = map.get(monthDayKey) || [];
      existing.push(feastLabel);
      map.set(monthDayKey, existing);
    });

    return map;
  }, [students]);

  const calendarEvents = useMemo<EventInput[]>(
    () =>
      events.map((event) => {
        const eventColor = normalizeHexColor(event.COLOR);

        return {
          id: event.ID,
          title: event.TITLE,
          start: event.START_DATE,
          end: toExclusiveEndDate(event.END_DATE),
          allDay: true,
          backgroundColor: eventColor,
          borderColor: eventColor,
          textColor: getContrastingTextColor(eventColor),
          extendedProps: {
            schedule: event,
            isMultiDay: event.START_DATE < event.END_DATE,
          },
        };
      }),
    [events],
  );

  const holidayDateSet = useMemo(() => {
    const holidayDates = new Set<string>();

    events.forEach((event) => {
      const isHolidayEvent = /(공휴일|대체공휴일|대체휴일)/.test(event.TITLE);
      if (!isHolidayEvent) return;

      let cursor = event.START_DATE;
      while (cursor <= event.END_DATE) {
        holidayDates.add(cursor);
        cursor = shiftDateString(cursor, 1);
      }
    });

    return holidayDates;
  }, [events]);

  const todayEvents = events.filter(
    (e) => e.START_DATE <= todayStr && todayStr <= e.END_DATE,
  );
  const todayFeastLabels = feastLabelsByMonthDay.get(todayMonthDay) || [];
  const canManageSelectedEvent = canManageSchedule(selectedEvent);

  const handleAddEvent = () => {
    if (!user) {
      toast({
        title: "일정 추가 실패",
        description: "로그인 사용자 정보가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    if (!newEvent.title || !newEvent.startDate || !newEvent.endDate) return;
    if (newEvent.endDate < newEvent.startDate) {
      toast({
        title: "날짜 오류",
        description: "종료일은 시작일보다 이전일 수 없습니다.",
        variant: "destructive",
      });
      return;
    }
    const event: SCHEDULE = {
      ID: Date.now().toString(),
      TITLE: newEvent.title,
      START_DATE: newEvent.startDate,
      END_DATE: newEvent.endDate,
      CONTENT: newEvent.description,
      USER_CODE: user.USER_CODE,
      COLOR: normalizeHexColor(newEvent.color),
    };
    addEventMutation.mutate(event);
  };

  const handleDeleteSelectedEvent = () => {
    if (!selectedEvent) return;

    if (!canManageSchedule(selectedEvent)) {
      toast({
        title: "권한 없음",
        description: "등록자 또는 관리자만 삭제할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    if (confirm("일정을 삭제하시겠습니까?")) {
      deleteEventMutation.mutate(selectedEvent);
    }
  };

  const handleSaveEditingEvent = () => {
    if (!editingEvent) return;

    if (!canManageSchedule(editingEvent)) {
      toast({
        title: "권한 없음",
        description: "등록자 또는 관리자만 수정할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    if (editingEvent.END_DATE < editingEvent.START_DATE) {
      toast({
        title: "날짜 오류",
        description: "종료일은 시작일보다 이전일 수 없습니다.",
        variant: "destructive",
      });
      return;
    }
    editEventMutation.mutate({
      ...editingEvent,
      COLOR: normalizeHexColor(editingEvent.COLOR),
    });
  };

  const handleCalendarEventClick = (clickInfo: EventClickArg) => {
    const schedule = clickInfo.event.extendedProps.schedule as
      | SCHEDULE
      | undefined;
    if (!schedule) return;
    setSelectedEvent(schedule);
  };

  const saveMovedOrResizedEvent = async (
    schedule: SCHEDULE,
    startDate: string,
    exclusiveEndDate: string | null,
    revert: () => void,
  ) => {
    if (!canManageSchedule(schedule)) {
      toast({
        title: "권한 없음",
        description: "등록자 또는 관리자만 일정을 이동할 수 있습니다.",
        variant: "destructive",
      });
      revert();
      return;
    }

    const nextEvent: SCHEDULE = {
      ...schedule,
      START_DATE: startDate,
      END_DATE: toInclusiveEndDate(startDate, exclusiveEndDate),
    };

    try {
      await editEventMutation.mutateAsync(nextEvent);
    } catch {
      revert();
    }
  };

  const handleCalendarEventDrop = async (dropInfo: EventDropArg) => {
    const schedule = dropInfo.event.extendedProps.schedule as
      | SCHEDULE
      | undefined;

    if (!schedule || !dropInfo.event.startStr) {
      dropInfo.revert();
      return;
    }

    await saveMovedOrResizedEvent(
      schedule,
      dropInfo.event.startStr,
      dropInfo.event.endStr,
      dropInfo.revert,
    );
  };

  const handleCalendarEventResize = async (resizeInfo: EventResizeDoneArg) => {
    const schedule = resizeInfo.event.extendedProps.schedule as
      | SCHEDULE
      | undefined;

    if (!schedule || !resizeInfo.event.startStr) {
      resizeInfo.revert();
      return;
    }

    await saveMovedOrResizedEvent(
      schedule,
      resizeInfo.event.startStr,
      resizeInfo.event.endStr,
      resizeInfo.revert,
    );
  };

  const renderDayCellContent = (arg: DayCellContentArg) => {
    const monthDayKey = `${String(arg.date.getMonth() + 1).padStart(2, "0")}-${String(arg.date.getDate()).padStart(2, "0")}`;
    const feastLabels = feastLabelsByMonthDay.get(monthDayKey) || [];

    return (
      <div className="fc-daycell-custom">
        <span className="fc-daycell-date">{arg.date.getDate()}</span>
        {feastLabels.length > 0 && (
          <>
            <p className="fc-feast-label">{feastLabels[0]}</p>
            {feastLabels.length > 1 && (
              <p className="fc-feast-more">+{feastLabels.length - 1}</p>
            )}
          </>
        )}
      </div>
    );
  };

  const getDayCellClassNames = (arg: { date: Date }) => {
    const dateKey = `${arg.date.getFullYear()}-${String(arg.date.getMonth() + 1).padStart(2, "0")}-${String(arg.date.getDate()).padStart(2, "0")}`;
    const classNames: string[] = [];
    const dayOfWeek = arg.date.getDay();

    if (dayOfWeek === 6) classNames.push("fc-day-saturday-custom");
    if (dayOfWeek === 0) classNames.push("fc-day-sunday-custom");
    if (holidayDateSet.has(dateKey)) classNames.push("fc-day-holiday");

    return classNames;
  };

  const handleTabChange = (tab: string) => {
    if (onTabChange) {
      onTabChange(tab);
      return;
    }

    navigate(`/${tab}`);
  };

  const handleAddEventDialogOpenChange = (open: boolean) => {
    setShowAddEvent(open);
    if (!open) return;

    setNewEvent((prev) => ({
      ...prev,
      color: generateRandomHexColor(),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Admin notice */}
      {/* <div className="card-classic p-4"> */}
      {adminNotificationsLoading ? (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : adminNotifications.length > 0 ? (
        <div
          className="rich-html font-bold"
          style={{ color: "#2563eb" }}
          dangerouslySetInnerHTML={{
            __html: toRenderableHtml(adminNotifications[0].CONTENT),
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground"> 업데이트가 없습니다. </p>
      )}
      {/* </div> */}

      {/* Chairman Notifications */}
      <div className="card-classic p-5">
        <button
          onClick={() => handleTabChange("notifications")}
          className="font-heading font-semibold text-lg mb-3 hover:text-primary transition-colors cursor-pointer flex items-center gap-2 group"
        >
          📢 공지사항
          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        {chairmanNotificationsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : chairmanNotifications.length > 0 ? (
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-sm flex-1">
                {chairmanNotifications[0].TITLE}
              </h4>
              <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                {new Date(
                  chairmanNotifications[0].CREATED_AT,
                ).toLocaleDateString("ko-KR")}
              </span>
            </div>
            <div
              className="rich-html text-foreground/80 mb-2"
              dangerouslySetInnerHTML={{
                __html: toRenderableHtml(chairmanNotifications[0].CONTENT),
              }}
            />
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            공지사항이 없습니다.
          </p>
        )}
      </div>

      {/* Calendar */}
      <div className="card-classic p-5">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h3 className="font-heading font-semibold text-base sm:text-lg">
            📅 일정
          </h3>
          <div className="flex items-center gap-1 sm:gap-2">
            <Dialog
              open={showAddEvent}
              onOpenChange={handleAddEventDialogOpenChange}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">일정 추가</span>
                  <span className="sm:hidden">추가</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-heading">일정 추가</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>제목</Label>
                    <Input
                      value={newEvent.title}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, title: e.target.value })
                      }
                      placeholder="일정 제목"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>시작일</Label>
                    <Input
                      type="date"
                      value={newEvent.startDate}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>종료일</Label>
                    <Input
                      type="date"
                      value={newEvent.endDate}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, endDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>설명</Label>
                    <Textarea
                      value={newEvent.description}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          description: e.target.value,
                        })
                      }
                      placeholder="일정 설명 (선택)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>색상</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={normalizeHexColor(newEvent.color)}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, color: e.target.value })
                        }
                        className="h-10 w-16 p-1"
                      />
                      <Input
                        value={newEvent.color}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, color: e.target.value })
                        }
                        onBlur={(e) =>
                          setNewEvent({
                            ...newEvent,
                            color: normalizeHexColor(e.target.value),
                          })
                        }
                        placeholder="#3B82F6"
                        className="font-mono uppercase"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleAddEvent}
                    className="w-full"
                    disabled={addEventMutation.isPending}
                  >
                    {addEventMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        추가 중...
                      </>
                    ) : (
                      "추가"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {eventsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={koLocale}
              height="auto"
              fixedWeekCount={false}
              editable
              eventStartEditable
              eventDurationEditable
              eventDisplay="block"
              displayEventTime={false}
              dayMaxEventRows={3}
              headerToolbar={{
                left: "prev",
                center: "title",
                right: "next",
              }}
              buttonText={{ today: "오늘" }}
              events={calendarEvents}
              dayCellContent={renderDayCellContent}
              dayCellClassNames={getDayCellClassNames}
              eventClick={handleCalendarEventClick}
              eventDrop={handleCalendarEventDrop}
              eventResize={handleCalendarEventResize}
              eventClassNames={(arg) =>
                arg.event.extendedProps.isMultiDay
                  ? ["fc-event-multi-day"]
                  : ["fc-event-single-day"]
              }
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
        {/* Today's Schedule */}
        <div className="card-classic p-5 md:col-span-4">
          <h3 className="font-heading font-semibold text-base sm:text-lg mb-4">
            📌 오늘 일정
          </h3>
          {eventsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : todayEvents.length > 0 || todayFeastLabels.length > 0 ? (
            <div className="space-y-2">
              {todayFeastLabels.map((feastLabel) => (
                <div
                  key={feastLabel}
                  className="rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5"
                >
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-primary/70">
                    축일
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground/85">
                    {feastLabel}
                  </p>
                </div>
              ))}
              {todayEvents.map((event) => (
                <button
                  key={event.ID}
                  onClick={() => setSelectedEvent(event)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <p className="font-semibold text-base text-foreground">
                    {event.TITLE}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">
              오늘 일정이 없습니다.
            </p>
          )}
        </div>

        {/* Daily Missa Scraping */}
        <div className="card-classic p-5 md:col-span-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <button
              type="button"
              className="font-heading font-semibold text-base sm:text-lg hover:text-primary transition-colors cursor-pointer flex items-center gap-2 group"
              onClick={() => {
                const sourceUrl = normalizeExternalUrl(dailyMissa?.url ?? "");
                if (!sourceUrl) return;
                window.open(sourceUrl, "_blank", "noopener,noreferrer");
              }}
            >
              ✝️ 매일미사
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <div className="flex items-center gap-2">
              <Label htmlFor="daily-missa-date" className="text-sm">
                날짜
              </Label>
              <Input
                id="daily-missa-date"
                type="date"
                value={dailyMissaDate}
                onChange={(e) => setDailyMissaDate(e.target.value)}
                className="w-[170px]"
              />
            </div>
          </div>

          {!dailyMissaDate ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              날짜를 선택하면 자동으로 조회됩니다.
            </p>
          ) : dailyMissaLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : dailyMissaError ? (
            <p className="text-sm text-destructive py-2">
              {dailyMissaError.message}
            </p>
          ) : dailyMissa && dailyMissa.gospelSectionTexts.length > 0 ? (
            <div className="space-y-3">
              <div className="border border-border rounded-lg p-4">
                <pre className="text-sm whitespace-pre-wrap font-body text-foreground/80">
                  {dailyMissa.missaTitle || "제목이 없습니다."}
                  <br />
                  {dailyMissa.gospelHeaderTexts.join("\n") ||
                    "복음이 없습니다."}
                </pre>
              </div>
              <div className="border border-border rounded-lg p-4">
                <pre className="text-sm whitespace-pre-wrap font-body text-foreground/80">
                  {dailyMissa.gospelStartTexts.join("\n")}
                  <br />
                  {dailyMissa.gospelSectionTexts.join("\n\n")}
                </pre>
              </div>
              {dailyMissaFetching && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />새 날짜로 조회
                  중...
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">
              해당 날짜의 복음 텍스트가 없습니다.
            </p>
          )}
        </div>
      </div>

      {/* Event Detail */}
      <Dialog
        open={!!selectedEvent && !isEditMode}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">일정 상세</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">
                  제목
                </p>
                <p className="font-medium text-base">{selectedEvent.TITLE}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">
                  기간
                </p>
                <p className="text-sm">
                  {selectedEvent.START_DATE === selectedEvent.END_DATE
                    ? selectedEvent.START_DATE
                    : `${selectedEvent.START_DATE} ~ ${selectedEvent.END_DATE}`}
                </p>
              </div>
              <div>
                <hr />
              </div>
              <div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                  {selectedEvent.CONTENT || "내용이 없습니다."}
                </p>
              </div>
              {canManageSelectedEvent && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingEvent(selectedEvent);
                      setIsEditMode(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    수정
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={handleDeleteSelectedEvent}
                    disabled={deleteEventMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    {deleteEventMutation.isPending ? "삭제 중..." : "삭제"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Event Edit */}
      <Dialog
        open={isEditMode && !!editingEvent}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditMode(false);
            setEditingEvent(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">일정 수정</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>제목</Label>
                <Input
                  value={editingEvent.TITLE}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, TITLE: e.target.value })
                  }
                  placeholder="일정 제목"
                />
              </div>
              <div className="space-y-2">
                <Label>시작일</Label>
                <Input
                  type="date"
                  value={editingEvent.START_DATE}
                  onChange={(e) =>
                    setEditingEvent({
                      ...editingEvent,
                      START_DATE: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>종료일</Label>
                <Input
                  type="date"
                  value={editingEvent.END_DATE}
                  onChange={(e) =>
                    setEditingEvent({
                      ...editingEvent,
                      END_DATE: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={editingEvent.CONTENT}
                  onChange={(e) =>
                    setEditingEvent({
                      ...editingEvent,
                      CONTENT: e.target.value,
                    })
                  }
                  placeholder="일정 설명 (선택)"
                />
              </div>
              <div className="space-y-2">
                <Label>색상</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={normalizeHexColor(editingEvent.COLOR)}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        COLOR: e.target.value,
                      })
                    }
                    className="h-10 w-16 p-1"
                  />
                  <Input
                    value={editingEvent.COLOR || ""}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        COLOR: e.target.value,
                      })
                    }
                    onBlur={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        COLOR: normalizeHexColor(e.target.value),
                      })
                    }
                    placeholder="#3B82F6"
                    className="font-mono uppercase"
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveEditingEvent}
                className="w-full"
                disabled={
                  editEventMutation.isPending ||
                  !canManageSchedule(editingEvent)
                }
              >
                {editEventMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "저장"
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Latest Meeting Note */}
      <div className="card-classic p-5">
        <button
          onClick={() => handleTabChange("meetings")}
          className="font-heading font-semibold text-lg mb-3 hover:text-primary transition-colors cursor-pointer flex items-center gap-2 group"
        >
          📝 최근 회의록
          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        {meetingLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : latestMeeting ? (
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{latestMeeting.TITLE}</h4>
              <span className="text-xs text-muted-foreground">
                {latestMeeting.DATE.split("T")[0]}
              </span>
            </div>
            <div
              className="rich-html font-body text-foreground/80"
              dangerouslySetInnerHTML={{
                __html: toRenderableHtml(latestMeeting.CONTENT),
              }}
            />
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            회의록이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
