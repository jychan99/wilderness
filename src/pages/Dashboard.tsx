import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SCHEDULE, MEETING, NOTIFICATION } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const Dashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', description: '' });
  const queryClient = useQueryClient();

  // 캘린더 이벤트 조회
  const { data: events = [], isLoading: eventsLoading } = useQuery<SCHEDULE[], Error>({
    queryKey: ['calendar_events'],
    queryFn: async (): Promise<SCHEDULE[]> => {
      const { data, error } = await supabase
        .from('SCHEDULE')
        .select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // 회의록 조회
  const { data: meetingNotes = [], isLoading: meetingLoading } = useQuery<MEETING[], Error>({
    queryKey: ['meeting_notes'],
    queryFn: async (): Promise<MEETING[]> => {
      const { data, error } = await supabase
        .from('MEETING')
        .select('*')
        .order('DATE', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data || [];
    },
  });

  // 공지사항 조회
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<NOTIFICATION[], Error>({
    queryKey: ['notifications'],
    queryFn: async (): Promise<NOTIFICATION[]> => {
      const { data, error } = await supabase
        .from('NOTIFICATION')
        .select('*')
        .order('CREATED_AT', { ascending: false })  
        .limit(1);
      if (error) throw error;
      return data || [];
    },
  });

  // 이벤트 추가 뮤테이션
  const addEventMutation = useMutation<void, Error, SCHEDULE>({
    mutationFn: async (event: SCHEDULE) => {
      const { error } = await (supabase as any).from('SCHEDULE').insert([
        {
          ID: event.ID,
          TITLE: event.TITLE,
          DATE: event.DATE,
          CONTENT: event.CONTENT,
        }
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar_events'] });
      setNewEvent({ title: '', date: '', description: '' });
      setShowAddEvent(false);
    },
  });

  const latestMeeting = meetingNotes[0] || null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.DATE === dateStr);
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) return;
    const event: SCHEDULE = {
      ID: Date.now().toString(),
      TITLE: newEvent.title,
      DATE: newEvent.date,
      CONTENT: newEvent.description,
    };
    addEventMutation.mutate(event);
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="space-y-6">

      {/* Calendar */}
      <div className="card-classic p-5">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h3 className="font-heading font-semibold text-base sm:text-lg">
            📅 {year}년 {month + 1}월
          </h3>
          <div className="flex items-center gap-1 sm:gap-2">
            <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
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
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="일정 제목"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>날짜</Label>
                    <Input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>설명</Label>
                    <Textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder="일정 설명 (선택)"
                    />
                  </div>
                  <Button onClick={handleAddEvent} className="w-full" disabled={addEventMutation.isPending}>
                    {addEventMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        추가 중...
                      </>
                    ) : (
                      '추가'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {eventsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {weekDays.map((day) => (
              <div key={day} className="bg-muted p-1 sm:p-2 text-center text-[10px] sm:text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {days.map((day, i) => (
              <div
                key={i}
                className={`bg-card min-h-[48px] sm:min-h-[80px] p-1 sm:p-1.5 ${day ? '' : 'bg-muted/50'}`}
              >
                {day && (
                  <>
                    <span className={`text-xs font-medium ${
                      i % 7 === 0 ? 'text-destructive' : i % 7 === 6 ? 'text-primary' : 'text-foreground'
                    }`}>
                      {day}
                    </span>
                    <div className="mt-0.5 space-y-0.5">
                      {getEventsForDay(day).map((event) => (
                        <div
                          key={event.ID}
                          className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary truncate"
                          title={event.TITLE}
                        >
                          {event.TITLE}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latest Meeting Note */}
      <div className="card-classic p-5">
        <h3 className="font-heading font-semibold text-lg mb-3">📝 최근 회의록</h3>
        {meetingLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : latestMeeting ? (
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{latestMeeting.TITLE}</h4>
              <span className="text-xs text-muted-foreground">{latestMeeting.DATE}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">작성자: {latestMeeting.AUTHOR}</p>
            <pre className="text-sm whitespace-pre-wrap font-body text-foreground/80">
              {latestMeeting.CONTENT}
            </pre>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">회의록이 없습니다.</p>
        )}
      </div>

      {/* Notifications */}
      <div className="card-classic p-5">
        <h3 className="font-heading font-semibold text-lg mb-3">📢 공지사항</h3>
        {notificationsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : notifications.length > 0 ? (
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-sm flex-1">{notifications[0].TITLE}</h4>
              <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                {new Date(notifications[0].CREATED_AT).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <p className="text-sm text-foreground/80 mb-2">{notifications[0].CONTENT}</p>
            <p className="text-xs text-muted-foreground">작성자: {notifications[0].AUTHOR}</p>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">공지사항이 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
