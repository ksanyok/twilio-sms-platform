import { create } from 'zustand';
import { User } from '../types';
import api from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoginLoading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('scl_token'),
  isAuthenticated: false,
  isLoading: true,
  isLoginLoading: false,
  initialized: false,

  login: async (email: string, password: string) => {
    set({ isLoginLoading: true });
    try {
      console.log('[AUTH] Attempting login for:', email);
      const { data } = await api.post('/auth/login', { email, password });
      console.log('[AUTH] Login successful, user:', data.user?.email);
      localStorage.setItem('scl_token', data.token);
      localStorage.setItem('scl_user', JSON.stringify(data.user));
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        isLoginLoading: false,
        initialized: true,
      });
    } catch (err) {
      console.error('[AUTH] Login failed:', err);
      set({ isLoginLoading: false });
      throw err;
    }
  },

  logout: () => {
    console.log('[AUTH] Logging out');
    localStorage.removeItem('scl_token');
    localStorage.removeItem('scl_user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isLoginLoading: false,
    });
  },

  checkAuth: async () => {
    // Prevent multiple calls
    if (get().initialized) return;
    
    const token = localStorage.getItem('scl_token');
    const userStr = localStorage.getItem('scl_user');
    
    console.log('[AUTH] checkAuth — token exists:', !!token, ', user exists:', !!userStr);
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        // Verify token is still valid with the server
        const { data } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('[AUTH] Token verified, user:', data.user?.email);
        set({ 
          user: data.user, 
          token, 
          isAuthenticated: true, 
          isLoading: false,
          initialized: true,
        });
      } catch (err) {
        console.warn('[AUTH] Token invalid, clearing session');
        localStorage.removeItem('scl_token');
        localStorage.removeItem('scl_user');
        set({ user: null, token: null, isAuthenticated: false, isLoading: false, initialized: true });
      }
    } else {
      console.log('[AUTH] No stored session');
      set({ isLoading: false, initialized: true });
    }
  },
}));
