export type Role = 'teacher' | 'admin';

export type Position = '회장' | '부회장' | '총무' | '서기' | '';

export type Grade = '모든학년' | '유치부' | '초등부' | '중등부' | '고등부';

export interface User {
  id: string;
  name: string;
  baptismalName: string; // 세례명
  username: string;
  password: string;
  role: Role;
  position: Position;
  grade: Grade;
}

export interface Student {
  id: string;
  name: string;
  grade: Grade;
  phone?: string;
  parentPhone?: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  present: boolean;
}

export interface MeetingNote {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  description?: string;
  color?: string;
}

export interface AccountingEntry {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  registeredBy: string;
}
