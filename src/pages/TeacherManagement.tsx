import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { USER_MAIN, Position } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Trash2, Save } from "lucide-react";

type UserWithGrades = USER_MAIN & { MANAGE_GRADES: string[] };

const gradeGroups = [
  { label: "유치부", children: ["유치부"] },
  { label: "초등부", children: ["초1", "초2", "초3", "초4", "초5", "초6"] },
  { label: "중등부", children: ["중1", "중2", "중3"] },
  { label: "고등부", children: ["고1", "고2", "고3"] },
];

// 한글 학년명을 코드로 변환 (저장용)
const gradeToCode = (grade: string): string => {
  const gradeMap: { [key: string]: string } = {
    유치부: "K",
    초1: "E1",
    초2: "E2",
    초3: "E3",
    초4: "E4",
    초5: "E5",
    초6: "E6",
    중1: "M1",
    중2: "M2",
    중3: "M3",
    고1: "H1",
    고2: "H2",
    고3: "H3",
  };
  return gradeMap[grade] || grade;
};

// 코드를 한글 학년명으로 변환 (표시용)
const codeToLabel = (code: string): string => {
  const codeMap: { [key: string]: string } = {
    K: "유치부",
    E: "초등부",
    E1: "초1",
    E2: "초2",
    E3: "초3",
    E4: "초4",
    E5: "초5",
    E6: "초6",
    M: "중등부",
    M1: "중1",
    M2: "중2",
    M3: "중3",
    H: "고등부",
    H1: "고1",
    H2: "고2",
    H3: "고3",
  };
  if (codeMap[code]) return codeMap[code];
  
  // 레거시 숫자 코드 지원
  const legacyMap: { [key: string]: string } = {
    "0": "모든학년",
    "1": "유치부",
    "2": "초등부",
    "3": "초1",
    "4": "초2",
    "5": "초3",
    "6": "초4",
    "7": "초5",
    "8": "초6",
    "9": "중등부",
    "10": "중1",
    "11": "중2",
    "12": "중3",
    "13": "고등부",
    "14": "고1",
    "15": "고2",
    "16": "고3",
  };
  return legacyMap[code] || code;
};

