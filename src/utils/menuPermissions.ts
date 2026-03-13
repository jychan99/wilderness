// 직책 코드
export const POSITION_CODES = {
  ADMIN: "0",
  CHAIRPERSON: "1",
  VICE_CHAIRPERSON: "2",
  TREASURER: "3",
  SECRETARY: "4",
  GENERAL: "5",
} as const;

// 메뉴 권한 정의
export const MENU_PERMISSIONS = {
  dashboard: {
    label: "대시보드",
    allowedPositions: ["0", "1", "2", "3", "4", "5"], // ALL
  },
  notifications: {
    label: "공지사항",
    allowedPositions: ["0", "1", "2", "3", "4", "5"], // ALL
  },
  freeboard: {
    label: "자유게시판",
    allowedPositions: ["0", "1", "2", "3", "4", "5"], // ALL
  },
  students: {
    label: "학생관리",
    allowedPositions: ["0", "1", "2", "3", "4", "5"], // ALL
  },
  teachers: {
    label: "교사관리",
    allowedPositions: ["0", "1"], // 관리자, 회장
  },
  meetings: {
    label: "회의록",
    allowedPositions: ["0", "1", "2", "3", "4", "5"], // ALL
  },
  accounting: {
    label: "전산회계",
    allowedPositions: ["0", "1", "3"], // 관리자, 회장, 총무
  },
  admin: {
    label: "관리자",
    allowedPositions: ["0"], // 관리자 ONLY
  },
};

// 사용자가 특정 메뉴에 접근 가능한지 확인
export const canAccessMenu = (
  userPosition: string | undefined,
  menuKey: keyof typeof MENU_PERMISSIONS,
): boolean => {
  if (!userPosition) return false;
  const permission = MENU_PERMISSIONS[menuKey];
  return permission.allowedPositions.includes(userPosition);
};

// 사용자가 접근 가능한 메뉴 목록 반환
export const getAccessibleMenus = (userPosition: string | undefined) => {
  if (!userPosition) return [];
  return Object.entries(MENU_PERMISSIONS)
    .filter(([_, permission]) =>
      permission.allowedPositions.includes(userPosition),
    )
    .map(([key]) => key);
};

// 직책코드를 한글명으로 변환
export const getPositionLabel = (positionCode: string | undefined): string => {
  const positionMap: Record<string, string> = {
    "0": "관리자",
    "1": "회장",
    "2": "부회장",
    "3": "총무",
    "4": "서기",
    "5": "일반",
  };
  return positionMap[positionCode || "5"] || "일반";
};

// 학년코드를 한글명으로 변환
export const getGradeLabel = (gradeCode: string | undefined): string => {
  const gradeMap: Record<string, string> = {
    "0": "모든학년",
    "1": "유치부",
    "2": "초등부",
    "3": "중등부",
    "4": "고등부",
    모든학년: "모든학년",
    유치부: "유치부",
    초등부: "초등부",
    중등부: "중등부",
    고등부: "고등부",
  };
  return gradeMap[gradeCode || "0"] || gradeCode || "모든학년";
};
