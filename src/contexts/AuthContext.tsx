import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const defaultUsers: User[] = [
  {
    id: '1',
    name: '김요한',
    baptismalName: '요한',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    position: '회장',
    grade: '모든학년',
  },
  {
    id: '2',
    name: '이마리아',
    baptismalName: '마리아',
    username: 'teacher1',
    password: 'teacher123',
    role: 'teacher',
    position: '서기',
    grade: '초등부',
  },
  {
    id: '3',
    name: '박베드로',
    baptismalName: '베드로',
    username: 'teacher2',
    password: 'teacher123',
    role: 'teacher',
    position: '총무',
    grade: '중등부',
  },
  {
    id: '4',
    name: '최안나',
    baptismalName: '안나',
    username: 'teacher3',
    password: 'teacher123',
    role: 'teacher',
    position: '부회장',
    grade: '고등부',
  },
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users] = useState<User[]>(() => {
    const stored = localStorage.getItem('erp-users');
    return stored ? JSON.parse(stored) : defaultUsers;
  });

  const login = (username: string, password: string): boolean => {
    const allUsers = JSON.parse(localStorage.getItem('erp-users') || JSON.stringify(defaultUsers));
    const found = allUsers.find((u: User) => u.username === username && u.password === password);
    if (found) {
      setUser(found);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
