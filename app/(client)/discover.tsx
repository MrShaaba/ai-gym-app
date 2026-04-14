import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTrainerSearch } from '@/hooks/useTrainerSearch';
import type { TrainerPublicProfile } from '@/types/marketplace';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

/** Compact filter labels → specialty values used in the DB. */
const FILTER_CHIPS = [
  { label: 'Strength', value: 'Strength' },
  { label: 'Hypertrophy', value: 'Hypertrophy' },
  { label: 'Fat Loss', value: 'Weight Loss' },
  { label: 'HIIT', value: 'HIIT' },
  { label: 'Power', value: 'Powerlifting' },
  { label: 'Mobility', value: 'Flexibility' },
  { label: 'Rehab', value: 'Rehabilitation' },
  { label: 'Endurance', value: 'Endurance' },
] as const;

export default function Discover() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const { trainers: allTrainers, loading, refetch } = useTrainerSearch(query, '');

  // AND filter: trainer must have ALL selected specialties
  const trainers = useMemo(() => {
    if (selectedSpecialties.length === 0) return allTrainers;
    return allTrainers.filter((t) =>
      selectedSpecialties.every((s) => t.specialties.includes(s)),
    );
  }, [allTrainers, selectedSpecialties]);

  const handleTrainerPress = (trainer: TrainerPublicProfile) => {
    router.push({ pathname: '/(client)/trainer-profile', params: { id: trainer.id } });
  };

  const toggleSpecialty = (s: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const stars: string[] = [];
    for (let i = 0; i < full; i++) stars.push('star');
    if (half) stars.push('star-half');
    while (stars.length < 5) stars.push('star-outline');
    return stars;
  };

  const renderTrainer = useCallback(
    ({ item }: { item: TrainerPublicProfile }) => (
      <Pressable onPress={() => handleTrainerPress(item)}>
        <Card style={styles.trainerCard}>
          <View style={styles.cardTop}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>
                {item.fullName
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.trainerName}>{item.fullName}</Text>
              {item.username && (
                <Text style={styles.trainerUsername}>@{item.username}</Text>
              )}
              <View style={styles.starRow}>
                {renderStars(item.ratingAvg).map((icon, i) => (
                  <Ionicons
                    key={i}
                    name={icon as any}
                    size={14}
                    color={colors.warning}
                  />
                ))}
                <Text style={styles.ratingText}>
                  {item.ratingAvg > 0 ? item.ratingAvg.toFixed(1) : '—'} ({item.ratingCount})
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>
          {item.specialties.length > 0 && (
            <View style={styles.specRow}>
              {item.specialties.slice(0, 3).map((s) => (
                <Badge key={s} label={s} />
              ))}
              {item.specialties.length > 3 && (
                <Text style={styles.moreText}>+{item.specialties.length - 3}</Text>
              )}
            </View>
          )}
          {item.experienceYears > 0 && (
            <Text style={styles.expText}>
              {item.experienceYears} year{item.experienceYears !== 1 ? 's' : ''} experience
            </Text>
          )}
        </Card>
      </Pressable>
    ),
    [],
  );

  return (
    <Screen>
        <View style={styles.container}>
          <Text style={styles.heading}>Discover Trainers</Text>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or username…"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <FlatList
          horizontal
          data={FILTER_CHIPS}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => toggleSpecialty(item.value)}
              style={[
                styles.filterChip,
                selectedSpecialties.includes(item.value) && styles.filterChipActive,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.filterChipText,
                  selectedSpecialties.includes(item.value) && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />

          <FlatList
            data={trainers}
            keyExtractor={(item) => item.id}
            renderItem={renderTrainer}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>
                  {loading ? 'Searching…' : 'No trainers found'}
                </Text>
              </View>
            }
          />
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    paddingBottom: 0,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
  },
  filterRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  filterChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.accent + '15',
    borderColor: colors.accent,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  list: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  trainerCard: {
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
  },
  trainerName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  trainerUsername: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  ratingText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginLeft: spacing.xs,
  },
  specRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  moreText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    alignSelf: 'center',
  },
  expText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
});
