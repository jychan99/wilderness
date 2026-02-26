import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MeetingNote } from '@/types';
import { mockMeetingNotes } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FileText, ArrowLeft } from 'lucide-react';

const MeetingNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<MeetingNote[]>(mockMeetingNotes);
  const [showWrite, setShowWrite] = useState(false);
  const [selectedNote, setSelectedNote] = useState<MeetingNote | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });

  if (!user) return null;

  const canWrite = ['서기', '회장', '부회장'].includes(user.position);

  const handleSubmit = () => {
    if (!form.title || !form.content) return;
    const newNote: MeetingNote = {
      id: Date.now().toString(),
      title: form.title,
      content: form.content,
      author: user.name,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    setNotes([newNote, ...notes]);
    setForm({ title: '', content: '' });
    setShowWrite(false);
  };

  if (selectedNote) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedNote(null)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          목록으로
        </Button>
        <div className="card-classic p-6">
          <h2 className="font-heading text-xl font-bold mb-2">{selectedNote.title}</h2>
          <div className="flex gap-4 text-sm text-muted-foreground mb-4">
            <span>작성자: {selectedNote.author}</span>
            <span>{selectedNote.date}</span>
          </div>
          <hr className="border-border mb-4" />
          <pre className="text-sm whitespace-pre-wrap font-body leading-relaxed text-foreground/85">
            {selectedNote.content}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">총 {notes.length}건</p>
        {canWrite && (
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
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="회의록 제목"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>내용</Label>
                  <Textarea
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
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

      <div className="space-y-2">
        {notes.map(note => (
          <button
            key={note.id}
            onClick={() => setSelectedNote(note)}
            className="w-full text-left card-classic p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{note.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {note.author} · {note.date}
                  </p>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MeetingNotes;
