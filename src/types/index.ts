export type Role = "teacher" | "admin";

export type Position =
  | "관리자"
  | "회장"
  | "부회장"
  | "총무"
  | "서기"
  | "일반"
  | "";

export type Grade =
  | "모든학년"
  | "유치부"
  | "초등부"
  | "초1"
  | "초2"
  | "초3"
  | "초4"
  | "초5"
  | "초6"
  | "중등부"
  | "중1"
  | "중2"
  | "중3"
  | "고등부"
  | "고1"
  | "고2"
  | "고3"
  | "";

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
export interface USER_MAIN {
  USER_CODE: string;
  ID: string;
  NAME: string;
  BAP_NAME: string; // 세례명
  PASSWORD: string;
  POSITION: number;
  USE_YN: boolean;
}

//학생메인
export interface STU_MAIN {
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
  MISSA_YN: boolean;
  DOCTRINE_YN: boolean;
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

//담당학년 정보
export interface USER_MANAGE_GRADE {
  USER_CODE: string;
  MANAGE_GRADE: string;
}

//CODE

//학년코드
export interface GRADECODE {
  CODE: string;
  NAME: string;
  PARENT_CODE: string;
  LEVEL: number;
}
