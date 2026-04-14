import { create } from 'zustand';
import type { EntitlementRecord, ResolvedEntitlement } from '@/types/entitlement';
import type { UserRole } from '@/types/user';
import { ensureTrialRecord, loadEntitlementRecord, resolveEntitlement, syncBillingEntitlement } from '@/services/entitlements';

interface EntitlementState {
  loading: boolean;
  record: EntitlementRecord | null;
  resolved: ResolvedEntitlement | null;
  hydrate: (userId: string | undefined, role: UserRole | null) => Promise<void>;
  refresh: (userId: string | undefined, role: UserRole | null) => Promise<void>;
  reset: () => void;
}

export const useEntitlementStore = create<EntitlementState>((set) => ({
  loading: true,
  record: null,
  resolved: null,

  hydrate: async (userId, role) => {
    if (!userId) {
      set({ loading: false, record: null, resolved: null });
      return;
    }

    set({ loading: true });
    const seededRecord = role === 'client'
      ? await ensureTrialRecord(userId)
      : await loadEntitlementRecord(userId);
    const record = await syncBillingEntitlement(userId, seededRecord);
    const resolved = resolveEntitlement(record, role);
    set({ loading: false, record, resolved });
  },

  refresh: async (userId, role) => {
    if (!userId) {
      set({ loading: false, record: null, resolved: null });
      return;
    }

    set({ loading: true });
    const record = await syncBillingEntitlement(userId);
    const resolved = resolveEntitlement(record, role);
    set({ loading: false, record, resolved });
  },

  reset: () => set({ loading: false, record: null, resolved: null }),
}));