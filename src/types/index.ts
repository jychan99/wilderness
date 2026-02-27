export type Role = "teacher" | "admin";

export type Position =
  | "관리자"
  | "회장"
  | "부회장"
  | "총무"
  | "서기"
  | "일반"
  | "";

export type Grade = "모든학년" | "유치부" | "초등부" | "중등부" | "고등부";

//사용자(로그인)
export interface User {
  USER_CODE: string;
  id: string;
  name: string;
  baptismalName: string;
  position: string;
  grade: string;
  role: Role;
}

//사용자 메인
export interface USERMAIN {
  USER_CODE: string;
  ID: string;
  NAME: string;
  BAP_NAME: string; // 세례명
  PASSWORD: string;
  POSITION: number;
  MANAGE_GRADE: number;
}

//학생메인
export interface STUMAIN {
  USER_CODE: string;
  NAME: string;
  BAP_NAME: string; // 세례명
  GRADE: string;
  NAME_DAY: string; // 축일
  CONTACT: string;
  FAMILY_CONTACT: string;
  NOTE: string;
}

//출석
export interface ATTENDANCE {
  ID: string;
  USER_CODE: string;
  NAME: string;
  DATE: string; // YYYY-MM-DD
  PRESENT_YN: boolean;
}

//회의록
export interface MEETING {
  ID: string;
  TITLE: string;
  CONTENT: string;
  AUTHOR: string;
  DATE: string;
}

//일정
export interface SCHEDULE {
  ID: string;
  TITLE: string;
  DATE: string;
  CONTENT: string;
}

//전산회계
export interface ACCOUNT {
  ID: string;
  DATE: string;
  TYPE: "income" | "expense";
  CATEGORY: string;
  CONTENT: string;
  AMOUNT: number;
  REGISTERED_BY: string;
}

//공지사항
export interface NOTIFICATION {
  ID: string;
  TITLE: string;
  CONTENT: string;
  AUTHOR: string;
  POSITION: string;
  CREATED_AT: string;
}
