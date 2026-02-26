import { useState } from 'react';
import { User, Position, Grade } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, Trash2 } from 'lucide-react';

const Admin = () => {
  const [users, setUsers] = useState<User[]>(() => {
    const stored = localStorage.getItem('erp-users');
    if (stored) return JSON.parse(stored);
    return [];
  });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    baptismalName: '',
    username: '',
    password: '',
    position: '' as Position,
    grade: '' as Grade | '',
  });

  const positions: Position[] = ['회장', '부회장', '총무', '서기'];
  const grades: Grade[] = ['모든학년', '유치부', '초등부', '중등부', '고등부'];

  const handleAdd = () => {
    if (!form.name || !form.username || !form.password || !form.position || !form.grade) return;

    const newUser: User = {
      id: Date.now().toString(),
      name: form.name,
      baptismalName: form.baptismalName,
      username: form.username,
      password: form.password,
      role: 'teacher',
      position: form.position,
      grade: form.position === '회장' ? '모든학년' : form.grade as Grade,
    };

    const updated = [...users, newUser];
    setUsers(updated);

    // Also update the full user list in localStorage
    const allUsers = JSON.parse(localStorage.getItem('erp-users') || '[]');
    allUsers.push(newUser);
    localStorage.setItem('erp-users', JSON.stringify(allUsers));

    setForm({ name: '', baptismalName: '', username: '', password: '', position: '' as Position, grade: '' });
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    const allUsers = JSON.parse(localStorage.getItem('erp-users') || '[]');
    localStorage.setItem('erp-users', JSON.stringify(allUsers.filter((u: User) => u.id !== id)));
  };

  // Derive grade when position is 회장
  const effectiveGrade = form.position === '회장' ? '모든학년' : form.grade;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">등록된 사용자: {users.length}명</p>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              유저 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">유저 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>이름</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="이름" />
                </div>
                <div className="space-y-1.5">
                  <Label>세례명</Label>
                  <Input value={form.baptismalName} onChange={e => setForm({ ...form, baptismalName: e.target.value })} placeholder="세례명" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>아이디</Label>
                  <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="로그인 아이디" />
                </div>
                <div className="space-y-1.5">
                  <Label>비밀번호</Label>
                  <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="비밀번호" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>직책</Label>
                <Select value={form.position} onValueChange={v => setForm({ ...form, position: v as Position })}>
                  <SelectTrigger><SelectValue placeholder="직책 선택" /></SelectTrigger>
                  <SelectContent>
                    {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>담당학년</Label>
                {form.position === '회장' ? (
                  <Input value="모든학년" disabled />
                ) : (
                  <Select value={form.grade} onValueChange={v => setForm({ ...form, grade: v as Grade })}>
                    <SelectTrigger><SelectValue placeholder="학년 선택" /></SelectTrigger>
                    <SelectContent>
                      {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button onClick={handleAdd} className="w-full">추가</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* User list */}
      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="card-classic p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{u.name} <span className="text-muted-foreground">({u.baptismalName})</span></p>
                <p className="text-xs text-muted-foreground">{u.position} · {u.grade} · @{u.username}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(u.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
        {users.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            등록된 사용자가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
