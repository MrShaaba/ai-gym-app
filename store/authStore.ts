import { create } from 'zustand';
import type { UserRole } from '@/types/user';

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  hasOnboarded: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
  completeOnboarding: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  role: null,
  hasOnboarded: false,
  login: (role) => set({ isAuthenticated: true, role }),
  logout: () => set({ isAuthenticated: false, role: null }),
  completeOnboarding: () => set({ hasOnboarded: true }),
}));
