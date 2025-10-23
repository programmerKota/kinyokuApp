import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import DSButton from '@shared/designSystem/components/DSButton';
import { colors, spacing, typography } from '@shared/theme';
import { PurchasesService, PenaltyPackage } from '@core/services/payments/purchasesService';
import { PaymentFirestoreService } from '@core/services/firestore';

export const PenaltyPaywall: React.FC<{ amountJPY: number; visible: boolean; onPaid: (info?: { transactionId?: string; productIdentifier?: string }) => void; onError?: (e: any) => void; }>
= ({ amountJPY, visible, onPaid, onError }) => {
  const [loading, setLoading] = useState(true);
  const [pkg, setPkg] = useState<PenaltyPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    (async () => {
      try {
        // log paywall shown
        try { await PaymentFirestoreService.addPaymentLog({ event: 'show', status: 'ok', amount: amountJPY, platform: Platform.OS, }); } catch {}
        const p = await PurchasesService.getPenaltyPackage(amountJPY);
        setPkg(p);
      } catch (e) {
        onError?.(e);
        try { await PaymentFirestoreService.addPaymentLog({ event: 'purchase', status: 'error', amount: amountJPY, platform: Platform.OS, errorMessage: String((e as any)?.message || e) }); } catch {}
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, amountJPY]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <Text style={styles.title}>ペナルティのお支払い</Text>
        <Text style={styles.desc}>リタイアにはペナルティの支払いが必要です。完了まで他の操作はできません。</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : pkg ? (
          <>
            {/* 実際のストア価格を優先表示（ターゲット額と差がある場合の混乱を避ける） */}
            <Text style={styles.amount}>¥{(pkg.price ?? amountJPY).toLocaleString()}</Text>
            <DSButton testID="pay-btn" title={purchasing ? '処理中...' : '支払う'} onPress={async () => {
              try {
                setPurchasing(true);
                const res = await PurchasesService.purchase(pkg);
                try {
                  const status = res?.success ? 'success' : (res?.cancelled ? 'cancel' : 'error');
                  await PaymentFirestoreService.addPaymentLog({ event: 'purchase', status, amount: pkg.price, productId: res?.productIdentifier, platform: Platform.OS, transactionId: res?.transactionId, raw: res });
                } catch {}
                if (res?.success) onPaid({ transactionId: res.transactionId, productIdentifier: res.productIdentifier });
              } catch (e) {
                onError?.(e);
                try { await PaymentFirestoreService.addPaymentLog({ event: 'purchase', status: 'error', amount: pkg?.price, productId: pkg?.identifier, platform: Platform.OS, errorMessage: String((e as any)?.message || e), raw: e }); } catch {}
              } finally { setPurchasing(false); }
            }} loading={purchasing} style={{ width: '100%', marginTop: spacing.md }} />
          </>
        ) : (
          <>
            <Text style={{ color: colors.error }}>購入オプションを取得できませんでした。</Text>
            <DSButton
              title={purchasing ? '再取得中...' : '再試行'}
              onPress={async () => {
                try {
                  setPurchasing(true);
                  const p = await PurchasesService.getPenaltyPackage(amountJPY);
                  setPkg(p);
                } finally { setPurchasing(false); }
              }}
              loading={purchasing}
              style={{ width: '100%', marginTop: spacing.md }}
            />
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  sheet: { width: '100%', maxWidth: 420, backgroundColor: colors.backgroundSecondary, borderRadius: 16, padding: spacing['2xl'], borderWidth: 1, borderColor: colors.borderPrimary },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: '800', color: colors.textPrimary },
  desc: { color: colors.textSecondary, marginTop: spacing.sm },
  amount: { marginTop: spacing['2xl'], fontSize: 28, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
});

export default PenaltyPaywall;
