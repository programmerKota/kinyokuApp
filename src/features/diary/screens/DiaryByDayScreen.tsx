import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, FlatList, ScrollView, RefreshControl } from 'react-native';

import { useAuth } from '@app/contexts/AuthContext';
import { ChallengeService, DiaryService } from '@core/services/firestore';
import { useProfile } from '@shared/hooks/useProfile';
import UserProfileWithRank from '@shared/components/UserProfileWithRank';
import { colors, spacing, typography, shadows } from '@shared/theme';
import { formatDateTimeJP } from '@shared/utils/date';
import DayCard from '@features/diary/components/DayCard';

interface DayDiaryItem {
  id: string;
  userId: string;
  content: string;
  createdAt: Date | { toDate?: () => Date };
}

const DiaryByDayScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [day, setDay] = useState<number>(1);
  const [items, setItems] = useState<DayDiaryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    void (async () => {
      if (user?.uid) {
        const active = await ChallengeService.getActiveChallenge(user.uid);
        if (active) {
          const startedAt = (active.startedAt as any)?.toDate?.() || (active.startedAt as any);
          const now = new Date();
          const d = Math.floor((now.getTime() - startedAt.getTime()) / (24 * 3600 * 1000)) + 1;
          if (d > 0) setDay(d);
        }
      }
    })();
  }, [user?.uid]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const list = await DiaryService.getDiariesByDay(day, 200);
        const mapped = list.map((d) => ({
          id: d.id,
          userId: (d as any).userId,
          content: d.content,
          createdAt: (d.createdAt as any)?.toDate?.() || (d.createdAt as any),
        }));
        setItems(mapped);
      } finally {
        setLoading(false);
      }
    })();
  }, [day]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const list = await DiaryService.getDiariesByDay(day, 200);
      const mapped = list.map((d) => ({
        id: d.id,
        userId: (d as any).userId,
        content: d.content,
        createdAt: (d.createdAt as any)?.toDate?.() || (d.createdAt as any),
      }));
      setItems(mapped);
    } finally {
      setRefreshing(false);
    }
  };

  const changeDay = (delta: number) => {
    setDay((prev) => Math.max(1, prev + delta));
  };

  const DiaryItemRow: React.FC<{ item: DayDiaryItem }> = ({ item }) => {
    const prof = useProfile(item.userId);
    return (
      <View style={[styles.card, styles.cardShadow]}>
        <UserProfileWithRank
          userName={prof?.displayName ?? 'ユーザー'}
          userAvatar={prof?.photoURL}
          averageDays={0}
          onPress={() => { }}
          size="medium"
          showRank={false}
          showTitle={true}
          style={{ marginBottom: spacing.xs }}
        />
        <Text style={styles.content}>{item.content}</Text>
        <Text style={styles.date}>{formatDateTimeJP((item.createdAt as any) as Date)}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: DayDiaryItem }) => <DiaryItemRow item={item} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.title}>みんなの日記</Text>
        <TouchableOpacity onPress={() => navigation.navigate('DiaryAdd' as never)} style={styles.iconBtn}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.lg }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: spacing.lg }}>
            <Ionicons name={loading ? 'time-outline' : 'book-outline'} size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
              {loading ? '読み込み中...' : 'この日の記録はまだありません'}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View>
            <View style={styles.daySelector}>
              <TouchableOpacity onPress={() => changeDay(-1)} style={styles.dayBtn}>
                <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.dayText}>{day}日目</Text>
              <TouchableOpacity onPress={() => changeDay(1)} style={styles.dayBtn}>
                <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                <DayCard key={d} day={d} selected={d === day} onPress={() => setDay(d)} />
              ))}
            </ScrollView>
          </View>
        }
        stickyHeaderIndices={[0]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />

      <TouchableOpacity style={[styles.fab, styles.cardShadow]} onPress={() => navigation.navigate('DiaryAdd' as never)}>
        <Ionicons name="create-outline" size={22} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundTertiary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  iconBtn: { padding: spacing.sm },
  title: { flex: 1, textAlign: 'center', fontSize: typography.fontSize.lg, fontWeight: 'bold', color: colors.gray800 },
  daySelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderPrimary },
  dayBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  dayText: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.textPrimary },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderPrimary },
  cardShadow: { shadowColor: shadows.md.shadowColor, shadowOffset: shadows.md.shadowOffset, shadowOpacity: shadows.md.shadowOpacity, shadowRadius: shadows.md.shadowRadius, elevation: shadows.md.elevation },
  content: { fontSize: typography.fontSize.base, color: colors.textPrimary, lineHeight: typography.fontSize.base * 1.6 },
  date: { fontSize: typography.fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  cardsRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, backgroundColor: colors.primary, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});

export default DiaryByDayScreen;
