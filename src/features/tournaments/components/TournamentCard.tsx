import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

import Button from "@shared/components/Button";
import { colors, spacing, typography, shadows } from "@shared/theme";
import { uiStyles } from "@shared/ui/styles";

export interface UITournament {
  id: string;
  name: string;
  description: string;
  participantCount: number;
  status: "upcoming" | "active" | "completed" | "cancelled";
  isJoined: boolean;
  ownerId: string;
  ownerName?: string;
  ownerAvatar?: string;
  recruitmentOpen?: boolean;
  requestPending?: boolean;
}

export interface TournamentCardProps {
  tournament: UITournament;
  onJoin: (tournamentId: string) => void;
  onView: (tournamentId: string) => void;
  onDelete?: (tournamentId: string) => void;
  showDelete?: boolean;
  onToggleRecruitment?: (tournamentId: string, open: boolean) => void;
}

const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  onJoin,
  onView,
  onDelete,
  showDelete = false,
  onToggleRecruitment,
}) => {
  const canJoin = !tournament.isJoined && tournament.status === "active";
  const isPending = tournament.requestPending === true;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onView(tournament.id)}>
      <View style={[uiStyles.rowBetween, styles.header]}>
        <Text style={styles.title}>{tournament.name}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {tournament.participantCount}人参加中
          </Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {tournament.description}
      </Text>

      <View style={[uiStyles.rowBetween, styles.footer]}>
        <View style={[uiStyles.row, styles.leftInfo]}>
          <View style={[uiStyles.row, styles.ownerRow]}>
            <Text style={styles.ownerLabel}>作成者:</Text>
            <TouchableOpacity
              style={styles.ownerAvatarWrap}
              onPress={() => onView(`user:${tournament.ownerId}`)}
              activeOpacity={0.8}
            >
              {tournament.ownerAvatar ? (
                <View style={styles.ownerAvatarWrap}>
                  <Image
                    source={{ uri: tournament.ownerAvatar }}
                    style={styles.ownerAvatarImage}
                  />
                </View>
              ) : (
                <View style={styles.ownerAvatar}>
                  <Text style={styles.ownerAvatarText}>
                    {(tournament.ownerName || "U").charAt(0)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {showDelete && tournament.ownerId ? (
          <View style={[uiStyles.row, styles.actionsRow]}>
            {typeof tournament.recruitmentOpen !== "undefined" ? (
              <Button
                title={tournament.recruitmentOpen ? "募集を停止" : "募集を再開"}
                onPress={() =>
                  onToggleRecruitment &&
                  onToggleRecruitment(
                    tournament.id,
                    !tournament.recruitmentOpen,
                  )
                }
                size="small"
                variant={tournament.recruitmentOpen ? "secondary" : "primary"}
                style={styles.joinButton}
              />
            ) : null}
            {onDelete ? (
              <Button
                title="削除"
                onPress={() => onDelete(tournament.id)}
                size="small"
                variant="danger"
                style={[styles.joinButton, styles.actionSpacing]}
              />
            ) : null}
          </View>
        ) : canJoin ? (
          <Button
            title={
              tournament.recruitmentOpen === false
                ? "募集は終了しました"
                : isPending
                  ? "申請中"
                  : "参加申請"
            }
            onPress={() => onJoin(tournament.id)}
            size="small"
            style={styles.joinButton}
            disabled={tournament.recruitmentOpen === false || isPending}
          />
        ) : (
          <View style={styles.joinedBadge}>
            <Text style={styles.joinedText}>参加済み</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    ...shadows.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
    lineHeight: 28,
  },
  countBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  countBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: "600",
    color: colors.white,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ownerAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.backgroundSecondary,
    marginRight: spacing.sm,
  },
  ownerAvatarImage: {
    width: "100%",
    height: "100%",
  },
  ownerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.info,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  ownerAvatarText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: typography.fontSize.sm,
  },
  ownerLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: "500",
    marginRight: spacing.sm,
  },
  joinButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  joinedBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  joinedText: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: colors.white,
  },
  deleteButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  actionsRow: {
    alignItems: "center",
  },
  actionSpacing: {
    marginLeft: spacing.md,
  },
});

export default React.memo(TournamentCard);
