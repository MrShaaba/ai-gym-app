import { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUserId } from '@/hooks/useUserId';
import { supabase } from '@/config/supabase';
import { linkClient } from '@/services/trainer';
import { findByUsername } from '@/services/marketplace';
import type { InviteType } from '@/types/marketplace';
import { TRAINER_LOOP } from '@/config/copy';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const TABS: { key: InviteType; label: string; icon: string }[] = [
  { key: 'email', label: 'Email', icon: 'mail-outline' },
  { key: 'username', label: 'Username', icon: 'at-outline' },
  { key: 'phone', label: 'Phone', icon: 'call-outline' },
];

export default function InviteClient() {
  const router = useRouter();
  const userId = useUserId();
  const [tab, setTab] = useState<InviteType>('email');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleInvite = async () => {
    setError('');
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      setError(`Enter a valid ${tab}.`);
      return;
    }

    const trainerId = userId;
    if (!trainerId) {
      setError('Not signed in. Please close the app and sign in again.');
      return;
    }

    setBusy(true);
    try {
      if (tab === 'phone') {
        setError('Phone invite is not supported in this pass. Use email or username for an existing account.');
        return;
      }

      if (tab === 'email') {
        // Existing email-based flow via RPC
        const { data, error: rpcErr } = await supabase.rpc('find_user_by_email', {
          lookup_email: trimmed,
        });
        if (rpcErr || !data) {
          setError('No account found with that email. Email invites for non-users are not supported in this pass.');
          return;
        }
        const clientId = data as string;
        if (clientId === trainerId) {
          setError('You cannot link yourself as a client.');
          return;
        }
        await linkClient(trainerId, clientId);
        Alert.alert(TRAINER_LOOP.clientLinkedTitle, TRAINER_LOOP.clientLinkedBody, [
          {
            text: TRAINER_LOOP.btnAssignWorkout,
            onPress: () => {
              router.back();
              setTimeout(() => router.push({ pathname: '/(trainer)/assign', params: { clientId, clientName: trimmed } }), 100);
            },
          },
          { text: TRAINER_LOOP.btnDone, style: 'cancel', onPress: () => router.back() },
        ]);
      } else if (tab === 'username') {
        const found = await findByUsername(trimmed.replace(/^@/, ''));
        if (!found) {
          setError('No account found with that username. Username invites for non-users are not supported in this pass.');
          return;
        }
        if (found.id === trainerId) {
          setError('You cannot link yourself.');
          return;
        }
        await linkClient(trainerId, found.id);
        Alert.alert(TRAINER_LOOP.clientLinkedTitle, TRAINER_LOOP.clientLinkedNameBody(found.full_name), [
          {
            text: TRAINER_LOOP.btnAssignWorkout,
            onPress: () => {
              router.back();
              setTimeout(() => router.push({ pathname: '/(trainer)/assign', params: { clientId: found.id, clientName: found.full_name } }), 100);
            },
          },
          { text: TRAINER_LOOP.btnDone, style: 'cancel', onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      if (e?.message?.includes('duplicate') || e?.code === '23505') {
        setError('This client is already linked to your account.');
      } else {
        setError(e.message ?? 'Failed to link client.');
      }
    } finally {
      setBusy(false);
    }
  };

  const placeholder =
    tab === 'email'
      ? 'client@example.com'
      : tab === 'username'
        ? '@username'
        : '+1 234 567 8900';

  const keyboardType =
    tab === 'email'
      ? ('email-address' as const)
      : tab === 'phone'
        ? ('phone-pad' as const)
        : ('default' as const);

  return (
    <Screen>
      <View style={styles.container}>
        <Button
          title="Back"
          variant="outline"
          icon="chevron-back"
          onPress={() => router.back()}
          style={styles.backBtn}
        />

        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-add" size={28} color={colors.accent} />
          </View>
          <Text style={styles.title}>Invite Client</Text>
          <Text style={styles.subtitle}>
            Find or invite your client to link them to your account.
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => { setTab(t.key); setValue(''); setError(''); }}
              style={[styles.tab, tab === t.key && styles.tabActive]}
            >
              <Ionicons
                name={t.icon as any}
                size={16}
                color={tab === t.key ? colors.accent : colors.textMuted}
              />
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Card style={styles.card}>
          <Input
            key={tab}
            label={`Client ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
            placeholder={placeholder}
            keyboardType={keyboardType}
            autoCapitalize="none"
            value={value}
            onChangeText={setValue}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={tab === 'phone' ? 'Phone Invite Not Available' : busy ? 'Linking…' : 'Link Client'}
            icon="link-outline"
            onPress={handleInvite}
            disabled={busy || !value.trim() || tab === 'phone'}
            style={styles.submitBtn}
          />
        </Card>

        <Card style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          <Text style={styles.infoText}>
            {tab === 'email'
              ? 'Use email only for a client who already has an AI Gym account. New-user email invites are not supported in this pass.'
              : tab === 'username'
                ? 'Use username only for an existing AI Gym account. New-user username invites are not supported in this pass.'
                : 'Phone invite is not supported in this pass. Use email or username for an existing AI Gym account.'}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    flex: 1,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.accent,
  },
  card: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  error: {
    color: '#F87171',
    fontSize: fontSize.sm,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    flex: 1,
    lineHeight: 20,
  },
});
