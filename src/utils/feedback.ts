import { Linking, Platform } from 'react-native';

const DEVELOPER_EMAIL = 'programmerkota@gmail.com';

const encode = (s: string) => encodeURIComponent(s);

export const openFeedbackEmail = async (opts?: { subject?: string; body?: string }) => {
  const subject = opts?.subject ?? '【フィードバック】禁欲アプリ 改善提案';
  const defaultBody = [
    '以下にご意見・不具合・改善要望をご記入ください。',
    '',
    '---',
    `OS: ${Platform.OS} ${Platform.Version}`,
  ].join('\n');
  const body = opts?.body ?? defaultBody;

  const url = `mailto:${DEVELOPER_EMAIL}?subject=${encode(subject)}&body=${encode(body)}`;
  const canOpen = await Linking.canOpenURL(url).catch(() => false);
  if (canOpen) {
    await Linking.openURL(url).catch(() => {});
    return true;
  }
  return false;
};


