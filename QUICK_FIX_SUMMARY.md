# テーマ制御修正状況まとめ

## 📊 進捗

- 型エラー: **59個 → 15個** （✅ 74%改善）
- 修正完了画面: **11個**
- 残り修正必要: **約30個**

## ✅ 修正済み（動的テーマ対応完了）

### 主要画面

1. HomeScreen
2. CommunityScreen
3. ProfileScreen（ダークモード切替スイッチ付き）
4. FeedbackScreen
5. AuthScreen
6. RankingScreen

### 共有コンポーネント

7. Button
8. Modal
9. InputField
10. ReplyInputBar
11. ConfirmDialog

### システム

- ThemeProvider（light/dark手動切替、永続化）
- useAppTheme フック
- createUiStyles（動的スタイル生成）
- RootNavigator（タブバー）
- AppStatusBar

## ⚠️ まだ制御できていない主要画面

### 🔴 優先度：高（ユーザーがよく使う）

1. **TournamentsScreen** - トーナメント一覧
2. **HistoryScreen** - チャレンジ履歴
3. **DiaryByDayScreen** - 日記（日別表示）

### 🟡 優先度：中（関連コンポーネント）

4. TournamentCard
5. TournamentRoomScreen
6. MessageBubble / MessageInput
7. HistoryCard
8. DiaryCard / DayCard / DiaryButton
9. RankingListItem

### 🟢 優先度：低

- 各種小コンポーネント（30+個）

## 🎯 推奨アクション

### すぐ修正すべき（3画面）

```bash
1. TournamentsScreen
2. HistoryScreen
3. DiaryByDayScreen
```

→ これで主要な機能画面は全てテーマ対応完了

### 後回しでOK

- 各種カードコンポーネント
- ボタンコンポーネント
- 開発用画面

## 💡 ユーザーへの提案

**オプション A: 最小限修正（推奨）**

- 主要3画面のみ修正（10分程度）
- ほとんどの機能でテーマ切替が動作

**オプション B: 完全対応**

- 全30+画面を修正（30-60分）
- 全ての画面でテーマ完全対応

どちらを希望されますか？
