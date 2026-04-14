import { useState } from 'react';
import { ClientTabSwipeView } from '@/components/navigation/ClientTabSwipeView';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ProgramsContent } from './programs';
import { ScheduleContent } from './schedule';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@/config/theme';

const SEGMENTS = [
  { key: 'programs', label: 'Programs' },
  { key: 'schedule', label: 'Schedule' },
];

export default function Plans() {
  const [activeTab, setActiveTab] = useState('programs');

  return (
    <Screen>
      <ClientTabSwipeView routeKey="plans">
        <View style={styles.segmentRow}>
          <SegmentedControl
            segments={SEGMENTS}
            activeKey={activeTab}
            onSelect={setActiveTab}
          />
        </View>
        {activeTab === 'programs' ? <ProgramsContent /> : <ScheduleContent />}
      </ClientTabSwipeView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segmentRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
});
