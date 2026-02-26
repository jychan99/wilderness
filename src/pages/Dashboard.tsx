import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarEvent } from '@/types';
import { mockEvents, mockMeetingNotes } from '@/data/mockData';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const Dashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(mockEvents);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', description: '' });

  const latestMeeting = mockMeetingNotes[0];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) return;
    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: newEvent.title,
      date: newEvent.date,
      description: newEvent.description,
    };
    setEvents([...events, event]);
    setNewEvent({ title: '', date: '', description: '' });
    setShowAddEvent(false);
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <div className="card-classic p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-lg">
            {year}년 {month + 1}월
          </h3>
          <div className="flex items-center gap-2">
            <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  일정 추가
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
                  <Button onClick={handleAddEvent} className="w-full">추가</Button>
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

        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {weekDays.map((day) => (
            <div key={day} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          {days.map((day, i) => (
            <div
              key={i}
              className={`bg-card min-h-[80px] p-1.5 ${day ? '' : 'bg-muted/50'}`}
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
                        key={event.id}
                        className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary truncate"
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Latest Meeting Note */}
      {latestMeeting && (
        <div className="card-classic p-5">
          <h3 className="font-heading font-semibold text-lg mb-3">최신 회의록</h3>
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{latestMeeting.title}</h4>
              <span className="text-xs text-muted-foreground">{latestMeeting.date}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">작성자: {latestMeeting.author}</p>
            <pre className="text-sm whitespace-pre-wrap font-body text-foreground/80">
              {latestMeeting.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
