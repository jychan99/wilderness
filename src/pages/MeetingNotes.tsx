import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { MEETING } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, ArrowLeft } from 'lucide-react';

const MeetingNotes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showWrite, setShowWrite] = useState(false);
  const [selectedNote, setSelectedNote] = useState<MEETING | null>(null);
  const [form, setForm] = useState({ TITLE: '', CONTENT: '' });

  // 회의록 조회 (MEETING 테이블)
  const { data: notes = [] } = useQuery<MEETING[], Error>({
    queryKey: ['meetings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('MEETING')
        .select('*')
        .order('DATE', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // 회의록 작성 뮤테이션
  const submitNoteMutation = useMutation({
    mutationFn: async (newNote: Omit<MEETING, 'ID' | 'DATE'>) => {
      const { error } = await (supabase as any).from('MEETING').insert([newNote]);
      if (error) {
        console.error('회의록 작성 에러:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setForm({ TITLE: '', CONTENT: '' });
      setShowWrite(false);
    },
    onError: (error: any) => {
      console.error('Mutation 실패:', error);
    },
  });

  if (!user) return null;

  // 관리자 또는 특정 직책만 작성 가능
  const isAdmin = Number(user.position) === 0 || user.role === 'admin';

  // 오늘 날짜 (로컬 시간대 기준)
  const today = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  const formatDateOnly = (dateStr: string) => {
    return dateStr.split('T')[0].split(' ')[0];
  };

  const formatDateTime = (dateStr: string) => {
    const datePart = dateStr.split('T')[0].split(' ')[0];
    const timePart = dateStr.includes('T') ? dateStr.split('T')[1] : dateStr.split(' ')[1] || '';
    const hhmm = timePart ? timePart.slice(0, 5) : '';
    return hhmm ? `${datePart} ${hhmm}` : datePart;
  };

  // 날짜별 그룹화
  const groupedNotes = useMemo(() => {
    const groups: { [date: string]: MEETING[] } = {};
    notes.forEach(note => {
      const dateKey = formatDateOnly(note.DATE);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(note);
    });
    return groups;
  }, [notes]);

  // 날짜 정렬 (최근이 위로)
  const sortedDates = useMemo(() => {
    return Object.keys(groupedNotes).sort((a, b) => b.localeCompare(a));
  }, [groupedNotes]);

  const handleSubmit = () => {
    if (!form.TITLE || !form.CONTENT) return;

    submitNoteMutation.mutate({
      TITLE: form.TITLE,
      CONTENT: form.CONTENT,
      AUTHOR: user?.name || '관리자',
      // DATE 제거 (DB default NOW())
    });
  };

  if (selectedNote) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedNote(null)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          목록으로
        </Button>
        <div className="card-classic p-6">
          <h2 className="font-heading text-xl font-bold mb-2">{selectedNote.TITLE}</h2>
          <div className="flex gap-4 text-sm text-muted-foreground mb-4">
            <span>작성자: {selectedNote.AUTHOR}</span>
            <span>{formatDateTime(selectedNote.DATE)}</span>
          </div>
          <hr className="border-border mb-4" />
          <pre className="text-sm whitespace-pre-wrap font-body leading-relaxed text-foreground/85">
            {selectedNote.CONTENT}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">총 {notes.length}건</p>
        {isAdmin && (
          <Dialog open={showWrite} onOpenChange={setShowWrite}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                회의록 작성
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-heading">회의록 작성</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>제목</Label>
                  <Input
                    value={form.TITLE}
                    onChange={e => setForm({ ...form, TITLE: e.target.value })}
                    placeholder="회의록 제목"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>내용</Label>
                  <Textarea
                    value={form.CONTENT}
                    onChange={e => setForm({ ...form, CONTENT: e.target.value })}
                    placeholder="회의 내용을 작성하세요"
                    className="min-h-[200px]"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">작성 완료</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {sortedDates.map(date => (
          <div key={date} className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
              <span className="text-sm font-semibold text-primary">{formatDateOnly(date)}</span>
            </div>
            {groupedNotes[date].map(note => (
              <button
                key={note.ID}
                onClick={() => setSelectedNote(note)}
                className="w-full text-left card-classic p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{note.TITLE}</h4>
                        {note.DATE.startsWith(today) && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            NEW
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {note.AUTHOR} · {formatDateTime(note.DATE)}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MeetingNotes;
