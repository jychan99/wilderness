import { Student, MeetingNote, CalendarEvent, AttendanceRecord, AccountingEntry } from '@/types';

export const mockStudents: Student[] = [
  { id: '1', name: '김민수', grade: '초등부', phone: '010-1234-5678', parentPhone: '010-9876-5432' },
  { id: '2', name: '이서연', grade: '초등부', phone: '010-2345-6789', parentPhone: '010-8765-4321' },
  { id: '3', name: '박지훈', grade: '중등부', phone: '010-3456-7890', parentPhone: '010-7654-3210' },
  { id: '4', name: '최유진', grade: '중등부', phone: '010-4567-8901', parentPhone: '010-6543-2109' },
  { id: '5', name: '정하늘', grade: '고등부', phone: '010-5678-9012', parentPhone: '010-5432-1098' },
  { id: '6', name: '강지우', grade: '고등부', phone: '010-6789-0123', parentPhone: '010-4321-0987' },
  { id: '7', name: '윤서준', grade: '유치부', parentPhone: '010-3210-9876' },
  { id: '8', name: '한소율', grade: '유치부', parentPhone: '010-2109-8765' },
];

export const mockMeetingNotes: MeetingNote[] = [
  {
    id: '1',
    title: '2024년 3월 정기 회의',
    content: '1. 부활절 행사 준비 논의\n2. 신규 교사 교육 일정 확정\n3. 학생 출석률 향상 방안 논의\n4. 다음 달 야외 활동 계획\n\n결정사항:\n- 부활절 행사는 3월 31일 진행\n- 신규 교사 교육은 매주 토요일\n- 출석 우수 학생 시상제도 도입',
    author: '이마리아',
    date: '2024-03-10',
    createdAt: '2024-03-10T14:00:00',
  },
  {
    id: '2',
    title: '2024년 2월 정기 회의',
    content: '1. 새학기 준비 사항 점검\n2. 교재 구입 예산 확인\n3. 학년별 담당 교사 배정',
    author: '김요한',
    date: '2024-02-15',
    createdAt: '2024-02-15T14:00:00',
  },
];

export const mockEvents: CalendarEvent[] = [
  { id: '1', title: '부활절 행사', date: '2024-03-31', description: '부활절 특별 행사', color: 'primary' },
  { id: '2', title: '정기 회의', date: '2024-04-14', description: '4월 정기 회의' },
  { id: '3', title: '야외 활동', date: '2024-04-20', description: '봄 소풍' },
];

export const mockAttendance: AttendanceRecord[] = [
  { id: '1', studentId: '1', date: '2024-03-03', present: true },
  { id: '2', studentId: '1', date: '2024-03-10', present: true },
  { id: '3', studentId: '1', date: '2024-03-17', present: false },
  { id: '4', studentId: '1', date: '2024-03-24', present: true },
  { id: '5', studentId: '2', date: '2024-03-03', present: true },
  { id: '6', studentId: '2', date: '2024-03-10', present: true },
  { id: '7', studentId: '2', date: '2024-03-17', present: true },
  { id: '8', studentId: '2', date: '2024-03-24', present: true },
  { id: '9', studentId: '3', date: '2024-03-03', present: false },
  { id: '10', studentId: '3', date: '2024-03-10', present: true },
  { id: '11', studentId: '3', date: '2024-03-17', present: true },
  { id: '12', studentId: '3', date: '2024-03-24', present: false },
];

export const mockAccounting: AccountingEntry[] = [
  { id: '1', date: '2024-03-01', type: 'income', category: '헌금', description: '3월 주일학교 헌금', amount: 500000, registeredBy: '박베드로' },
  { id: '2', date: '2024-03-05', type: 'expense', category: '교재비', description: '초등부 교재 구입', amount: 120000, registeredBy: '박베드로' },
  { id: '3', date: '2024-03-10', type: 'expense', category: '간식비', description: '학생 간식 구입', amount: 50000, registeredBy: '박베드로' },
  { id: '4', date: '2024-03-15', type: 'income', category: '지원금', description: '본당 지원금', amount: 300000, registeredBy: '김요한' },
  { id: '5', date: '2024-03-20', type: 'expense', category: '행사비', description: '부활절 행사 준비', amount: 200000, registeredBy: '박베드로' },
];
