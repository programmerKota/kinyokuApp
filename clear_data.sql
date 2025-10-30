-- データのみをクリアするSQL（テーブル構造は保持）
-- 外部キー制約を考慮した削除順序

-- 1. 依存関係のあるテーブルから削除（子テーブル）
DELETE FROM public.community_likes;
DELETE FROM public.community_comments;
DELETE FROM public.community_posts;
DELETE FROM public.tournament_messages;
DELETE FROM public.tournament_join_requests;
DELETE FROM public.tournament_participants;
DELETE FROM public.diaries;
DELETE FROM public.blocks;
DELETE FROM public.follows;
DELETE FROM public.payments;

-- 2. 中間テーブル
DELETE FROM public.tournament_participants;
DELETE FROM public.tournament_join_requests;

-- 3. メインテーブル（親テーブル）
DELETE FROM public.tournaments;
DELETE FROM public.challenges;

-- 4. 最後にプロフィール（他のテーブルが参照している）
DELETE FROM public.profiles;

-- 確認用クエリ（実行後にデータが0件になることを確認）
SELECT 
  'profiles' as table_name, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'challenges', COUNT(*) FROM public.challenges
UNION ALL
SELECT 'diaries', COUNT(*) FROM public.diaries
UNION ALL
SELECT 'community_posts', COUNT(*) FROM public.community_posts
UNION ALL
SELECT 'community_comments', COUNT(*) FROM public.community_comments
UNION ALL
SELECT 'community_likes', COUNT(*) FROM public.community_likes
UNION ALL
SELECT 'tournaments', COUNT(*) FROM public.tournaments
UNION ALL
SELECT 'tournament_participants', COUNT(*) FROM public.tournament_participants
UNION ALL
SELECT 'tournament_join_requests', COUNT(*) FROM public.tournament_join_requests
UNION ALL
SELECT 'tournament_messages', COUNT(*) FROM public.tournament_messages
UNION ALL
SELECT 'follows', COUNT(*) FROM public.follows
UNION ALL
SELECT 'blocks', COUNT(*) FROM public.blocks
UNION ALL
SELECT 'payments', COUNT(*) FROM public.payments;

