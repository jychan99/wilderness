import React, { createContext, useContext, useState, ReactNode } from "react";
import { User, USER_MAIN } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const mapGradeValue = (grade: number | string): string => {
  const gradeValue = String(grade ?? "");

  // 코드 형식을 한글로 변환
  const codeMap: Record<string, string> = {
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

  if (codeMap[gradeValue]) return codeMap[gradeValue];

  // 레거시 숫자 코드 지원
  const legacyMap: Record<string, string> = {
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
  return legacyMap[gradeValue] ?? "모든학년";
};

const mapUserMainToUser = (
  userMain: USER_MAIN,
  manageGrades?: string[],
): User => {
  const positionValue = String(userMain.POSITION ?? "");
  const isAdmin =
    positionValue === "0" || userMain.POSITION === 1 || userMain.POSITION === 2;
  const role = isAdmin ? "admin" : "teacher";

  // 관리자는 "모든학년", 교사는 담당하는 모든 학년을 쉼표로 연결
  let grade = "모든학년";
  if (!isAdmin && manageGrades && manageGrades.length > 0) {
    // 다중 학년을 쉼표로 연결 (예: "초2,중2")
    grade = manageGrades.join(",");
  }

  return {
    USER_CODE: userMain.USER_CODE,
    id: userMain.ID,
    name: userMain.NAME,
    baptismalName: userMain.BAP_NAME,
    position: positionValue,
    grade,
    role,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (
    username: string,
    password: string,
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("USER_MAIN")
        .select("*")
        .eq("ID", username)
        .eq("PASSWORD", password)
        .single();

      if (error || !data) {
        return false;
      }

      const userData = data as USER_MAIN;

      // USER_MANAGE_GRADE 테이블에서 담당학년 조회 (다중 학년 배열로)
      const { data: gradeData } = await supabase
        .from("USER_MANAGE_GRADE")
        .select("MANAGE_GRADE")
        .eq("USER_CODE", userData.USER_CODE);

      const manageGrades = (gradeData || [])
        .map((row: any) => {
          const raw = String(row.MANAGE_GRADE ?? "");
          return mapGradeValue(raw);
        })
        .filter((grade: string) => grade && grade !== "모든학년");

      const mappedUser = mapUserMainToUser(userData, manageGrades);
      setUser(mappedUser);
      return true;
    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
