import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { apiAuth } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('inspectra_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('inspectra_token');
      if (storedToken) {
        try {
          const me = await apiAuth.me();
          setUser(me);
          setToken(storedToken);
        } catch {
          localStorage.removeItem('inspectra_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await apiAuth.login(email, pass);
      localStorage.setItem('inspectra_token', res.token);
      setToken(res.token);
      setUser({
        id: res.userId,
        email: res.email,
        role: res.role,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await apiAuth.register(email, pass);
      localStorage.setItem('inspectra_token', res.token);
      setToken(res.token);
      setUser({
        id: res.userId,
        email: res.email,
        role: res.role,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async () => {
    setIsLoading(true);
    try {
      try {
        await login('demo@inspectra.local', 'inspectra123');
      } catch {
        // If demo user does not exist yet, register it
        await register('demo@inspectra.local', 'inspectra123');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await apiAuth.logout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        demoLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
