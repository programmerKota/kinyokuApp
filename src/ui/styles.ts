import { StyleSheet } from "react-native";
import { colors, spacing, typography, shadows } from "../theme";

export const uiStyles = StyleSheet.create({
  // Generic layout helpers
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowStart: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  
  // Generic text helpers
  textMuted: {
    color: colors.textSecondary,
  },
  textSmall: {
    fontSize: typography.fontSize.sm,
  },
  
  // Timestamp placed at right-top of a row
  timestampRight: {
    marginLeft: "auto",
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  // Screens / Containers
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  listContainer: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  // Header (simple title + optional right/left)
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.backgroundPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: typography.fontSize["2xl"],
    fontWeight: "700",
    color: colors.gray800,
  },

  // Tabs
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.backgroundPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    paddingHorizontal: spacing.xl,
    justifyContent: "space-around",
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  tabText: {
    fontSize: typography.fontSize.base,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.info,
  },
  tabTextActive: {
    color: colors.info,
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    ...shadows.base,
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: colors.gray800,
  },
  cardSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },

  // Badge
  badge: {
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    color: colors.white,
  },

  // Avatar
  avatar: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gray100,
    overflow: "hidden",
  },
  avatarText: {
    color: colors.white,
    fontWeight: "700",
  },
});

export default uiStyles;
