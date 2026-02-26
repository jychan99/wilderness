import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, USERMAIN } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const mapGradeValue = (grade: USERMAIN['GRADE']): string => {
  const gradeValue = String(grade ?? '');
  const gradeMap: Record<string, string> = {
    '0': '유치부',
    '1': '초등부',
    '2': '중등부',
    '3': '고등부',
    '유치부': '유치부',
    '초등부': '초등부',
    '중등부': '중등부',
    '고등부': '고등부',
    '모든학년': '모든학년',
  };
  return gradeMap[gradeValue] ?? gradeValue;
};

const mapUserMainToUser = (userMain: USERMAIN): User => {
  const positionValue = String(userMain.POSITION ?? '');
  const isAdmin = positionValue === '0' || userMain.POSITION === '회장' || userMain.POSITION === '부회장';
  const role = isAdmin ? 'admin' : 'teacher';

  return {
    usercode: userMain.USERCODE,
    id: userMain.ID,
    name: userMain.NAME,
    baptismalName: userMain.BAP_NAME,
    position: positionValue,
    grade: isAdmin ? '모든학년' : mapGradeValue(userMain.GRADE),
    role,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('USERMAIN')
        .select('*')
        .eq('ID', username)
        .eq('PASSWORD', password)
        .single();
      
      if (error || !data) {
        return false;
      }
      
      const mappedUser = mapUserMainToUser(data as USERMAIN);
      setUser(mappedUser);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
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
