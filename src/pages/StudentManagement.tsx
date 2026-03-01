import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { STUMAIN, ATTENDANCE, Grade } from "@/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const StudentManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<STUMAIN | null>(null);
  const [editingStudent, setEditingStudent] = useState<STUMAIN | null>(null);
  const [openInfoUSER_CODE, setOpenInfoUSER_CODE] = useState<string | null>(
    null,
  );
  const [attendanceGradeFilter, setAttendanceGradeFilter] = useState<
    "all" | "0" | "1" | "2" | "3"
  >("all");
  const [searchText, setSearchText] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [statsStartDate, setStatsStartDate] = useState("");
  const [statsEndDate, setStatsEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [statsGradeFilter, setStatsGradeFilter] = useState<
    "all" | "0" | "1" | "2" | "3"
  >("all");
  const [form, setForm] = useState<StudentForm>({
    NAME: "",
    BAP_NAME: "",
    GRADE: "" as Grade | "",
    NAME_DAY: "",
    CONTACT: "",
    FAMILY_CONTACT: "",
    NOTE: "",
  });

  // 학생 조회 (STUMAIN 테이블)
  const { data: students = [] } = useQuery<STUMAIN[], Error>({
    queryKey: ["stumain"],
    queryFn: async () => {
      const { data, error } = await supabase.from("STUMAIN").select("*");
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
    mutationFn: async (newStudent: STUMAIN) => {
      const { error } = await (supabase as any)
        .from("STUMAIN")
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
      setShowAdd(false);
    },
    onError: (error: any) => {
      console.error("Mutation 실패:", error);
    },
  });

  // 학생 수정
  const editStudentMutation = useMutation({
    mutationFn: async (updatedStudent: STUMAIN) => {
      const { error } = await (supabase as any)
        .from("STUMAIN")
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
        .from("STUMAIN")
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

  // 출석 토글
  const toggleAttendanceMutation = useMutation({
    mutationFn: async ({
      USER_CODE,
      NAME,
      field,
    }: Pick<STUMAIN, "USER_CODE" | "NAME"> & { field: AttendanceField }) => {
      if (!USER_CODE) {
        throw new Error("USER_CODE가 없습니다.");
      }

      const existing = attendance.find(
        (a) => a.USER_CODE === USER_CODE && a.DATE === attendanceDate,
      );

      if (existing) {
        // 기존 레코드가 있으면 선택한 필드 토글
        const newValue = !existing[field];
        const { error } = await (supabase as any)
          .from("ATTENDANCE")
          .update({ [field]: newValue })
          .eq("USER_CODE", USER_CODE)
          .eq("DATE", attendanceDate);
        if (error) {
          console.error("출석 업데이트 에러:", error);
          throw error;
        }
      } else {
        // 레코드가 없으면 INSERT (선택 필드만 true)
        const { error } = await (supabase as any).from("ATTENDANCE").insert([
          {
            USER_CODE: USER_CODE,
            NAME: NAME,
            DATE: attendanceDate,
            MISSA_YN: field === "MISSA_YN",
            DOCTRINE_YN: field === "DOCTRINE_YN",
          },
        ]);
        if (error) {
          console.error("출석 추가 에러:", error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error: any) => {
      console.error("출석 토글 실패:", error);
    },
  });

  const filteredStudents = useMemo(() => {
    if (!user) return [];

    const gradeLabelToCode: Record<string, string> = {
      유치부: "0",
      초등부: "1",
      중등부: "2",
      고등부: "3",
    };

    const isAdmin =
      Number(user.position) === 0 ||
      user.role === "admin" ||
      user.grade === "모든학년";

    return isAdmin
      ? students
      : students.filter(
          (s) => String(s.GRADE) === (gradeLabelToCode[user.grade] ?? ""),
        );
  }, [user, students]);

  const attendanceStats = useMemo(() => {
    // 학년 필터 적용
    let studentsForStats = filteredStudents;
    if (statsGradeFilter !== "all") {
      studentsForStats = filteredStudents.filter(
        (s) => String(s.GRADE) === statsGradeFilter,
      );
    }

    return studentsForStats.map((student) => {
      // 날짜 필터 적용
      let records = attendance.filter((a) => a.USER_CODE === student.USER_CODE);
      if (statsStartDate) {
        records = records.filter((a) => a.DATE >= statsStartDate);
      }
      if (statsEndDate) {
        records = records.filter((a) => a.DATE <= statsEndDate);
      }

      const total = records.length;
      const missaPresent = records.filter((a) => a.MISSA_YN).length;
      const doctrinePresent = records.filter((a) => a.DOCTRINE_YN).length;
      const displayName = student.BAP_NAME
        ? `${student.NAME} (${student.BAP_NAME})`
        : student.NAME;
      return {
        name: displayName,
        미사출석률: total > 0 ? Math.round((missaPresent / total) * 100) : 0,
        교리출석률: total > 0 ? Math.round((doctrinePresent / total) * 100) : 0,
        미사출석: missaPresent,
        교리출석: doctrinePresent,
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

  // 학년을 숫자 코드로 변환
  const gradeToCode = (grade: string): number => {
    const gradeMap: { [key: string]: number } = {
      유치부: 0,
      초등부: 1,
      중등부: 2,
      고등부: 3,
    };
    return gradeMap[grade] || 0;
  };

  const gradeToLabel = (grade: string | number): string => {
    const gradeMap: { [key: string]: string } = {
      "0": "유치부",
      "1": "초등부",
      "2": "중등부",
      "3": "고등부",
    };
    return gradeMap[String(grade)] || String(grade);
  };

  const getStudentInfoKey = (student: STUMAIN): string => {
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
      GRADE: gradeToCode(form.GRADE), // 문자열 → 숫자로 변환
      NAME_DAY: form.NAME_DAY || "", // MM-DD 형식
      CONTACT: form.CONTACT || "",
      FAMILY_CONTACT: form.FAMILY_CONTACT || "",
      NOTE: form.NOTE || "",
    } as any;
    addStudentMutation.mutate(newStudent);
  };

  const handleEdit = () => {
    if (!editingStudent) return;
    editStudentMutation.mutate(editingStudent);
  };

  const handleDelete = (id: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteStudentMutation.mutate(id);
    }
  };

  const toggleAttendance = (
    student: Pick<STUMAIN, "USER_CODE" | "NAME">,
    field: AttendanceField,
  ) => {
    toggleAttendanceMutation.mutate({ ...student, field });
  };

  const toggleStudentInfo = (infoKey: string) => {
    setOpenInfoUSER_CODE((prev) => (prev === infoKey ? null : infoKey));
  };

  const isPresent = (USER_CODE: string, field: AttendanceField) => {
    // 해당 날짜에 출석 레코드가 있고 선택 필드가 true면 출석으로 표시
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
      list = list.filter(
        (student) => String(student.GRADE) === attendanceGradeFilter,
      );
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
  }, [filteredStudents, attendanceGradeFilter, searchText]);

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
                    value={form.GRADE}
                    onValueChange={(v) =>
                      setForm({ ...form, GRADE: v as Grade })
                    }
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
                  setStatsGradeFilter(v as "all" | "0" | "1" | "2" | "3")
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="학년" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="0">유치부</SelectItem>
                  <SelectItem value="1">초등부</SelectItem>
                  <SelectItem value="2">중등부</SelectItem>
                  <SelectItem value="3">고등부</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="h-64 mb-6">
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
                      <span className="font-medium text-sm">
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
              onValueChange={(v) =>
                setAttendanceGradeFilter(v as "all" | "0" | "1" | "2" | "3")
              }
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="학년" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="0">유치부</SelectItem>
                <SelectItem value="1">초등부</SelectItem>
                <SelectItem value="2">중등부</SelectItem>
                <SelectItem value="3">고등부</SelectItem>
              </SelectContent>
            </Select>
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
              onChange={(e) => setAttendanceDate(e.target.value)}
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
                      onClick={() => setEditingStudent(student)}
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
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingStudent}
        onOpenChange={(open) => !open && setEditingStudent(null)}
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
                  value={editingStudent.GRADE}
                  onValueChange={(v) =>
                    setEditingStudent({ ...editingStudent, GRADE: v as Grade })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
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
