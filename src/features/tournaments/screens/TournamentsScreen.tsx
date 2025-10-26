import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { TournamentStackParamList } from "@app/navigation/TournamentStackNavigator";
import CreateTournamentModal from "@features/tournaments/components/CreateTournamentModal";
import MemoizedTournamentCard from "@features/tournaments/components/MemoizedTournamentCard";
import VirtualizedList from "@features/tournaments/components/VirtualizedList";
import useTournaments, {
  type TournamentListItem,
} from "@features/tournaments/hooks/useTournaments";
import ConfirmDialog from "@shared/components/ConfirmDialog";
import useErrorHandler from "@shared/hooks/useErrorHandler";
import {
  shadows,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
} from "@shared/theme";
import AppStatusBar from "@shared/theme/AppStatusBar";
import { colorSchemes, type ColorPalette } from "@shared/theme/colors";
import { createUiStyles } from "@shared/ui/styles";
import { navigateToUserDetail } from "@shared/utils/navigation";

type TournamentsScreenNavigationProp = StackNavigationProp<
  TournamentStackParamList,
  "TournamentsList"
>;

const TournamentsScreen: React.FC = () => {
  const navigation = useNavigation<TournamentsScreenNavigationProp>();
  const { handleError } = useErrorHandler();
  const { mode } = useAppTheme();
  const uiStyles = useThemedStyles(createUiStyles);
  const styles = useThemedStyles(createStyles);
  const colors = useMemo(() => colorSchemes[mode], [mode]);

  const [
    {
      tournaments,
      visibleTournaments,
      filter,
      loading,
      refreshing,
      showCreateModal,
      myIds,
    },
    {
      setFilter,
      setShowCreateModal,
      refresh,
      createTournament,
      joinTournament,
      toggleRecruitment,
      deleteTournament,
    },
  ] = useTournaments();

  const [confirm, setConfirm] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    onConfirm?: () => void;
    loading?: boolean;
  }>({ visible: false });

  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch (error) {
      handleError(
        error,
        { component: "TournamentsScreen", action: "pullToRefresh" },
        { fallbackMessage: "更新に失敗しました" },
      );
    }
  }, [refresh, handleError]);

  const handleCreate = useCallback(
    async (data: { name: string; description: string }) => {
      try {
        await createTournament(data);
        Alert.alert("作成完了", "トーナメントを作成しました。");
        setShowCreateModal(false);
      } catch (error) {
        handleError(
          error,
          { component: "TournamentsScreen", action: "createTournament" },
          { fallbackMessage: "トーナメントの作成に失敗しました" },
        );
      }
    },
    [createTournament, handleError, setShowCreateModal],
  );

  const handleJoinTournament = useCallback(
    async (tournamentId: string) => {
      const target = tournaments.find((t) => t.id === tournamentId);
      if (!target) return;

      if (myIds.has(target.ownerId)) {
        Alert.alert(
          "トーナメント作成者",
          "あなたが作成したトーナメントには参加できません。",
        );
        return;
      }

      if (target.recruitmentOpen === false) {
        Alert.alert("募集停止中", "現在このトーナメントは募集停止中です。");
        return;
      }

      try {
        await joinTournament(tournamentId);
        Alert.alert(
          "申請しました",
          "参加申請を送信しました。オーナーの承認をお待ちください。",
        );
      } catch (error) {
        handleError(
          error,
          { component: "TournamentsScreen", action: "joinTournament" },
          { fallbackMessage: "トーナメントへの参加申請に失敗しました" },
        );
      }
    },
    [tournaments, joinTournament, handleError, myIds],
  );

  const handleToggleRecruitment = useCallback(
    async (id: string, open: boolean) => {
      try {
        await toggleRecruitment(id, open);
      } catch (error) {
        handleError(
          error,
          { component: "TournamentsScreen", action: "toggleRecruitment" },
          { fallbackMessage: "募集状態の切り替えに失敗しました" },
        );
      }
    },
    [toggleRecruitment, handleError],
  );

  const handleDeleteTournament = useCallback(
    (id: string) => {
      setConfirm({
        visible: true,
        title: "トーナメントを削除",
        message: "この操作は取り消せません。削除しますか？",
        onConfirm: () => {
          void (async () => {
            setConfirm((s) => ({ ...s, loading: true }));
            try {
              await deleteTournament(id);
            } catch (error) {
              handleError(
                error,
                { component: "TournamentsScreen", action: "deleteTournament" },
                { fallbackMessage: "トーナメントの削除に失敗しました" },
              );
            } finally {
              setConfirm({ visible: false });
            }
          })();
        },
      });
    },
    [deleteTournament, handleError],
  );

  const handleViewTournament = useCallback(
    (idOrUserKey: string) => {
      if (idOrUserKey.startsWith("user:")) {
        const ownerId = idOrUserKey.replace("user:", "");
        const target = tournaments.find((t) => t.ownerId === ownerId);
        navigateToUserDetail(
          navigation,
          ownerId,
          target?.ownerName,
          target?.ownerAvatar,
        );
        return;
      }
      navigation.navigate("TournamentRoom", { tournamentId: idOrUserKey });
    },
    [tournaments, navigation],
  );

  const renderTournament = useCallback(
    ({ item }: { item: TournamentListItem }) => (
      <MemoizedTournamentCard
        tournament={item}
        onJoin={(id) => {
          void handleJoinTournament(id);
        }}
        onView={handleViewTournament}
        onToggleRecruitment={(id, open) => {
          void handleToggleRecruitment(id, open);
        }}
        showDelete={myIds.has(item.ownerId)}
        onDelete={(id) => {
          void handleDeleteTournament(id);
        }}
      />
    ),
    [
      handleJoinTournament,
      handleViewTournament,
      handleToggleRecruitment,
      handleDeleteTournament,
      myIds,
    ],
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBar />
      <FilterTabs
        active={filter}
        onChange={setFilter}
        colors={colors}
        uiStyles={uiStyles}
      />
      <VirtualizedList
        data={visibleTournaments}
        renderItem={renderTournament}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        loading={loading}
        hasMore={false}
        emptyMessage={
          filter === "joined"
            ? "参加中のトーナメントがありません"
            : "トーナメントがありません"
        }
        itemHeight={200}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
          />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      <CreateTournamentModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(data) => {
          void handleCreate(data);
        }}
      />

      <ConfirmDialog
        visible={confirm.visible}
        title={confirm.title || ""}
        message={confirm.message}
        confirmText="削除"
        cancelText="キャンセル"
        onConfirm={confirm.onConfirm || (() => setConfirm({ visible: false }))}
        onCancel={() => setConfirm({ visible: false })}
        loading={!!confirm.loading}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: ColorPalette) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundTertiary,
    },
    header: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      backgroundColor: colors.backgroundPrimary,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    title: {
      fontSize: typography.fontSize["2xl"],
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
      textAlign: "center",
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
    },
    fab: {
      position: "absolute",
      bottom: spacing.xl,
      right: spacing.xl,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.info,
      justifyContent: "center",
      alignItems: "center",
      ...shadows.lg,
    },
  });
};

const FilterTabs: React.FC<{
  active: "all" | "joined";
  onChange: (v: "all" | "joined") => void;
  colors: ColorPalette;
  uiStyles: ReturnType<typeof createUiStyles>;
}> = ({ active, onChange, colors, uiStyles }) => {
  return (
    <View style={{ backgroundColor: colors.backgroundTertiary }}>
      <View style={uiStyles.tabBar}>
        <TouchableOpacity
          style={[uiStyles.tab, active === "joined" && uiStyles.tabActive]}
          onPress={() => onChange("joined")}
        >
          <Text
            style={[
              uiStyles.tabText,
              active === "joined" && uiStyles.tabTextActive,
            ]}
          >
            参加中
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[uiStyles.tab, active === "all" && uiStyles.tabActive]}
          onPress={() => onChange("all")}
        >
          <Text
            style={[
              uiStyles.tabText,
              active === "all" && uiStyles.tabTextActive,
            ]}
          >
            すべて
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TournamentsScreen;
