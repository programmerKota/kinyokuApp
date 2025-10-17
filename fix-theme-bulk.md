# テーマ制御できていない画面の一覧

## 修正が必要なファイル（優先度順）

### 高優先度（主要画面）

1. ✅ src/features/ranking/screens/RankingScreen.tsx - colors直接import
2. ✅ src/features/tournaments/screens/TournamentsScreen.tsx - colors直接import
3. ✅ src/features/history/screens/HistoryScreen.tsx - colors直接import
4. ✅ src/features/diary/screens/DiaryByDayScreen.tsx - colors直接import

### 中優先度（コンポーネント）

5. src/features/ranking/components/RankingListItem.tsx - べた書き色
6. src/features/tournaments/components/TournamentCard.tsx - uiStyles直接import
7. src/features/tournaments/components/MessageBubble.tsx - colors直接import
8. src/features/tournaments/components/MessageInput.tsx - colors直接import
9. src/features/tournaments/screens/TournamentRoomScreen.tsx - colors直接import
10. src/features/history/components/HistoryCard.tsx - uiStyles使用
11. src/features/diary/components/DiaryCard.tsx - uiStyles使用
12. src/features/diary/components/DiaryButton.tsx - べた書き色
13. src/features/diary/components/DayCard.tsx - べた書き色
14. src/features/challenge/components/ChallengeModal.tsx - べた書き色
15. src/features/challenge/components/TimerDisplay.tsx - べた書き色

### 低優先度（その他）

16. src/features/community/components/\* - 各種コンポーネント
17. src/features/profile/screens/UserDetailScreen.tsx
18. src/features/profile/screens/FollowListScreen.tsx
19. src/features/profile/screens/BlockedUsersScreen.tsx
20. src/features/home/components/\* - ボタン系
21. src/features/dev/screens/SupabaseCrudTestScreen.tsx

## 修正パターン

### パターン1: 静的StyleSheet → 動的関数

```typescript
// Before
const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundPrimary },
});

// After
const createStyles = (mode: "light" | "dark") => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];
  return StyleSheet.create({
    container: { backgroundColor: colors.backgroundPrimary },
  });
};
```

### パターン2: useAppThemeフック追加

```typescript
// コンポーネント内に追加
const { mode } = useAppTheme();
const styles = useMemo(() => createStyles(mode), [mode]);
```

### パターン3: べた書き色を変数に

```typescript
// Before
backgroundColor: "#FFFFFF";

// After
backgroundColor: colors.backgroundPrimary;
```
