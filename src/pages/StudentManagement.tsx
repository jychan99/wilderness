import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Student, AttendanceRecord, Grade } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StudentManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [form, setForm] = useState({ name: '', grade: '' as Grade | '', phone: '', parentPhone: '', notes: '' });

  // 학생 조회
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // 출석 조회
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance_records'],
    queryFn: async () => {
      const { data, error } = await supabase.from('attendance_records').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // 학생 추가
  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: Student) => {
      const { error } = await supabase.from('students').insert([newStudent]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setForm({ name: '', grade: '', phone: '', parentPhone: '', notes: '' });
      setShowAdd(false);
    },
  });

  // 학생 수정
  const editStudentMutation = useMutation({
    mutationFn: async (updatedStudent: Student) => {
      const { error } = await supabase
        .from('students')
        .update(updatedStudent)
        .eq('id', updatedStudent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setEditingStudent(null);
    },
  });

  // 학생 삭제
  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  // 출석 토글
  const toggleAttendanceMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const existing = attendance.find(a => a.student_id === studentId && a.date === attendanceDate);
      if (existing) {
        const { error } = await supabase
          .from('attendance_records')
          .update({ present: !existing.present })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('attendance_records').insert([{
          student_id: studentId,
          date: attendanceDate,
          present: true,
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance_records'] });
    },
  });

  const filteredStudents = useMemo(() => {
    if (!user) return [];
    return user.grade === '모든학년' ? students : students.filter(s => s.grade === user.grade);
  }, [user, students]);

  const attendanceStats = useMemo(() => {
    return filteredStudents.map(student => {
      const records = attendance.filter(a => a.student_id === student.id);
      const total = records.length;
      const present = records.filter(a => a.present).length;
      return {
        name: student.name,
        출석률: total > 0 ? Math.round((present / total) * 100) : 0,
        출석: present,
        결석: total - present,
      };
    });
  }, [filteredStudents, attendance]);

  if (!user) return null;

  const grades: Grade[] = ['유치부', '초등부', '중등부', '고등부'];

  const handleAdd = () => {
    if (!form.name || !form.grade) return;
    const newStudent: Student = {
      id: Date.now().toString(),
      name: form.name,
      grade: form.grade as Grade,
      phone: form.phone,
      parentPhone: form.parentPhone,
      notes: form.notes,
    };
    addStudentMutation.mutate(newStudent);
  };

  const handleEdit = () => {
    if (!editingStudent) return;
    editStudentMutation.mutate(editingStudent);
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteStudentMutation.mutate(id);
    }
  };

  const toggleAttendance = (studentId: string) => {
    toggleAttendanceMutation.mutate(studentId);
  };

  const isPresent = (studentId: string) => {
    return attendance.find(a => a.student_id === studentId && a.date === attendanceDate)?.present || false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            담당: {user.grade === '모든학년' ? '전체 학년' : user.grade} · 총 {filteredStudents.length}명
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowStats(!showStats)}>
            <BarChart3 className="w-4 h-4 mr-1.5" />
            통계
          </Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                학생 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">학생 추가</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label>이름</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="학생 이름" />
                </div>
                <div className="space-y-1.5">
                  <Label>학년</Label>
                  <Select value={form.grade} onValueChange={v => setForm({ ...form, grade: v as Grade })}>
                    <SelectTrigger><SelectValue placeholder="학년 선택" /></SelectTrigger>
                    <SelectContent>
                      {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>전화번호</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" />
                </div>
                <div className="space-y-1.5">
                  <Label>학부모 연락처</Label>
                  <Input value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })} placeholder="010-0000-0000" />
                </div>
                <Button onClick={handleAdd} className="w-full">추가</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Attendance Stats Chart */}
      {showStats && (
        <div className="card-classic p-5">
          <h3 className="font-heading font-semibold mb-4">출석 통계</h3>
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 25%, 88%)" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="출석" fill="hsl(210, 55%, 38%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="결석" fill="hsl(0, 65%, 52%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Per-student attendance detail */}
          <h4 className="font-heading font-semibold text-sm mb-3">학생별 출석 기록</h4>
          <div className="space-y-2">
            {filteredStudents.map(student => {
              const records = attendance.filter(a => a.student_id === student.id).sort((a, b) => a.date.localeCompare(b.date));
              const isOpen = selectedStudent?.id === student.id;
              return (
                <div key={student.id} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setSelectedStudent(isOpen ? null : student)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div>
                      <span className="font-medium text-sm">{student.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{student.grade}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        출석 {records.filter(r => r.present).length}/{records.length}
                      </span>
                      <span className={`text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border p-3 bg-muted/20">
                      {records.length === 0 ? (
                        <p className="text-xs text-muted-foreground">출석 기록이 없습니다.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {records.map(record => (
                            <div
                              key={record.id}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium ${
                                record.present
                                  ? 'bg-success/10 text-success'
                                  : 'bg-destructive/10 text-destructive'
                              }`}
                            >
                              <span>{record.date}</span>
                              <span>{record.present ? '출석' : '결석'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attendance Check */}
      <div className="card-classic p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="font-heading font-semibold">출석 체크</h3>
          <Input
            type="date"
            value={attendanceDate}
            onChange={e => setAttendanceDate(e.target.value)}
            className="w-full sm:w-44"
          />
        </div>

        <div className="space-y-2">
          {filteredStudents.map(student => (
            <div
              key={student.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isPresent(student.id)}
                  onCheckedChange={() => toggleAttendance(student.id)}
                />
                <div>
                  <p className="font-medium text-sm">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.grade}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingStudent(student)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(student.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">학생 수정</DialogTitle>
          </DialogHeader>
          {editingStudent && (
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label>이름</Label>
                <Input value={editingStudent.name} onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>학년</Label>
                <Select value={editingStudent.grade} onValueChange={v => setEditingStudent({ ...editingStudent, grade: v as Grade })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>전화번호</Label>
                <Input value={editingStudent.phone || ''} onChange={e => setEditingStudent({ ...editingStudent, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>학부모 연락처</Label>
                <Input value={editingStudent.parentPhone || ''} onChange={e => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })} />
              </div>
              <Button onClick={handleEdit} className="w-full">저장</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentManagement;
