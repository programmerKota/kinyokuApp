import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { spacing, typography, useAppTheme } from '@shared/theme';

type DocType = 'terms' | 'privacy';

interface Props {
  type: DocType;
  lastUpdated?: string;
}

const LegalContent: React.FC<Props> = ({ type, lastUpdated }) => {
  const { mode } = useAppTheme();
  const styles = useMemo(() => createStyles(mode), [mode]);

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );

  const Updated: React.FC = () => (
    <Text style={styles.updated}>最終更新日: {lastUpdated || '2025-10-01'}</Text>
  );

  if (type === 'terms') {
    return (
      <View>
        <Updated />
        <Section title="第1条（適用）">
          <Text style={styles.p}>本利用規約（以下「本規約」）は、本アプリケーション（以下「本サービス」）の利用条件を定めるものです。ユーザーは、本規約に同意の上で本サービスを利用するものとします。</Text>
        </Section>
        <Section title="第2条（アカウント）">
          <Text style={styles.p}>ユーザーは、登録情報に虚偽がないよう正確に入力してください。</Text>
          <Text style={styles.p}>不正利用が疑われる場合、当社はアカウントの停止・削除を行うことがあります。</Text>
        </Section>
        <Section title="第3条（禁止事項）">
          <Text style={styles.p}>以下の行為を禁止します。</Text>
          <Text style={styles.li}>・法令または公序良俗に違反する行為</Text>
          <Text style={styles.li}>・他者の権利・プライバシーを侵害する行為</Text>
          <Text style={styles.li}>・スパム、宣伝目的の投稿、なりすまし</Text>
          <Text style={styles.li}>・本サービスの運営を妨害する行為</Text>
        </Section>
        <Section title="第4条（コンテンツの権利）">
          <Text style={styles.p}>ユーザーが投稿するコンテンツの著作権は当該ユーザーに帰属します。ユーザーは、当社が本サービスの提供・改善・広報の目的で当該コンテンツを無償で利用（複製・翻案・公開等）する非独占的な利用許諾を付与します。</Text>
        </Section>
        <Section title="第5条（免責）">
          <Text style={styles.p}>当社の故意または重過失による場合を除き、ユーザーに発生した損害について一切の責任を負いません。</Text>
        </Section>
        <Section title="第6条（サービスの変更・終了）">
          <Text style={styles.p}>当社は、事前の通知なく本サービスの内容変更または提供を中止することがあります。</Text>
        </Section>
        <Section title="第7条（規約の変更）">
          <Text style={styles.p}>当社は、必要と判断した場合、本規約を変更できます。変更後の本規約は、本サービス上に表示した時点から効力を生じます。</Text>
        </Section>
        <Section title="第8条（準拠法・裁判管轄）">
          <Text style={styles.p}>本規約は日本法を準拠法とし、紛争が生じた場合、当社所在地を管轄する裁判所を第一審の専属的合意管轄とします。</Text>
        </Section>
      </View>
    );
  }

  return (
    <View>
      <Updated />
      <Section title="1. 収集する情報">
        <Text style={styles.p}>本サービスは、以下の情報を取得・保存する場合があります。</Text>
        <Text style={styles.li}>・アカウント情報（メールアドレス、表示名、プロフィール画像）</Text>
        <Text style={styles.li}>・投稿・コメント等のユーザー生成コンテンツ</Text>
        <Text style={styles.li}>・端末情報、ログ情報、クッキー等の技術情報</Text>
      </Section>
      <Section title="2. 利用目的">
        <Text style={styles.p}>取得した情報は、以下の目的で利用します。</Text>
        <Text style={styles.li}>・本サービスの提供、維持、保護、改善</Text>
        <Text style={styles.li}>・不正利用の防止、セキュリティの確保</Text>
        <Text style={styles.li}>・問い合わせ対応、重要なお知らせの通知</Text>
        <Text style={styles.li}>・法令遵守のため</Text>
      </Section>
      <Section title="3. 第三者提供">
        <Text style={styles.p}>法令に基づく場合や、サービス運営に必要な委託先への提供を除き、本人の同意なく第三者に提供しません。</Text>
      </Section>
      <Section title="4. 保管期間">
        <Text style={styles.p}>目的達成に必要な期間、または法令で定められた期間、適切に保管します。</Text>
      </Section>
      <Section title="5. 利用者の権利">
        <Text style={styles.p}>ユーザーは、自己に関する個人情報の開示・訂正・削除等を求めることができます。詳細はアプリ内からお問い合わせください。</Text>
      </Section>
      <Section title="6. クッキー等の利用">
        <Text style={styles.p}>利便性向上および改善のため、クッキーや同様の技術を利用することがあります。無効化すると一部機能に影響する場合があります。</Text>
      </Section>
      <Section title="7. 安全管理措置">
        <Text style={styles.p}>適切な技術的・組織的安全管理措置を講じ、情報の漏えい・滅失・毀損の防止に努めます。</Text>
      </Section>
      <Section title="8. 本ポリシーの変更">
        <Text style={styles.p}>内容を変更する場合は、本サービス上で告知し、告知時に効力を生じます。</Text>
      </Section>
    </View>
  );
};

const createStyles = (mode: 'light' | 'dark') => {
  const { colorSchemes } = require('@shared/theme/colors');
  const colors = colorSchemes[mode];
  return StyleSheet.create({
    section: { marginBottom: spacing.xl },
    sectionTitle: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
    sectionBody: {},
    p: { color: colors.textPrimary, lineHeight: 22, marginBottom: spacing.xs },
    li: { color: colors.textPrimary, lineHeight: 22, marginLeft: spacing.md, marginBottom: spacing.xs },
    updated: { color: colors.textSecondary, marginBottom: spacing.lg },
  });
};

export default LegalContent;
