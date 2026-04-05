import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { useUserId } from '@/hooks/useUserId';
import { updateTrainerProfile } from '@/services/marketplace';
import { getProfile } from '@/services/profiles';
import { SPECIALTY_OPTIONS, type Specialty } from '@/types/marketplace';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

export default function EditProfile() {
  const router = useRouter();
  const userId = useUserId();
  const profile = useAuthStore((s) => s.profile);

  const [bio, setBio] = useState(profile?.bio ?? '');
  const [specialties, setSpecialties] = useState<string[]>(profile?.specialties ?? []);
  const [certifications, setCertifications] = useState(
    (profile?.certifications ?? []).join(', '),
  );
  const [introVideo, setIntroVideo] = useState(profile?.intro_video ?? '');
  const [experienceYears, setExperienceYears] = useState(
    String(profile?.experience_years ?? 0),
  );
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? false);
  const [busy, setBusy] = useState(false);

  const toggleSpecialty = (s: string) => {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const handleSave = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const certs = certifications
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      await updateTrainerProfile(userId, {
        bio: bio.trim() || undefined,
        specialties,
        certifications: certs,
        intro_video: introVideo.trim() || undefined,
        experience_years: Math.max(0, parseInt(experienceYears, 10) || 0),
        is_public: isPublic,
      });
      // Refresh profile in store
      const updated = await getProfile(userId);
      if (updated) useAuthStore.getState().setProfile(updated);
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Button
          title="Back"
          variant="outline"
          icon="chevron-back"
          onPress={() => router.back()}
          style={styles.backBtn}
        />

        <Text style={styles.heading}>Edit Profile</Text>

        <Input
          label="Bio"
          placeholder="Tell clients about yourself…"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />

        <Text style={styles.label}>Specialties</Text>
        <View style={styles.chipGrid}>
          {SPECIALTY_OPTIONS.map((s) => {
            const active = specialties.includes(s);
            return (
              <Pressable
                key={s}
                onPress={() => toggleSpecialty(s)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Input
          label="Certifications (comma-separated)"
          placeholder="NASM-CPT, CSCS, …"
          value={certifications}
          onChangeText={setCertifications}
        />

        <Input
          label="Intro Video URL"
          placeholder="https://youtube.com/…"
          value={introVideo}
          onChangeText={setIntroVideo}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Input
          label="Years of Experience"
          placeholder="0"
          value={experienceYears}
          onChangeText={setExperienceYears}
          keyboardType="number-pad"
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Public Profile</Text>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: colors.border, true: colors.accent + '60' }}
            thumbColor={isPublic ? colors.accent : colors.textMuted}
          />
        </View>
        <Text style={styles.hint}>
          When public, clients can discover you in the marketplace.
        </Text>

        <Button
          title={busy ? 'Saving…' : 'Save Changes'}
          icon="checkmark-outline"
          onPress={handleSave}
          disabled={busy}
          style={styles.saveBtn}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  heading: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  chipTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: -spacing.sm,
  },
  saveBtn: {
    marginTop: spacing.md,
  },
});
