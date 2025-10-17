import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, View, FlatList, TouchableOpacity, Text } from "react-native";
import AppStatusBar from "@shared/theme/AppStatusBar";

import { useAuth } from "@app/contexts/AuthContext";
import type { RootStackParamList } from "@app/navigation/RootNavigator";
import { BlockService } from "@core/services/firestore";
import UserProfileWithRank from "@shared/components/UserProfileWithRank";
import { spacing, typography, useAppTheme } from "@shared/theme";
import { navigateToUserDetail } from "@shared/utils/navigation";

export interface SimpleUser {
  id: string;
  displayName: string;
  photoURL?: string;
}

const BlockedUsersScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<SimpleUser[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = BlockService.subscribeBlockedIds(user.uid, (ids) => {
      setBlockedIds(new Set(ids));
    });
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { FirestoreUserService } = await import(
          "@core/services/firestore"
        );
        const list: SimpleUser[] = [];
        for (const id of blockedIds) {
          try {
            const u = await FirestoreUserService.getUserById(id);
            if (u)
              list.push({
                id,
                displayName: u.displayName || "ユーザー",
                photoURL: u.photoURL ?? undefined,
              });
          } catch { }
        }
        if (!cancelled) setUsers(list);
      } catch { }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [blockedIds]);

  const empty = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>ブロック中のユーザーはいません</Text>
      </View>
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBar />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ padding: spacing.sm }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ブロック中のユーザー</Text>
        <View style={{ width: 22 }} />
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.item}
            onPress={() =>
              navigateToUserDetail(
                navigation as any,
                item.id,
                item.displayName,
                item.photoURL ?? undefined,
              )
            }
          >
            <UserProfileWithRank
              userName={item.displayName}
              userAvatar={item.photoURL}
              averageDays={0}
              size="small"
              showRank={false}
              showTitle={false}
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={empty}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: colors.gray800,
  },
  listContent: {
    padding: spacing.lg,
  },
  item: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textSecondary,
  },
});

export default BlockedUsersScreen;
