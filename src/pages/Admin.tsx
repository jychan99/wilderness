import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { USERMAIN, Position, Grade } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, Trash2 } from 'lucide-react';

const Admin = () => {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    baptismalName: '',
    username: '',
    password: '',
    position: '' as Position,
    grade: '' as Grade | '',
  });

  const positions: Position[] = ['회장', '부회장', '총무', '서기', '일반'];
  const grades: Grade[] = ['모든학년', '유치부', '초등부', '중등부', '고등부'];

  // 직책을 숫자로 변환
  const positionToNumber = (position: Position | ''): number => {
    const positionMap: { [key: string]: number } = {
      '관리자': 0,
      '회장': 1,
      '부회장': 2,
      '총무': 3,
      '서기': 4,
      '일반': 5,
    };
    return positionMap[position] || 5;
  };

  // 숫자를 직책으로 변환
  const numberToPosition = (num: number | string): string => {
    const numberMap: { [key: number]: string } = {
      0: '관리자',
      1: '회장',
      2: '부회장',
      3: '총무',
      4: '서기',
      5: '일반',
    };
    const numValue = typeof num === 'string' ? parseInt(num) : num;
    return numberMap[numValue] || '일반';
  };

  // 학년을 숫자로 변환
  const gradeToNumber = (grade: Grade | ''): number => {
    const gradeMap: { [key: string]: number } = {
      '모든학년': 0,
      '유치부': 1,
      '초등부': 2,
      '중등부': 3,
      '고등부': 4,
    };
    return gradeMap[grade] || 0;
  };

  // 숫자를 학년으로 변환
  const numberToGrade = (num: number | string): string => {
    const numberMap: { [key: number]: string } = {
      0: '모든학년',
      1: '유치부',
      2: '초등부',
      3: '중등부',
      4: '고등부',
    };
    const numValue = typeof num === 'string' ? parseInt(num) : num;
    return numberMap[numValue] || '모든학년';
  };

  // 사용자 목록 조회
  const { data: users = [] } = useQuery<USERMAIN[], Error>({
    queryKey: ['usermain'],
    queryFn: async () => {
      const { data, error } = await supabase.from('USERMAIN').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // 관리자만 필터링 (POSITION이 숫자 0)
  const admins = users.filter(u => u.POSITION === 0);

  // 사용자 추가 mutation
  const addUserMutation = useMutation({
    mutationFn: async (newUser: Omit<USERMAIN, 'USER_CODE'>) => {
      console.log('Inserting user:', newUser);
      const { data, error } = await (supabase as any).from('USERMAIN').insert([newUser]);
      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      console.log('Insert success:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usermain'] });
      setForm({ name: '', baptismalName: '', username: '', password: '', position: '' as Position, grade: '' });
      setShowAdd(false);
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      alert('사용자 추가 중 오류가 발생했습니다: ' + (error as any).message);
    },
  });

  // 사용자 삭제 mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (USER_CODE: string) => {
      const { error } = await supabase.from('USERMAIN').delete().eq('USER_CODE', USER_CODE);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usermain'] });
    },
  });

  const handleAdd = () => {
    if (!form.name || !form.username || !form.password || !form.position || !form.grade) return;

    const newUser: Omit<USERMAIN, 'USER_CODE'> = {
      // USER_CODE 제거 - Supabase에서 자동 생성
      ID: form.username,
      NAME: form.name,
      BAP_NAME: form.baptismalName,
      PASSWORD: form.password,
      POSITION: positionToNumber(form.position),
      MANAGE_GRADE: form.position === '회장' ? gradeToNumber('모든학년') : gradeToNumber(form.grade as Grade),
    };

    addUserMutation.mutate(newUser as any);
  };

  const handleDelete = (USER_CODE: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    deleteUserMutation.mutate(USER_CODE);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">등록된 사용자: {admins.length}명</p>
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
        {admins.map(u => (
          <div key={u.USER_CODE} className="card-classic p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{u.NAME} <span className="text-muted-foreground">({u.BAP_NAME})</span></p>
                <p className="text-xs text-muted-foreground">{numberToPosition(u.POSITION)} · {numberToGrade(u.MANAGE_GRADE)} · @{u.ID}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(u.USER_CODE)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
        {admins.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            등록된 사용자가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
