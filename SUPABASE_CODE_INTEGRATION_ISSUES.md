# Supabase とコードの連携問題レポート

## 🚨 重大な問題

### 1. **challengesテーブル: 重複カラム**

**場所**: `challenges`テーブル  
**問題**: `totalPenaltyPaid`（camelCase）と`totalpenaltypaid`（小文字）の両方が存在  
**影響**: データ不整合、混乱の原因  
**修正**:

```sql
-- 小文字版を削除（camelCaseを正式版とする）
ALTER TABLE challenges DROP COLUMN totalpenaltypaid;
```

### 2. **RPC関数: 引数不一致**

**場所**: `increment_post_comments`, `increment_post_likes`  
**問題**:

- コード側: `p_post_id`, `p_delta`の2引数を渡している
- DB側: `post_id`の1引数のみ、`delta`パラメータがない
- DB側の関数は常に+1しかできない（減算不可）

**影響**:

- コメント/いいね削除時にカウントが減らない
- `p_delta`パラメータが無視されている

**コード箇所**:

- `src/core/services/supabase/communityService.ts:237` - `increment_post_comments`
- `src/core/services/supabase/communityService.ts:745` - `increment_post_likes`

**修正**:

```sql
-- increment_post_commentsを修正
CREATE OR REPLACE FUNCTION public.increment_post_comments(p_post_id text, p_delta integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE community_posts
  SET comments = GREATEST(0, comments + p_delta),
      "updatedAt" = now()
  WHERE id = p_post_id;
END;
$$;

-- increment_post_likesを修正
CREATE OR REPLACE FUNCTION public.increment_post_likes(p_post_id text, p_delta integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE community_posts
  SET likes = GREATEST(0, likes + p_delta),
      "updatedAt" = now()
  WHERE id = p_post_id;
END;
$$;
```

## ⚠️ 中程度の問題

### 3. **非正規化データの一貫性**

**場所**: `community_posts`, `community_comments`, `tournament_messages`, `tournament_participants`, `tournament_join_requests`  
**問題**: `authorName`/`authorAvatar`などの非正規化データがテーブルに保存されているが、コード側は`ProfileCache`で動的に上書きしている  
**影響**:

- データベース内の非正規化データが古くなる可能性
- `reflectUserProfile`が呼ばれないと更新されない

**現状**:

- ✅ `AuthContext.updateProfile`で`reflectUserProfile`を呼んでいるので、プロフィール更新時は反映される
- ✅ コード側で`ProfileCache`を使って最新データを表示しているので、UI上は問題ない

**推奨**: このままで問題なし（ベストプラクティス通り）

### 4. **tournament_participants.upsertのonConflict設定**

**場所**: `src/core/services/supabase/tournamentService.ts:268`  
**問題**:

```typescript
{
  onConflict: "tournamentId,userId" as any;
}
```

`as any`でキャストしているため、型チェックが効かない  
**DB側**: ユニーク制約`uq_tournament_participants_user_tournament`が存在  
**影響**: 型安全性の低下（機能的には問題なし）  
**推奨**: Supabaseクライアントの型定義を更新するか、このままでOK

### 5. **ChallengeServiceでの同期問題の可能性**

**場所**: `src/core/services/supabase/challengeService.ts`  
**問題**:

- `createChallenge`と`safeStart`の両方でアクティブチャレンジのチェックを行っている（重複）
- Race conditionの可能性（2つのリクエストが同時に来た場合）

**推奨**:

- データベース側でユニーク制約を追加: `UNIQUE(userId) WHERE status = 'active'`
- または`safeStart`のみを使用し、`createChallenge`は内部用にする

## ✅ 問題なし（確認済み）

### 6. **外部キー制約**

- ✅ すべての`userId`/`authorId`/`ownerId`に対して`profiles.id`への外部キー制約が存在
- ✅ CASCADE削除が設定されており、ユーザー削除時にデータも削除される

### 7. **RLSポリシー**

- ✅ すべてのテーブルでRLSが有効
- ✅ 認証済みユーザーのみが作成/更新/削除可能
- ✅ 自分のデータのみ編集可能

### 8. **Realtime購読**

- ✅ 必要なテーブルがRealtime Publicationに追加されている
- ✅ コード側のフィルター設定が正しい

### 9. **ProfileCacheとの連携**

- ✅ `ProfileCache.subscribeMany`で複数ユーザーのプロフィールを購読
- ✅ Realtime更新が`profiles`テーブルで有効
- ✅ UI側で最新データが表示される

### 10. **データ型の整合性**

- ✅ `userId`/`authorId`/`ownerId`: コード（string） ⇔ DB（text）
- ✅ `createdAt`/`updatedAt`: コード（Date/ISO string） ⇔ DB（timestamptz）
- ✅ `id`: challengesのみUUID、他はtext（一貫性あり）

## 📋 推奨アクション

### 優先度: 高（すぐ修正すべき）

1. ✅ **重複カラムの削除** (`challenges.totalpenaltypaid`)
2. ✅ **RPC関数の修正** (`increment_post_comments`, `increment_post_likes`)

### 優先度: 中（検討すべき）

3. **アクティブチャレンジのユニーク制約追加**
   ```sql
   CREATE UNIQUE INDEX idx_challenges_user_active
   ON challenges(userId)
   WHERE status = 'active';
   ```

### 優先度: 低（任意）

4. **型定義の改善** (tournament_participants.upsert)
5. **非正規化データの定期的な同期** (オプション)

---

## ✅ 結論

**全体的な評価**: ⭐⭐⭐⭐☆ (4/5)

- **良い点**:
  - 外部キー制約とRLSがしっかり設定されている
  - ProfileCacheを使った最適な設計
  - Realtime購読が適切に実装されている

- **改善点**:
  - 重複カラムの削除（簡単に修正可能）
  - RPC関数の引数修正（重要だが簡単に修正可能）

**次のステップ**: 上記2つの重大な問題を修正すれば、本番運用可能な状態になります。
