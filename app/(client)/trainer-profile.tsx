import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useUserId } from '@/hooks/useUserId';
import { useReviews } from '@/hooks/useReviews';
import { getTrainerPublicProfile, requestTraining } from '@/services/marketplace';
import type { TrainerPublicProfile } from '@/types/marketplace';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

export default function TrainerProfileDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const { reviews, loading: reviewsLoading } = useReviews(id);

  const [trainer, setTrainer] = useState<TrainerPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await getTrainerPublicProfile(id);
        setTrainer(data);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleRequest = async () => {
    if (!userId || !id) return;
    setRequesting(true);
    try {
      await requestTraining(userId, id);
      Alert.alert(
        'Request Sent',
        'The trainer will review your request and accept you as a client.',
      );
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('duplicate') || e?.code === '23505' || msg.includes('already')) {
        Alert.alert('Already Linked', msg || 'You are already connected with this trainer.');
      } else if (msg.includes('row-level security') || msg.includes('policy')) {
        Alert.alert('Already Linked', 'You are already connected with this trainer.');
      } else {
        Alert.alert('Error', msg || 'Failed to send request.');
      }
    } finally {
      setRequesting(false);
    }
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

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </Screen>
    );
  }

  if (!trainer) {
    return (
      <Screen>
        <View style={styles.container}>
          <Button title="Back" variant="outline" icon="chevron-back" onPress={() => router.back()} />
          <View style={styles.center}>
            <Text style={styles.loadingText}>Trainer not found.</Text>
          </View>
        </View>
      </Screen>
    );
  }

  const initials = trainer.fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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

        {/* Header */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.name}>{trainer.fullName}</Text>
          {trainer.username && (
            <Text style={styles.username}>@{trainer.username}</Text>
          )}
          <View style={styles.starRow}>
            {renderStars(trainer.ratingAvg).map((icon, i) => (
              <Ionicons key={i} name={icon as any} size={18} color={colors.warning} />
            ))}
            <Text style={styles.ratingLabel}>
              {trainer.ratingAvg > 0 ? trainer.ratingAvg.toFixed(1) : '—'} ({trainer.ratingCount} reviews)
            </Text>
          </View>
        </View>

        {/* Bio */}
        {trainer.bio && (
          <Card style={styles.card}>
            <Text style={styles.bioText}>{trainer.bio}</Text>
          </Card>
        )}

        {/* Specialties */}
        {trainer.specialties.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Specialties</Text>
            <View style={styles.tagRow}>
              {trainer.specialties.map((s) => (
                <Badge key={s} label={s} size="md" />
              ))}
            </View>
          </>
        )}

        {/* Certifications */}
        {trainer.certifications.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Certifications</Text>
            <View style={styles.certRow}>
              {trainer.certifications.map((cert) => (
                <View key={cert} style={styles.certBadge}>
                  <Ionicons name="ribbon-outline" size={14} color={colors.accent} />
                  <Text style={styles.certText}>{cert}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Experience */}
        {trainer.experienceYears > 0 && (
          <Card style={styles.card}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Experience</Text>
              <Text style={styles.statValue}>
                {trainer.experienceYears} year{trainer.experienceYears !== 1 ? 's' : ''}
              </Text>
            </View>
          </Card>
        )}

        {/* Request Training */}
        <Button
          title={requesting ? 'Sending…' : 'Request Training'}
          icon="fitness-outline"
          onPress={handleRequest}
          disabled={requesting}
          style={styles.requestBtn}
        />

        {/* Reviews */}
        <Text style={styles.sectionTitle}>
          Reviews {reviews.length > 0 ? `(${reviews.length})` : ''}
        </Text>
        {reviews.length === 0 ? (
          <Text style={styles.emptyReviews}>No reviews yet.</Text>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>{review.clientName}</Text>
                <View style={styles.starRow}>
                  {renderStars(review.rating).map((icon, i) => (
                    <Ionicons key={i} name={icon as any} size={12} color={colors.warning} />
                  ))}
                </View>
              </View>
              {review.title ? (
                <Text style={styles.reviewTitle}>{review.title}</Text>
              ) : null}
              {review.body ? (
                <Text style={styles.reviewBody}>{review.body}</Text>
              ) : null}
              <Text style={styles.reviewDate}>
                {new Date(review.createdAt).toLocaleDateString()}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.accent,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  username: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.sm,
  },
  ratingLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
  },
  card: {
    marginBottom: spacing.lg,
  },
  bioText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  certRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  certText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  requestBtn: {
    marginBottom: spacing.xl,
  },
  emptyReviews: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
  },
  reviewCard: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewAuthor: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  reviewTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  reviewBody: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  reviewDate: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
});
