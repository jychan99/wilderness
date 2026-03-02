import { useState, useMemo } from "react";
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

type GradeCode = {
  CODE: string;
  NAME: string;
  PARENT_CODE: string;
  LEVEL: number;
};

const TeacherManagement = () => {
  const queryClient = useQueryClient();
  const [editedTeachers, setEditedTeachers] = useState<
    Record<string, UserWithGrades>
  >({});

  // GRADE_CODE 테이블에서 학년 정보 가져오기
  const { data: gradeCodes = [] } = useQuery<GradeCode[], Error>({
    queryKey: ["gradeCode"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("GRADE_CODE")
        .select("*")
        .order("LEVEL", { ascending: true })
        .order("CODE", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // 코드-이름 매핑 생성
  const gradeMap = useMemo(() => {
    const map: Record<string, string> = {};
    gradeCodes.forEach((grade) => {
      map[grade.CODE] = grade.NAME;
    });
    return map;
  }, [gradeCodes]);

  // 이름-코드 매핑 생성 (역방향)
  const nameToCodeMap = useMemo(() => {
    const map: Record<string, string> = {};
    gradeCodes.forEach((grade) => {
      map[grade.NAME] = grade.CODE;
    });
    return map;
  }, [gradeCodes]);

  // 계층 구조로 학년 그룹 생성 (LEVEL=1이 부모, LEVEL=2가 자식)
  const gradeGroups = useMemo(() => {
    const parents = gradeCodes.filter((g) => g.LEVEL === 1);
    const orderMap: Record<string, number> = { K: 0, E: 1, M: 2, H: 3 };
    const sortedParents = parents.sort((a, b) => (orderMap[a.CODE] ?? 999) - (orderMap[b.CODE] ?? 999));
    
    return sortedParents.map((parent) => {
      const children = gradeCodes
        .filter((g) => g.LEVEL === 2 && g.PARENT_CODE === parent.CODE)
        .map((child) => child.NAME);
      
      return {
        code: parent.CODE,
        label: parent.NAME,
        children: children.length > 0 ? children : [parent.NAME],
      };
    });
  }, [gradeCodes]);

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
          .map((row: any) => row.MANAGE_GRADE)
          .filter((code: string) => code);

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

        let gradesToSave = teacher.MANAGE_GRADES || [];
        
        // 회장이면 모든 학년 코드 할당
        if (teacher.POSITION === 1) {
          gradesToSave = gradeCodes.map((g) => g.CODE);
        } else {
          // 자식이 모두 선택되면 부모 코드로 통합
          gradeGroups.forEach((group) => {
            const childrenCodes = group.children
              .map((name) => nameToCodeMap[name])
              .filter((code): code is string => !!code);
            
            // 자식이 2개 이상인 경우만 처리 (초등부, 중등부, 고등부 등)
            if (childrenCodes.length > 1) {
              const allChildrenSelected = childrenCodes.every((code) =>
                gradesToSave.includes(code)
              );
              
              if (allChildrenSelected) {
                // 자식들 제거
                gradesToSave = gradesToSave.filter((code) => !childrenCodes.includes(code));
                // 부모 코드 추가
                gradesToSave.push(group.code);
              }
            }
          });
        }
        
        if (gradesToSave.length > 0) {
          const rows = gradesToSave.map((gradeCode) => ({
            USER_CODE: teacher.USER_CODE,
            MANAGE_GRADE: gradeCode,
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

  const formatGradesLabel = (teacher: UserWithGrades) => {
    const isPresident = teacher.POSITION === 1;
    if (isPresident) return "모든 학년";
    
    const gradeCodes = teacher.MANAGE_GRADES || [];
    if (!gradeCodes || gradeCodes.length === 0) return "담당학년 선택";
    
    const names = gradeCodes.map((code) => gradeMap[code] || code);
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} 외 ${names.length - 2}개`;
  };

  const toggleGrade = (
    teacher: UserWithGrades,
    gradeName: string,
    checked: boolean,
  ) => {
    const current = getCurrentTeacher(teacher);
    let currentGrades = current.MANAGE_GRADES || [];
    const gradeCode = nameToCodeMap[gradeName];
    if (!gradeCode) return;

    const nextGrades = checked
      ? Array.from(new Set([...currentGrades, gradeCode]))
      : currentGrades.filter((item) => item !== gradeCode);

    handleUpdateTeacher(teacher, "MANAGE_GRADES", nextGrades);
  };

  const toggleGroup = (
    teacher: UserWithGrades,
    childrenNames: string[],
    checked: boolean,
  ) => {
    const current = getCurrentTeacher(teacher);
    let currentGrades = current.MANAGE_GRADES || [];
    const childrenCodes = childrenNames
      .map((name) => nameToCodeMap[name])
      .filter((code): code is string => !!code);

    if (checked) {
      // 부모 체크: 모든 자식 코드 추가
      currentGrades = Array.from(new Set([...currentGrades, ...childrenCodes]));
    } else {
      // 부모 언체크: 모든 자식 코드 제거
      currentGrades = currentGrades.filter((item) => !childrenCodes.includes(item));
    }

    handleUpdateTeacher(teacher, "MANAGE_GRADES", currentGrades);
  };

  const isGroupFullySelected = (
    teacher: UserWithGrades,
    childrenNames: string[],
  ): boolean => {
    const childrenCodes = childrenNames
      .map((name) => nameToCodeMap[name])
      .filter((code): code is string => !!code);
    
    const currentGrades = teacher.MANAGE_GRADES || [];
    return childrenCodes.length > 0 && childrenCodes.every((code) => currentGrades.includes(code));
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
                            disabled={currentTeacher.POSITION === 1}
                          >
                            {formatGradesLabel(currentTeacher)}
                          </Button>
                        </PopoverTrigger>
                        {currentTeacher.POSITION !== 1 && (
                        <PopoverContent className="w-80 p-3" align="start">
                          <div className="space-y-3">
                            {gradeGroups.map((group) => {
                              const childrenNames = group.children;
                              const isFullySelected = isGroupFullySelected(currentTeacher, childrenNames);

                              return (
                                <div key={group.code} className="space-y-2">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={isFullySelected}
                                      onCheckedChange={(checked) =>
                                        toggleGroup(
                                          currentTeacher,
                                          childrenNames,
                                          Boolean(checked),
                                        )
                                      }
                                    />
                                    <span className="text-sm font-semibold text-primary">{group.label}</span>
                                  </label>
                                  <div className="grid grid-cols-3 gap-2 pl-6">
                                    {group.children.map((gradeName) => {
                                      const gradeCode = nameToCodeMap[gradeName];
                                      const isChecked = (currentTeacher.MANAGE_GRADES || []).includes(gradeCode);
                                      
                                      return (
                                        <label
                                          key={gradeName}
                                          className="flex items-center gap-1.5 text-sm cursor-pointer hover:text-primary transition-colors"
                                        >
                                          <Checkbox
                                            checked={isChecked}
                                            onCheckedChange={(checked) =>
                                              toggleGrade(
                                                currentTeacher,
                                                gradeName,
                                                Boolean(checked),
                                              )
                                            }
                                          />
                                          <span>{gradeName}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </PopoverContent>
                        )}
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
