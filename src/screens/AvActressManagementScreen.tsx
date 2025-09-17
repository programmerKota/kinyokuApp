import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  addAvActressName,
  deactivateAvActressName,
  getAvActressNames,
} from '../services/avActressDbService';
import { clearActressCache } from '../services/avActressFilter';
import { colors, spacing, typography } from '../theme';

interface AvActressItem {
  id: string;
  name: string;
}

const AvActressManagementScreen: React.FC = () => {
  const [actressNames, setActressNames] = useState<AvActressItem[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadActressNames = useCallback(async () => {
    try {
      setLoading(true);
      const names = await getAvActressNames();
      setActressNames(names.map((name) => ({ id: name, name })));
    } catch (error) {
      console.error('Failed to load AV actress names:', error);
      Alert.alert('エラー', 'AV女優名の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActressNames();
  }, [loadActressNames]);

  const handleAddName = useCallback(async () => {
    if (!newName.trim()) {
      Alert.alert('入力必須', '名前を入力してください');
      return;
    }
    try {
      setLoading(true);
      const id = await addAvActressName(newName.trim());
      if (id) {
        setNewName('');
        clearActressCache();
        await loadActressNames();
        Alert.alert('完了', 'AV女優名を追加しました');
      } else {
        Alert.alert('エラー', 'AV女優名の追加に失敗しました');
      }
    } catch (error) {
      console.error('Failed to add AV actress name:', error);
      Alert.alert('エラー', 'AV女優名の追加に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [newName, loadActressNames]);

  const handleDeleteName = useCallback(
    (name: string) => {
      Alert.alert('確認', `「${name}」を削除しますか？`, [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const success = await deactivateAvActressName(name);
              if (success) {
                clearActressCache();
                await loadActressNames();
                Alert.alert('完了', 'AV女優名を削除しました');
              } else {
                Alert.alert('エラー', 'AV女優名の削除に失敗しました');
              }
            } catch (error) {
              console.error('Failed to delete AV actress name:', error);
              Alert.alert('エラー', 'AV女優名の削除に失敗しました');
            } finally {
              setLoading(false);
            }
          },
        },
      ]);
    },
    [loadActressNames],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadActressNames();
    setRefreshing(false);
  }, [loadActressNames]);

  const renderItem = useCallback(
    ({ item }: { item: AvActressItem }) => (
      <View style={styles.listItem}>
        <Text style={styles.listItemText}>{item.name}</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteName(item.name)}
          disabled={loading}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    ),
    [handleDeleteName, loading],
  );

  const headerLabel = useMemo(() => `登録済みAV女優名 (${actressNames.length}件)`, [actressNames.length]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AV女優名管理</Text>
        <Text style={styles.subtitle}>不適切な投稿を防ぐため、利用禁止の名前を管理します</Text>
      </View>

      <View style={styles.addSection}>
        <TextInput
          style={styles.input}
          value={newName}
          onChangeText={setNewName}
          placeholder="新しい名前"
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.addButton, loading && styles.disabledButton]}
          onPress={handleAddName}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={styles.addButtonText}>追加</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.listSection}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>{headerLabel}</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator color={colors.gray400} />
            ) : (
              <Ionicons name="refresh" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={actressNames}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>登録済みの名前はありません</Text>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  addSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    marginRight: spacing.md,
    fontSize: typography.fontSize.base,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: colors.gray400,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.xs,
  },
  listSection: {
    flex: 1,
    padding: spacing.lg,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  refreshButton: {
    padding: spacing.sm,
  },
  list: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  listItemText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  deleteButton: {
    padding: spacing.sm,
  },
  emptyState: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});

export default AvActressManagementScreen;
