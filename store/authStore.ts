import { create } from 'zustand';
import type { UserRole } from '@/types/user';

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  pendingRole: UserRole | null;
  hasOnboarded: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
  setPendingRole: (role: UserRole) => void;
  completeOnboarding: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  role: null,
  pendingRole: null,
  hasOnboarded: false,
  login: (role) => set({ isAuthenticated: true, role, pendingRole: null }),
  logout: () => set({ isAuthenticated: false, role: null, pendingRole: null }),
  setPendingRole: (role) => set({ pendingRole: role }),
  completeOnboarding: () => set({ hasOnboarded: true }),
}));
