import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, USERMAIN } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const mapUserMainToUser = (userMain: USERMAIN): User => {
  // POSITION에서 role 판단
  const role = userMain.POSITION === '회장' || userMain.POSITION === '부회장' ? 'admin' : 'teacher';
  
  return {
    usercode: userMain.USERCODE,
    id: userMain.ID,
    name: userMain.NAME,
    baptismalName: userMain.BAP_NAME,
    position: userMain.POSITION,
    grade: userMain.GRADE,
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
