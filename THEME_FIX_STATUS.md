# テーマ対応状況

## ✅ 修正完了

### コア機能

1. ✅ ThemeProvider - react-native-paperベース
2. ✅ useAppTheme - テーマフック
3. ✅ colors.ts - 動的パレット
4. ✅ uiStyles - 動的生成対応
5. ✅ screenThemes - 動的生成対応

### 主要画面

6. ✅ HomeScreen
7. ✅ CommunityScreen
8. ✅ ProfileScreen (ダークモード切り替えスイッチ付き)
9. ✅ FeedbackScreen
10. ✅ AuthScreen
11. ✅ RankingScreen ← **NEW!**

### 共有コンポーネント

12. ✅ Button
13. ✅ Modal
14. ✅ InputField
15. ✅ ReplyInputBar
16. ✅ ConfirmDialog

### ナビゲーション

17. ✅ RootNavigator (MainTabs)
18. ✅ AppStatusBar

---

## ⚠️ 修正が必要（べた書き色指定あり）

### 🔴 高優先度（よく使われる画面）

- [ ] **TournamentsScreen** - `colors`直接import、静的StyleSheet
- [ ] **HistoryScreen** - `colors`, `screenThemes`直接import
- [ ] **DiaryByDayScreen** - `colors`直接import、静的StyleSheet

### 🟡 中優先度（関連コンポーネント）

- [ ] **Ranking** コンポーネント
  - [ ] RankingListItem.tsx - べた書き色
- [ ] **Tournament** コンポーネント
  - [ ] TournamentCard.tsx - `uiStyles`直接import
  - [ ] TournamentRoomScreen.tsx - `colors`直接import
  - [ ] MessageBubble.tsx - `colors`直接import
  - [ ] MessageInput.tsx - `colors`直接import

- [ ] **History** コンポーネント
  - [ ] HistoryCard.tsx - `uiStyles`使用

- [ ] **Diary** コンポーネント
  - [ ] DiaryCard.tsx - `uiStyles`使用
  - [ ] DiaryButton.tsx - べた書き色
  - [ ] DayCard.tsx - べた書き色

- [ ] **Challenge** コンポーネント
  - [ ] ChallengeModal.tsx - べた書き色
  - [ ] TimerDisplay.tsx - べた書き色
  - [ ] StopModal.tsx - べた書き色

### 🟢 低優先度

- [ ] **Community** コンポーネント（一部対応済み）
  - [ ] CreatePostModal.tsx
  - [ ] PostCard.tsx
  - [ ] PostList.tsx
  - [ ] ReplyCard.tsx
  - [ ] ReplyModal.tsx
  - [ ] RepliesList.tsx

- [ ] **Profile** 画面
  - [ ] UserDetailScreen.tsx
  - [ ] FollowListScreen.tsx
  - [ ] BlockedUsersScreen.tsx

- [ ] **Home** コンポーネント
  - [ ] HistoryButton.tsx
  - [ ] RankingButton.tsx
  - [ ] ProfileSetupModalCard.tsx
  - [ ] ProfileSetupModal.tsx

---

## 📋 次のアクション

### 即座に修正すべき（ユーザー体験に直結）

1. TournamentsScreen
2. HistoryScreen
3. DiaryByDayScreen

これらを修正すれば、主要な画面は全てテーマ対応完了。

### バッチ修正（後回し可）

- 各種小コンポーネント（ボタン、カード類）
- 開発用画面（DevScreen、E2EScreen）

---

## 🎨 現在の動作状況

### 動作する機能

✅ ライト/ダークモード切り替え（設定画面のスイッチ）
✅ テーマ永続化（AsyncStorage）
✅ 主要ナビゲーションとホーム画面
✅ コミュニティ機能
✅ プロフィール設定
✅ ランキング画面

### まだ制御できない画面

❌ トーナメント関連
❌ 履歴関連（一部）
❌ 日記関連
❌ チャレンジモーダル

---

## 修正パターン（コピペ用）

```typescript
// 1. import変更
import {
  useAppTheme,
  useThemedStyles,
  spacing,
  typography,
} from "@shared/theme";
import { createUiStyles } from "@shared/ui/styles";

// 2. コンポーネント内でフック使用
const { mode } = useAppTheme();
const uiStyles = useThemedStyles(createUiStyles);
const styles = useMemo(() => createStyles(mode), [mode]);

// 3. スタイル関数化
const createStyles = (mode: "light" | "dark") => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];

  return StyleSheet.create({
    container: { backgroundColor: colors.backgroundPrimary },
    text: { color: colors.textPrimary },
  });
};
```

---

最終更新: 2025年
