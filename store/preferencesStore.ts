import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WeightUnit } from '@/types/workout';

interface PreferencesState {
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => void;
  toggleWeightUnit: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      weightUnit: 'kg',
      setWeightUnit: (weightUnit) => set({ weightUnit }),
      toggleWeightUnit: () =>
        set({ weightUnit: get().weightUnit === 'kg' ? 'lb' : 'kg' }),
    }),
    {
      name: 'preferences-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ weightUnit: state.weightUnit }),
    },
  ),
);