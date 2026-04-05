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
import { findByUsername, createInvite } from '@/services/marketplace';
import type { InviteType } from '@/types/marketplace';
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
      if (tab === 'email') {
        // Existing email-based flow via RPC
        const { data, error: rpcErr } = await supabase.rpc('find_user_by_email', {
          lookup_email: trimmed,
        });
        if (rpcErr || !data) {
          setError('No account found with that email.');
          return;
        }
        const clientId = data as string;
        if (clientId === trainerId) {
          setError('You cannot link yourself as a client.');
          return;
        }
        await linkClient(trainerId, clientId);
        Alert.alert('Client Linked', 'They will now appear in your client list.', [
          { text: 'Done', onPress: () => router.back() },
        ]);
      } else if (tab === 'username') {
        const found = await findByUsername(trimmed.replace(/^@/, ''));
        if (!found) {
          // No existing user — create a pending invite
          await createInvite(trainerId, 'username', trimmed.replace(/^@/, ''));
          Alert.alert(
            'Invite Created',
            'A pending invite has been created. When they sign up with this username, they will be auto-linked.',
            [{ text: 'OK', onPress: () => router.back() }],
          );
          return;
        }
        if (found.id === trainerId) {
          setError('You cannot link yourself.');
          return;
        }
        await linkClient(trainerId, found.id);
        Alert.alert('Client Linked', `${found.full_name} has been added.`, [
          { text: 'Done', onPress: () => router.back() },
        ]);
      } else {
        // Phone — create a pending invite
        await createInvite(trainerId, 'phone', trimmed);
        Alert.alert(
          'Invite Created',
          'A pending invite for this phone number has been created.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
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
            label={`Client ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
            placeholder={placeholder}
            keyboardType={keyboardType}
            autoCapitalize="none"
            value={value}
            onChangeText={setValue}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={busy ? 'Linking…' : 'Link Client'}
            icon="link-outline"
            onPress={handleInvite}
            disabled={busy || !value.trim()}
            style={styles.submitBtn}
          />
        </Card>

        <Card style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          <Text style={styles.infoText}>
            {tab === 'email'
              ? 'Your client must have an existing AI Gym account with this email.'
              : tab === 'username'
                ? 'If the username exists, they\'ll be linked instantly. Otherwise a pending invite is created.'
                : 'A pending invite will be created for this phone number.'}
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