const TeacherManagement = () => {
  const queryClient = useQueryClient();
  const [editedTeachers, setEditedTeachers] = useState<
    Record<string, UserWithGrades>
  >({});

  const { data: teachers = [] } = useQuery<UserWithGrades[], Error>({
    queryKey: ["usermain"],
    queryFn: async () => {
      const { data: userMainData, error: userMainError } = await supabase
        .from("USER_MAIN")
        .select("*");
      if (userMainError) throw userMainError;

      const { data: gradeData, error: gradeError } = await (supabase as any)
        .from("USER_MANAGE_GRADE")
        .select("USER_CODE, MANAGE_GRADE");
      if (gradeError) throw gradeError;

      return (userMainData || []).map((user: USER_MAIN) => {
        const grades = (gradeData || [])
          .filter((row: any) => row.USER_CODE === user.USER_CODE)
          .map((row: any) => {
            const raw = String(row.MANAGE_GRADE ?? "");
            // 코드를 한글로 변환 (K → 유치부, E1 → 초1 등)
            return codeToLabel(raw);
          })
          .filter((grade: string) => grade && grade !== "모든학년");

        return {
          ...user,
          MANAGE_GRADES: Array.from(new Set(grades)),
        };
      });
    },
  });

  const saveTeachersMutation = useMutation({
    mutationFn: async () => {
      for (const teacher of Object.values(editedTeachers)) {
        const { error: userError } = await (supabase as any)
          .from("USER_MAIN")
          .update({
            NAME: teacher.NAME,
            BAP_NAME: teacher.BAP_NAME,
            POSITION: teacher.POSITION,
          })
          .eq("USER_CODE", teacher.USER_CODE);
        if (userError) throw userError;

        const { error: deleteGradeError } = await supabase
          .from("USER_MANAGE_GRADE")
          .delete()
          .eq("USER_CODE", teacher.USER_CODE);
        if (deleteGradeError) throw deleteGradeError;

        const gradesToSave = teacher.MANAGE_GRADES || [];
        if (gradesToSave.length > 0) {
          // 한글을 코드로 변환해서 저장 (유치부 → K, 초1 → E1 등)
          const rows = gradesToSave.map((grade) => ({
            USER_CODE: teacher.USER_CODE,
            MANAGE_GRADE: gradeToCode(grade),
          }));

          const { error: insertGradeError } = await (supabase as any)
            .from("USER_MANAGE_GRADE")
            .insert(rows);
          if (insertGradeError) throw insertGradeError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usermain"] });
      setEditedTeachers({});
    },
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: async (USER_CODE: string) => {
      const { error: gradeError } = await supabase
        .from("USER_MANAGE_GRADE")
        .delete()
        .eq("USER_CODE", USER_CODE);
      if (gradeError) throw gradeError;

      const { error: userError } = await supabase
        .from("USER_MAIN")
        .delete()
        .eq("USER_CODE", USER_CODE);
      if (userError) throw userError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usermain"] });
    },
  });

  const handleDelete = (USER_CODE: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteTeacherMutation.mutate(USER_CODE);
    }
  };

  const handleUpdateTeacher = (
    teacher: UserWithGrades,
    field: keyof UserWithGrades,
    value: string | number | string[],
  ) => {
    setEditedTeachers((prev) => ({
      ...prev,
      [teacher.USER_CODE]: {
        ...(prev[teacher.USER_CODE] || teacher),
        [field]: value,
      } as UserWithGrades,
    }));
  };

  const getCurrentTeacher = (teacher: UserWithGrades): UserWithGrades => {
    return editedTeachers[teacher.USER_CODE] || teacher;
  };

  const hasChanges = Object.keys(editedTeachers).length > 0;

  const positionOptions: Position[] = ["회장", "부회장", "총무", "서기", "일반"];

  const positionToNumber = (position: string): number => {
    const positionMap: Record<string, number> = {
      관리자: 0,
      회장: 1,
      부회장: 2,
      총무: 3,
      서기: 4,
      일반: 5,
    };
    return positionMap[position] || 5;
  };

  const numberToPosition = (num: number | string): string => {
    const numberMap: Record<number, string> = {
      0: "관리자",
      1: "회장",
      2: "부회장",
      3: "총무",
      4: "서기",
      5: "일반",
    };
    const numValue = typeof num === "string" ? parseInt(num) : num;
    return numberMap[numValue] || "일반";
  };

  const formatGradesLabel = (grades: string[]) => {
    if (!grades || grades.length === 0) return "담당학년 선택";
    if (grades.length <= 2) return grades.join(", ");
    return `${grades.slice(0, 2).join(", ")} 외 ${grades.length - 2}개`;
  };

  const toggleGrade = (
    teacher: UserWithGrades,
    grade: string,
    checked: boolean,
  ) => {
    const current = getCurrentTeacher(teacher);
    const currentGrades = current.MANAGE_GRADES || [];
    const nextGrades = checked
      ? Array.from(new Set([...currentGrades, grade]))
      : currentGrades.filter((item) => item !== grade);

    handleUpdateTeacher(teacher, "MANAGE_GRADES", nextGrades);
  };

  const toggleGroup = (
    teacher: UserWithGrades,
    children: string[],
    checked: boolean,
  ) => {
    const current = getCurrentTeacher(teacher);
    const currentGrades = current.MANAGE_GRADES || [];

    const nextGrades = checked
      ? Array.from(new Set([...currentGrades, ...children]))
      : currentGrades.filter((item) => !children.includes(item));

    handleUpdateTeacher(teacher, "MANAGE_GRADES", nextGrades);
  };

  const filteredTeachers = teachers
    .filter((t) => t.POSITION !== 0)
    .sort((a, b) => {
      const nameA = a.NAME || "";
      const nameB = b.NAME || "";
      return nameA.localeCompare(nameB, "ko-KR");
    });

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

      <div className="rounded-lg border overflow-hidden bg-white">
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
                    <TableCell>{currentTeacher.BAP_NAME || "-"}</TableCell>
                    <TableCell>
                      <Select
                        value={numberToPosition(String(currentTeacher.POSITION ?? 5))}
                        onValueChange={(v) =>
                          handleUpdateTeacher(
                            currentTeacher,
                            "POSITION",
                            positionToNumber(v),
                          )
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="직책 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {positionOptions.map((pos) => (
                            <SelectItem key={pos} value={pos}>
                              {pos}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-60 justify-start text-left font-normal"
                          >
                            {formatGradesLabel(currentTeacher.MANAGE_GRADES || [])}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-3" align="start">
                          <div className="space-y-3">
                            {gradeGroups.map((group) => {
                              const selectedCount = group.children.filter((grade) =>
                                (currentTeacher.MANAGE_GRADES || []).includes(grade),
                              ).length;
                              const allSelected = selectedCount === group.children.length;

                              return (
                                <div key={group.label} className="space-y-2">
                                  <label className="flex items-center gap-2">
                                    <Checkbox
                                      checked={allSelected}
                                      onCheckedChange={(checked) =>
                                        toggleGroup(
                                          currentTeacher,
                                          group.children,
                                          Boolean(checked),
                                        )
                                      }
                                    />
                                    <span className="text-sm font-medium">{group.label}</span>
                                  </label>
                                  <div className="grid grid-cols-3 gap-2 pl-6">
                                    {group.children.map((grade) => (
                                      <label
                                        key={grade}
                                        className="flex items-center gap-1.5 text-sm"
                                      >
                                        <Checkbox
                                          checked={(currentTeacher.MANAGE_GRADES || []).includes(
                                            grade,
                                          )}
                                          onCheckedChange={(checked) =>
                                            toggleGrade(
                                              currentTeacher,
                                              grade,
                                              Boolean(checked),
                                            )
                                          }
                                        />
                                        <span>{grade}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
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
