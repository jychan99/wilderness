import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { STU_MAIN, ATTENDANCE, Grade } from "@/types";
import { supabase } from "@/integrations/supabase/client";

// helper types mapping to form
interface StudentForm {
  NAME: string;
  BAP_NAME: string; // 세례명
  GRADE: string;
  NAME_DAY: string; // 축일
  CONTACT: string;
  FAMILY_CONTACT: string;
  NOTE: string;
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, BarChart3, Save } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const GRADE_LABEL_TO_CODE: Record<string, string> = {
  유치부: "K",
  초등부: "E",
  중등부: "M",
  고등부: "H",
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

const GRADE_SORT_ORDER: Record<string, number> = {
  K: 0,
  E: 1,
  E1: 2,
  E2: 3,
  E3: 4,
  E4: 5,
  E5: 6,
  E6: 7,
  M: 8,
  M1: 9,
  M2: 10,
  M3: 11,
  H: 12,
  H1: 13,
  H2: 14,
  H3: 15,
};

const StudentManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<STU_MAIN | null>(null);
  const [editingStudent, setEditingStudent] = useState<STU_MAIN | null>(null);
  const [openInfoUSER_CODE, setOpenInfoUSER_CODE] = useState<string | null>(
    null,
  );
  const [attendanceGradeFilter, setAttendanceGradeFilter] = useState<
    "all" | "K" | "E" | "M" | "H"
  >("all");
  const [attendanceDetailGradeFilter, setAttendanceDetailGradeFilter] =
    useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [statsStartDate, setStatsStartDate] = useState("");
  const [statsEndDate, setStatsEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [statsGradeFilter, setStatsGradeFilter] = useState<
    "all" | "K" | "E" | "M" | "H"
  >("all");
  const [gradeCategory, setGradeCategory] = useState<string>("");
  const [editingGradeCategory, setEditingGradeCategory] = useState<string>("");
  const [form, setForm] = useState<StudentForm>({
    NAME: "",
    BAP_NAME: "",
    GRADE: "" as Grade | "",
    NAME_DAY: "",
    CONTACT: "",
    FAMILY_CONTACT: "",
    NOTE: "",
  });
  // 출석 체크 임시 저장소 (저장 버튼 누르기 전까지)
  const [pendingAttendance, setPendingAttendance] = useState<
    Record<string, { MISSA_YN: boolean; DOCTRINE_YN: boolean }>
  >({});

  // 학생 조회 (STU_MAIN 테이블)
  const { data: students = [] } = useQuery<STU_MAIN[], Error>({
    queryKey: ["stumain"],
    queryFn: async () => {
      const { data, error } = await supabase.from("STU_MAIN").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // 출석 조회 (ATTENDANCE 테이블)
  const { data: attendance = [] } = useQuery<ATTENDANCE[], Error>({
    queryKey: ["attendance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ATTENDANCE").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // 학생 추가
  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: STU_MAIN) => {
      const { error } = await (supabase as any)
        .from("STU_MAIN")
        .insert([newStudent]);
      if (error) {
        console.error("학생 추가 에러:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stumain"] });
      setForm({
        NAME: "",
        BAP_NAME: "",
        GRADE: "" as Grade | "",
        NAME_DAY: "",
        CONTACT: "",
        FAMILY_CONTACT: "",
        NOTE: "",
      });
      setGradeCategory("");
      setShowAdd(false);
    },
    onError: (error: any) => {
      console.error("Mutation 실패:", error);
    },
  });

  // 학생 수정
  const editStudentMutation = useMutation({
    mutationFn: async (updatedStudent: STU_MAIN) => {
      const { error } = await (supabase as any)
        .from("STU_MAIN")
        .update(updatedStudent)
        .eq("USER_CODE", updatedStudent.USER_CODE);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stumain"] });
      setEditingStudent(null);
    },
  });

  // 학생 삭제
  const deleteStudentMutation = useMutation({
    mutationFn: async (USER_CODE: string) => {
      const { error: attendanceError } = await supabase
        .from("ATTENDANCE")
        .delete()
        .eq("USER_CODE", USER_CODE);

      if (attendanceError) {
        throw attendanceError;
      }

      const { error: studentError } = await supabase
        .from("STU_MAIN")
        .delete()
        .eq("USER_CODE", USER_CODE);

      if (studentError) {
        throw studentError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stumain"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error: any) => {
      console.error("학생 삭제 실패:", error);
      alert(error?.message || "학생 삭제 중 오류가 발생했습니다.");
    },
  });

  type AttendanceField = "MISSA_YN" | "DOCTRINE_YN";

  // 출석 일괄 저장
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(pendingAttendance).map(
        ([USER_CODE, values]) => ({
          USER_CODE,
          ...values,
        }),
      );

      for (const update of updates) {
        const student = students.find((s) => s.USER_CODE === update.USER_CODE);
        if (!student) continue;

        const existing = attendance.find(
          (a) => a.USER_CODE === update.USER_CODE && a.DATE === attendanceDate,
        );

        if (existing) {
          // 기존 레코드 업데이트
          const { error } = await (supabase as any)
            .from("ATTENDANCE")
            .update({
              MISSA_YN: update.MISSA_YN,
              DOCTRINE_YN: update.DOCTRINE_YN,
            })
            .eq("USER_CODE", update.USER_CODE)
            .eq("DATE", attendanceDate);
          if (error) throw error;
        } else {
          // 새 레코드 생성
          const { error } = await (supabase as any).from("ATTENDANCE").insert([
            {
              USER_CODE: update.USER_CODE,
              NAME: student.NAME,
              DATE: attendanceDate,
              MISSA_YN: update.MISSA_YN,
              DOCTRINE_YN: update.DOCTRINE_YN,
            },
          ]);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setPendingAttendance({});
    },
    onError: (error: any) => {
      console.error("출석 저장 실패:", error);
      alert("출석 저장 중 오류가 발생했습니다.");
    },
  });

  const filteredStudents = useMemo(() => {
    if (!user) return [];

    const userGradeList = String(user.grade || "")
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g.length > 0)
      .map((g) => GRADE_LABEL_TO_CODE[g] || g);

    const isAdmin =
      Number(user.position) === 0 ||
      user.role === "admin" ||
      user.grade === "모든학년";

    const filtered = isAdmin
      ? students
      : students.filter((s) => {
          const studentGrade = String(s.GRADE);

          // 학생의 학년이 사용자의 담당학년 중 하나와 일치하거나 부모 코드로 시작
          return userGradeList.some((userCode) => {
            // 정확한 일치 (예: E2 === E2)
            if (studentGrade === userCode) return true;
            // 부모 코드로 시작 (예: E는 E1, E2, ... 모두 포함)
            if (userCode.length === 1 && studentGrade.startsWith(userCode))
              return true;
            return false;
          });
        });

    // 학년으로 먼저 정렬, 같은 학년 내에서 이름으로 정렬
    return [...filtered].sort((a, b) => {
      const gradeOrder_a = GRADE_SORT_ORDER[String(a.GRADE)] ?? 999;
      const gradeOrder_b = GRADE_SORT_ORDER[String(b.GRADE)] ?? 999;

      if (gradeOrder_a !== gradeOrder_b) {
        return gradeOrder_a - gradeOrder_b;
      }
      return a.NAME.localeCompare(b.NAME, "ko");
    });
  }, [user, students]);

  const attendanceStats = useMemo(() => {
    // 학년 필터 적용
    let studentsForStats = filteredStudents;
    if (statsGradeFilter !== "all") {
      studentsForStats = filteredStudents.filter((s) => {
        const grade = String(s.GRADE);
        switch (statsGradeFilter) {
          case "K":
            return grade === "K";
          case "E":
            return grade === "E" || grade.startsWith("E");
          case "M":
            return grade === "M" || grade.startsWith("M");
          case "H":
            return grade === "H" || grade.startsWith("H");
          default:
            return true;
        }
      });
    }

    const filteredAttendance = attendance.filter((record) => {
      if (statsStartDate && record.DATE < statsStartDate) return false;
      if (statsEndDate && record.DATE > statsEndDate) return false;
      return true;
    });

    const attendanceByUser = new Map<string, ATTENDANCE[]>();
    filteredAttendance.forEach((record) => {
      const key = String(record.USER_CODE || "");
      const current = attendanceByUser.get(key) || [];
      current.push(record);
      attendanceByUser.set(key, current);
    });

    return studentsForStats.map((student) => {
      const userKey = String(student.USER_CODE || "");
      const records = attendanceByUser.get(userKey) || [];

      const total = records.length;
      const missaPresent = records.filter((a) => a.MISSA_YN).length;
      const doctrinePresent = records.filter((a) => a.DOCTRINE_YN).length;
      const missaRate =
        total > 0 ? Math.round((missaPresent / total) * 100) : 0;
      const doctrineRate =
        total > 0 ? Math.round((doctrinePresent / total) * 100) : 0;
      const displayName = student.BAP_NAME
        ? `${student.NAME} (${student.BAP_NAME})`
        : student.NAME;
      return {
        name: displayName,
        미사출석률: missaRate,
        교리출석률: doctrineRate,
        missaRate,
        doctrineRate,
        미사출석: missaPresent,
        교리출석: doctrinePresent,
        totalRecords: total,
      };
    });
  }, [
    filteredStudents,
    attendance,
    statsStartDate,
    statsEndDate,
    statsGradeFilter,
  ]);

  if (!user) return null;

  const grades: Grade[] = ["유치부", "초등부", "중등부", "고등부"];

  // 학년을 문자열로 저장 (그대로 저장)
  const gradeToCode = (grade: string): string => {
    // 한글 학년명을 코드로 변환
    // K: 유치부, E1-E6: 초1-초6, M1-M3: 중1-중3, H1-H3: 고1-고3
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

  const gradeToLabel = (grade: string | number): string => {
    const gradeStr = String(grade);
    // 코드 형식인 경우 한글로 변환
    const codeMap: { [key: string]: string } = {
      K: "유치부",
      E1: "초1",
      E2: "초2",
      E3: "초3",
      E4: "초4",
      E5: "초5",
      E6: "초6",
      M1: "중1",
      M2: "중2",
      M3: "중3",
      H1: "고1",
      H2: "고2",
      H3: "고3",
    };
    // 코드가 있으면 변환
    if (codeMap[gradeStr]) {
      return codeMap[gradeStr];
    }
    // 이미 한글 학년이면 그대로 반환 (레거시 데이터)
    if (
      gradeStr === "유치부" ||
      gradeStr.includes("초") ||
      gradeStr.includes("중") ||
      gradeStr.includes("고")
    ) {
      return gradeStr;
    }
    // 숫자 코드인 경우 (구식 포맷)
    const legacyMap: { [key: string]: string } = {
      "0": "유치부",
      "1": "초등부",
      "2": "중등부",
      "3": "고등부",
    };
    return legacyMap[gradeStr] || gradeStr;
  };

  const getStudentInfoKey = (student: STU_MAIN): string => {
    return (
      student.USER_CODE ||
      `${student.NAME}-${student.BAP_NAME}-${student.CONTACT}`
    );
  };

  const handleAdd = () => {
    if (!form.NAME || !form.GRADE) return;
    // USER_CODE 제외 - 서버에서 자동생성
    // 빈 필드는 빈 문자열로 보냄 (서버 기본값 활용)
    const newStudent = {
      NAME: form.NAME,
      BAP_NAME: form.BAP_NAME || "",
      GRADE: gradeToCode(form.GRADE), // 한글을 코드로 변환해서 저장 (K, E1, E5, M1, H3 등)
      NAME_DAY: form.NAME_DAY || "", // MM-DD 형식
      CONTACT: form.CONTACT || "",
      FAMILY_CONTACT: form.FAMILY_CONTACT || "",
      NOTE: form.NOTE || "",
    } as any;
    addStudentMutation.mutate(newStudent);
  };

  const handleEdit = () => {
    if (!editingStudent) return;
    // GRADE를 한글에서 코드로 변환
    const updatedStudent = {
      ...editingStudent,
      GRADE: gradeToCode(editingStudent.GRADE),
    };
    editStudentMutation.mutate(updatedStudent);
  };

  const handleDelete = (id: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteStudentMutation.mutate(id);
    }
  };

  const getGradeCategory = (grade: string): string => {
    const grade_str = String(grade);
    if (grade_str === "K") return "유치부";
    if (["E1", "E2", "E3", "E4", "E5", "E6"].includes(grade_str))
      return "초등부";
    if (["M1", "M2", "M3"].includes(grade_str)) return "중등부";
    if (["H1", "H2", "H3"].includes(grade_str)) return "고등부";
    // 한글 학년이 들어온 경우
    if (grade_str === "유치부") return "유치부";
    if (grade_str.includes("초")) return "초등부";
    if (grade_str.includes("중")) return "중등부";
    if (grade_str.includes("고")) return "고등부";
    return "";
  };

  const toggleAttendance = (
    student: Pick<STU_MAIN, "USER_CODE" | "NAME">,
    field: AttendanceField,
  ) => {
    if (!student.USER_CODE) return;

    const currentState = getCurrentAttendanceState(student.USER_CODE);
    const newState = {
      ...currentState,
      [field]: !currentState[field],
    };

    setPendingAttendance((prev) => ({
      ...prev,
      [student.USER_CODE]: newState,
    }));
  };

  const getCurrentAttendanceState = (
    USER_CODE: string,
  ): { MISSA_YN: boolean; DOCTRINE_YN: boolean } => {
    // pendingAttendance에 있으면 그걸 사용
    if (pendingAttendance[USER_CODE]) {
      return pendingAttendance[USER_CODE];
    }

    // 없으면 실제 출석 데이터에서 가져오기
    const record = attendance.find(
      (a) => a.USER_CODE === USER_CODE && a.DATE === attendanceDate,
    );

    return {
      MISSA_YN: record?.MISSA_YN ?? false,
      DOCTRINE_YN: record?.DOCTRINE_YN ?? false,
    };
  };

  const toggleStudentInfo = (infoKey: string) => {
    setOpenInfoUSER_CODE((prev) => (prev === infoKey ? null : infoKey));
  };

  const isPresent = (USER_CODE: string, field: AttendanceField) => {
    // pendingAttendance 먼저 확인
    if (pendingAttendance[USER_CODE]) {
      return pendingAttendance[USER_CODE][field];
    }

    // 실제 출석 데이터 확인
    const record = attendance.find(
      (a) => a.USER_CODE === USER_CODE && a.DATE === attendanceDate,
    );
    return record ? record[field] : false;
  };

  // 전화번호 자동 포맷팅
  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
    }
  };

  const attendanceList = useMemo(() => {
    let list = [...filteredStudents];
    if (attendanceGradeFilter !== "all") {
      list = list.filter((student) => {
        const grade = String(student.GRADE);
        switch (attendanceGradeFilter) {
          case "K":
            return grade === "K";
          case "E":
            return grade.startsWith("E");
          case "M":
            return grade.startsWith("M");
          case "H":
            return grade.startsWith("H");
          default:
            return true;
        }
      });

      // 세부 학년 필터 적용
      if (attendanceDetailGradeFilter !== "all") {
        list = list.filter((student) => {
          const grade = String(student.GRADE);
          return grade === attendanceDetailGradeFilter;
        });
      }
    }
    if (searchText.trim()) {
      const search = searchText.trim().toLowerCase();
      list = list.filter((student) => {
        const name = (student.NAME || "").toLowerCase();
        const baptismalName = (student.BAP_NAME || "").toLowerCase();
        return name.includes(search) || baptismalName.includes(search);
      });
    }
    list.sort((a, b) => {
      const nameA = a.NAME || "";
      const nameB = b.NAME || "";
      return nameA.localeCompare(nameB, "ko-KR");
    });
    return list;
  }, [
    filteredStudents,
    attendanceGradeFilter,
    attendanceDetailGradeFilter,
    searchText,
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            담당: {user.grade === "모든학년" ? "전체 학년" : user.grade} · 총{" "}
            {filteredStudents.length}명
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            <BarChart3 className="w-4 h-4 mr-1.5" />
            통계
          </Button>
          <Dialog
            open={showAdd}
            onOpenChange={(open) => {
              setShowAdd(open);
              if (!open) {
                setGradeCategory("");
              }
            }}
          >
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
                  <Input
                    value={form.NAME}
                    onChange={(e) => setForm({ ...form, NAME: e.target.value })}
                    placeholder="학생 이름"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>세례명</Label>
                  <Input
                    value={form.BAP_NAME}
                    onChange={(e) =>
                      setForm({ ...form, BAP_NAME: e.target.value })
                    }
                    placeholder="세례명"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>학년</Label>
                  <Select
                    value={gradeCategory}
                    onValueChange={(v) => {
                      setGradeCategory(v);
                      // 유치부는 바로 설정, 나머지는 초기화
                      if (v === "유치부") {
                        setForm({ ...form, GRADE: "유치부" });
                      } else {
                        setForm({ ...form, GRADE: "" });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="학년 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {gradeCategory && gradeCategory !== "유치부" && (
                  <div className="space-y-1.5">
                    <Label>
                      {gradeCategory === "초등부" && "초등학년"}
                      {gradeCategory === "중등부" && "중등학년"}
                      {gradeCategory === "고등부" && "고등학년"}
                    </Label>
                    <Select
                      value={form.GRADE}
                      onValueChange={(v) =>
                        setForm({ ...form, GRADE: v as Grade })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="세부 학년 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {gradeCategory === "초등부" &&
                          ["초1", "초2", "초3", "초4", "초5", "초6"].map(
                            (g) => (
                              <SelectItem key={g} value={g}>
                                {g}
                              </SelectItem>
                            ),
                          )}
                        {gradeCategory === "중등부" &&
                          ["중1", "중2", "중3"].map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                        {gradeCategory === "고등부" &&
                          ["고1", "고2", "고3"].map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>축일</Label>
                  <div className="flex gap-2">
                    <Select
                      value={form.NAME_DAY.split("-")[0] || ""}
                      onValueChange={(v) => {
                        const day = form.NAME_DAY.split("-")[1] || "";
                        setForm({
                          ...form,
                          NAME_DAY: v && day ? `${v}-${day}` : v,
                        });
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="월" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = String(i + 1).padStart(2, "0");
                          return (
                            <SelectItem key={month} value={month}>
                              {month}월
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Select
                      value={form.NAME_DAY.split("-")[1] || ""}
                      onValueChange={(v) => {
                        const month = form.NAME_DAY.split("-")[0] || "";
                        setForm({
                          ...form,
                          NAME_DAY: month && v ? `${month}-${v}` : "",
                        });
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="일" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => {
                          const day = String(i + 1).padStart(2, "0");
                          return (
                            <SelectItem key={day} value={day}>
                              {day}일
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>전화번호</Label>
                  <Input
                    value={form.CONTACT}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        CONTACT: formatPhoneNumber(e.target.value),
                      })
                    }
                    placeholder="010-0000-0000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>학부모 연락처</Label>
                  <Input
                    value={form.FAMILY_CONTACT}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        FAMILY_CONTACT: formatPhoneNumber(e.target.value),
                      })
                    }
                    placeholder="010-0000-0000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>메모</Label>
                  <Input
                    value={form.NOTE}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        NOTE: e.target.value,
                      })
                    }
                    placeholder="메모"
                  />
                </div>
                <Button onClick={handleAdd} className="w-full">
                  추가
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Attendance Stats Chart */}
      {showStats && (
        <div className="card-classic p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="font-heading font-semibold">📊 출석 통계</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={statsStartDate}
                onChange={(e) => setStatsStartDate(e.target.value)}
                placeholder="시작날짜"
                className="w-full sm:w-40"
              />
              <span className="text-sm text-muted-foreground">~</span>
              <Input
                type="date"
                value={statsEndDate}
                onChange={(e) => setStatsEndDate(e.target.value)}
                className="w-full sm:w-40"
              />
              <Select
                value={statsGradeFilter}
                onValueChange={(v) =>
                  setStatsGradeFilter(v as "all" | "K" | "E" | "M" | "H")
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="학년" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="K">유치부</SelectItem>
                  <SelectItem value="E">초등부</SelectItem>
                  <SelectItem value="M">중등부</SelectItem>
                  <SelectItem value="H">고등부</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Tabs defaultValue="chart" className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chart">그래프</TabsTrigger>
              <TabsTrigger value="table">표</TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="mt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceStats}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(210, 25%, 88%)"
                    />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis
                      fontSize={12}
                      allowDecimals={false}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip formatter={(value: number) => `${value}%`} />
                    <Bar
                      dataKey="미사출석률"
                      fill="hsl(210, 55%, 38%)"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="교리출석률"
                      fill="hsl(210, 45%, 58%)"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="table" className="mt-4">
              {attendanceStats.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border border-border rounded-lg">
                  조회된 통계 데이터가 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
                          학생
                        </th>
                        <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">
                          미사 출석
                        </th>
                        <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">
                          교리 출석
                        </th>
                        <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">
                          총 회차
                        </th>
                        <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">
                          미사 출석률
                        </th>
                        <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">
                          교리 출석률
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceStats.map((stat, idx) => (
                        <tr
                          key={`${stat.name}-${idx}`}
                          className="border-b border-border/60 hover:bg-muted/30"
                        >
                          <td className="py-2.5 px-3">{stat.name}</td>
                          <td className="py-2.5 px-3 text-right">
                            {stat.미사출석}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {stat.교리출석}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {stat.totalRecords}
                          </td>
                          <td className="py-2.5 px-3 text-right text-primary font-medium">
                            {stat.missaRate}%
                          </td>
                          <td className="py-2.5 px-3 text-right text-primary font-medium">
                            {stat.doctrineRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Per-student attendance detail */}
          <h4 className="font-heading font-semibold text-sm mb-3">
            학생별 출석 기록
          </h4>
          <div className="space-y-2">
            {filteredStudents.map((student) => {
              const records = attendance
                .filter((a) => a.USER_CODE === student.USER_CODE)
                .sort((a, b) => a.DATE.localeCompare(b.DATE));
              const totalRecords = records.length;
              const missaCount = records.filter((r) => r.MISSA_YN).length;
              const doctrineCount = records.filter((r) => r.DOCTRINE_YN).length;
              const missaRate =
                totalRecords > 0
                  ? Math.round((missaCount / totalRecords) * 100)
                  : 0;
              const doctrineRate =
                totalRecords > 0
                  ? Math.round((doctrineCount / totalRecords) * 100)
                  : 0;
              const isOpen = selectedStudent?.USER_CODE === student.USER_CODE;
              return (
                <div
                  key={student.USER_CODE}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setSelectedStudent(isOpen ? null : student)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div>
                      <span className="text-sm font-semibold text-muted-foreground min-w-[52px]">
                        {gradeToLabel(student.GRADE)}
                      </span>
                      <span className="font-medium text-sm ml-1.5">
                        {student.NAME}
                      </span>
                      {student.BAP_NAME && (
                        <span className="text-xs text-muted-foreground ml-1.5">
                          {student.BAP_NAME}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        미사 {missaRate}% · 교리 {doctrineRate}%
                      </span>
                      <span
                        className={`text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}
                      >
                        ▼
                      </span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border p-3 bg-muted/20">
                      {records.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          출석 기록이 없습니다.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {records.map((record) => (
                            <div
                              key={record.ID}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium bg-muted text-foreground"
                            >
                              <span>{record.DATE}</span>
                              <span>
                                미사 {record.MISSA_YN ? "O" : "X"} / 교리{" "}
                                {record.DOCTRINE_YN ? "O" : "X"}
                              </span>
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
          <h3 className="font-heading font-semibold">✅ 출석 체크</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={attendanceGradeFilter}
              onValueChange={(v) => {
                setAttendanceGradeFilter(v as "all" | "K" | "E" | "M" | "H");
                setAttendanceDetailGradeFilter("all"); // 대분류 변경 시 세부 필터 초기화
              }}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="학년" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="K">유치부</SelectItem>
                <SelectItem value="E">초등부</SelectItem>
                <SelectItem value="M">중등부</SelectItem>
                <SelectItem value="H">고등부</SelectItem>
              </SelectContent>
            </Select>
            {(attendanceGradeFilter === "E" ||
              attendanceGradeFilter === "M" ||
              attendanceGradeFilter === "H") && (
              <Select
                value={attendanceDetailGradeFilter}
                onValueChange={(v) => setAttendanceDetailGradeFilter(v)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="세부학년" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {attendanceGradeFilter === "E" && (
                    <>
                      <SelectItem value="E1">초1</SelectItem>
                      <SelectItem value="E2">초2</SelectItem>
                      <SelectItem value="E3">초3</SelectItem>
                      <SelectItem value="E4">초4</SelectItem>
                      <SelectItem value="E5">초5</SelectItem>
                      <SelectItem value="E6">초6</SelectItem>
                    </>
                  )}
                  {attendanceGradeFilter === "M" && (
                    <>
                      <SelectItem value="M1">중1</SelectItem>
                      <SelectItem value="M2">중2</SelectItem>
                      <SelectItem value="M3">중3</SelectItem>
                    </>
                  )}
                  {attendanceGradeFilter === "H" && (
                    <>
                      <SelectItem value="H1">고1</SelectItem>
                      <SelectItem value="H2">고2</SelectItem>
                      <SelectItem value="H3">고3</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            )}
            <Input
              type="text"
              placeholder="이름, 세례명 검색"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full sm:w-44"
            />
            <Input
              type="date"
              value={attendanceDate}
              onChange={(e) => {
                setAttendanceDate(e.target.value);
                setPendingAttendance({}); // 날짜 변경시 임시 저장 초기화
              }}
              className="w-full sm:w-44"
            />
          </div>
        </div>

        <div className="space-y-2">
          {attendanceList.map((student) => {
            const infoKey = getStudentInfoKey(student);
            const isInfoOpen = openInfoUSER_CODE === infoKey;
            return (
              <div key={student.USER_CODE}>
                <div
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleStudentInfo(infoKey)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleStudentInfo(infoKey);
                    }
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-muted-foreground min-w-[52px]">
                        {gradeToLabel(student.GRADE)}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-base">
                          {student.NAME}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {student.BAP_NAME || "세례명 없음"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-muted-foreground">미사</p>
                      <Checkbox
                        checked={isPresent(student.USER_CODE, "MISSA_YN")}
                        onCheckedChange={() => {
                          if (!student.USER_CODE) {
                            alert(
                              "학생 정보에 문제가 있습니다. USER_CODE가 없습니다.",
                            );
                            return;
                          }
                          toggleAttendance(
                            {
                              USER_CODE: student.USER_CODE,
                              NAME: student.NAME,
                            },
                            "MISSA_YN",
                          );
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-muted-foreground">교리</p>
                      <Checkbox
                        checked={isPresent(student.USER_CODE, "DOCTRINE_YN")}
                        onCheckedChange={() => {
                          if (!student.USER_CODE) {
                            alert(
                              "학생 정보에 문제가 있습니다. USER_CODE가 없습니다.",
                            );
                            return;
                          }
                          toggleAttendance(
                            {
                              USER_CODE: student.USER_CODE,
                              NAME: student.NAME,
                            },
                            "DOCTRINE_YN",
                          );
                        }}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingStudent(student);
                        setEditingGradeCategory(
                          getGradeCategory(student.GRADE),
                        );
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(student.USER_CODE)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {isInfoOpen && (
                  <div className="border border-border border-t-0 rounded-b-lg p-3 bg-muted/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">
                          이름
                        </span>
                        <p className="font-medium">{student.NAME}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">
                          세례명
                        </span>
                        <p className="font-medium">{student.BAP_NAME || "-"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">
                          학년
                        </span>
                        <p className="font-medium">
                          {gradeToLabel(student.GRADE)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">
                          축일
                        </span>
                        <p className="font-medium">{student.NAME_DAY || "-"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">
                          연락처
                        </span>
                        <p className="font-medium">{student.CONTACT || "-"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">
                          학부모 연락처
                        </span>
                        <p className="font-medium">
                          {student.FAMILY_CONTACT || "-"}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-xs text-muted-foreground">
                          메모
                        </span>
                        <p className="font-medium">{student.NOTE || "-"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-border mt-4">
          <Button
            onClick={() => saveAttendanceMutation.mutate()}
            disabled={
              Object.keys(pendingAttendance).length === 0 ||
              saveAttendanceMutation.isPending
            }
            className="w-full gap-2"
          >
            <Save className="w-4 h-4" />
            {saveAttendanceMutation.isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingStudent}
        onOpenChange={(open) => {
          if (!open) {
            setEditingStudent(null);
            setEditingGradeCategory("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">학생 수정</DialogTitle>
          </DialogHeader>
          {editingStudent && (
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label>이름</Label>
                <Input
                  value={editingStudent.NAME}
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      NAME: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>세례명</Label>
                <Input
                  value={editingStudent.BAP_NAME}
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      BAP_NAME: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>학년</Label>
                <Select
                  value={editingGradeCategory}
                  onValueChange={(v) => {
                    setEditingGradeCategory(v);
                    if (v === "유치부") {
                      setEditingStudent({ ...editingStudent, GRADE: "유치부" });
                    } else {
                      setEditingStudent({ ...editingStudent, GRADE: "" });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="학년 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editingGradeCategory && editingGradeCategory !== "유치부" && (
                <div className="space-y-1.5">
                  <Label>
                    {editingGradeCategory === "초등부" && "초등학년"}
                    {editingGradeCategory === "중등부" && "중등학년"}
                    {editingGradeCategory === "고등부" && "고등학년"}
                  </Label>
                  <Select
                    value={gradeToLabel(editingStudent.GRADE)}
                    onValueChange={(v) =>
                      setEditingStudent({
                        ...editingStudent,
                        GRADE: v as Grade,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="세부 학년 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {editingGradeCategory === "초등부" &&
                        ["초1", "초2", "초3", "초4", "초5", "초6"].map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      {editingGradeCategory === "중등부" &&
                        ["중1", "중2", "중3"].map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      {editingGradeCategory === "고등부" &&
                        ["고1", "고2", "고3"].map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>축일</Label>
                <div className="flex gap-2">
                  <Select
                    value={(editingStudent.NAME_DAY || "").split("-")[0] || ""}
                    onValueChange={(v) => {
                      const day =
                        (editingStudent.NAME_DAY || "").split("-")[1] || "";
                      setEditingStudent({
                        ...editingStudent,
                        NAME_DAY: v && day ? `${v}-${day}` : v,
                      });
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="월" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = String(i + 1).padStart(2, "0");
                        return (
                          <SelectItem key={month} value={month}>
                            {month}월
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Select
                    value={(editingStudent.NAME_DAY || "").split("-")[1] || ""}
                    onValueChange={(v) => {
                      const month =
                        (editingStudent.NAME_DAY || "").split("-")[0] || "";
                      setEditingStudent({
                        ...editingStudent,
                        NAME_DAY: month && v ? `${month}-${v}` : "",
                      });
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="일" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => {
                        const day = String(i + 1).padStart(2, "0");
                        return (
                          <SelectItem key={day} value={day}>
                            {day}일
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>전화번호</Label>
                <Input
                  value={editingStudent.CONTACT || ""}
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      CONTACT: formatPhoneNumber(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>학부모 연락처</Label>
                <Input
                  value={editingStudent.FAMILY_CONTACT || ""}
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      FAMILY_CONTACT: formatPhoneNumber(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>메모</Label>
                <Input
                  value={editingStudent.NOTE || ""}
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      NOTE: e.target.value,
                    })
                  }
                />
              </div>
              <Button onClick={handleEdit} className="w-full">
                저장
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentManagement;
