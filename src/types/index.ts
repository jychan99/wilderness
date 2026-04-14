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
  START_DATE: string;
  END_DATE: string;
  CONTENT: string;
  USER_CODE: string;
  COLOR: string;
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
  POPUP_YN: boolean;
  POPUP_START_AT: string | null;
  POPUP_END_AT: string | null;
}

//담당학년 정보
export interface USER_MANAGE_GRADE {
  USER_CODE: string;
  MANAGE_GRADE: string;
}

//게시판 공통
export interface BOARD {
  ID: number;
  BOARD_CODE: string;
  USER_CODE: string;
  CATEGORY: string;
  TITLE: string;
  CONTENT: string;
  VIEW: number;
  IS_DELETED: boolean;
  IS_PINNED: boolean;
  IS_ANNONYMOUS: boolean;
  CREATED_AT: string; // ISO 날짜 문자열
  UPDATED_AT: string; // ISO 날짜 문자열, 선택적
}

//게시글 좋아요
export interface POST_LIKES {
  POST_ID: number;
  USER_CODE: string;
  IS_LIKE: boolean;
}

//댓글
export interface COMMENTS {
  ID: number;
  POST_ID: number;
  USER_CODE: string;
  PARENT_ID: number;
  CONTENT: string;
  CREATED_AT: string; // ISO 날짜 문자열
}

//댓글 좋아요
export interface COMMENTS_LIKES {
  COMMENT_ID: number;
  USER_CODE: string;
  IS_LIKE: boolean;
}

//CODE

//학년코드
export interface GRADECODE {
  CODE: string;
  NAME: string;
  PARENT_CODE: string;
  LEVEL: number;
}
