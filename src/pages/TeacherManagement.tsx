import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { USERMAIN, Position, Grade } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Save } from 'lucide-react';

const TeacherManagement = () => {
  const queryClient = useQueryClient();
  const [editedTeachers, setEditedTeachers] = useState<{ [key: string]: USERMAIN }>({});

  // 선생님 조회 (USERMAIN 테이블)
  const { data: teachers = [] } = useQuery<USERMAIN[], Error>({
    queryKey: ['usermain'],
    queryFn: async () => {
      const { data, error } = await supabase.from('USERMAIN').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // 일괄 저장 mutation
  const saveTeachersMutation = useMutation({
    mutationFn: async () => {
      for (const teacher of Object.values(editedTeachers)) {
        const { error } = await (supabase as any)
          .from('USERMAIN')
          .update({
            NAME: teacher.NAME,
            BAP_NAME: teacher.BAP_NAME,
            POSITION: teacher.POSITION,
            MANAGE_GRADE: teacher.MANAGE_GRADE,
          })
          .eq('USER_CODE', teacher.USER_CODE);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usermain'] });
      setEditedTeachers({});
    },
  });

  // 선생님 삭제
  const deleteTeacherMutation = useMutation({
    mutationFn: async (USER_CODE: string) => {
      const { error } = await supabase.from('USERMAIN').delete().eq('USER_CODE', USER_CODE);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usermain'] });
    },
  });

  const handleDelete = (USER_CODE: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteTeacherMutation.mutate(USER_CODE);
    }
  };

  const handleUpdateTeacher = (teacher: USERMAIN, field: string, value: string | number) => {
    setEditedTeachers(prev => ({
      ...prev,
      [teacher.USER_CODE]: {
        ...prev[teacher.USER_CODE] || teacher,
        [field]: value,
      },
    }));
  };

  const getCurrentTeacher = (teacher: USERMAIN): USERMAIN => {
    return editedTeachers[teacher.USER_CODE] || teacher;
  };

  const hasChanges = Object.keys(editedTeachers).length > 0;

  const positionOptions: Position[] = ['회장', '부회장', '총무', '서기', '일반'];
  const gradeOptions: Grade[] = ['모든학년', '유치부', '초등부', '중등부', '고등부'];

  // 직책을 숫자로 변환
  const positionToNumber = (position: string): number => {
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
  const gradeToNumber = (grade: string): number => {
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

  // 관리자(POSITION === 0)는 목록에서 제외
  const filteredTeachers = teachers.filter(t => t.POSITION !== 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">총 {filteredTeachers.length}명</p>
        <Button 
          onClick={() => saveTeachersMutation.mutate()} 
          disabled={!hasChanges || saveTeachersMutation.isPending}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          저장
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>세례명</TableHead>
              <TableHead>직책</TableHead>
              <TableHead>담당학년</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  선생님이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              filteredTeachers.map((teacher) => {
                const currentTeacher = getCurrentTeacher(teacher);

                return (
                  <TableRow key={teacher.USER_CODE}>
                    <TableCell className="font-medium">{currentTeacher.NAME}</TableCell>
                    <TableCell>{currentTeacher.BAP_NAME || '-'}</TableCell>
                    <TableCell>
                      <Select 
                        value={numberToPosition(String(currentTeacher.POSITION ?? 5))} 
                        onValueChange={v => handleUpdateTeacher(currentTeacher, 'POSITION', positionToNumber(v))}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="직책 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {positionOptions.map(pos => (
                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={numberToGrade(currentTeacher.MANAGE_GRADE || '0')} 
                        onValueChange={v => handleUpdateTeacher(currentTeacher, 'MANAGE_GRADE', gradeToNumber(v))}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="학년 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {gradeOptions.map(grade => (
                            <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(teacher.USER_CODE)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TeacherManagement;
