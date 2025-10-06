import React, { memo, useCallback, useMemo } from "react";
import type { ReactElement } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import type {
  ListRenderItem,
  FlatListProps,
  StyleProp,
  ViewStyle,
} from "react-native";

import { colors, spacing, typography } from "@shared/theme";

interface VirtualizedListProps<T> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  loading?: boolean;
  hasMore?: boolean;
  emptyMessage?: string;
  itemHeight?: number;
  maxToRenderPerBatch?: number;
  windowSize?: number;
  removeClippedSubviews?: boolean;
  initialNumToRender?: number;
  getItemLayout?: FlatListProps<T>["getItemLayout"];
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

const VirtualizedList = <T,>({
  data,
  renderItem,
  keyExtractor,
  onEndReached,
  onEndReachedThreshold = 0.5,
  loading = false,
  hasMore = false,
  emptyMessage = "データがありません",
  itemHeight = 100,
  maxToRenderPerBatch = 10,
  windowSize = 10,
  removeClippedSubviews = true,
  initialNumToRender = 10,
  getItemLayout,
  contentContainerStyle,
  style,
}: VirtualizedListProps<T>) => {
  const renderFooter = useCallback(() => {
    const hasItems = (data?.length || 0) > 0;
    const initialLoading = loading && !hasItems;
    if (!initialLoading && !hasMore) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerText}>
          {loading ? "読み込み中..." : "さらに読み込み"}
        </Text>
      </View>
    );
  }, [loading, hasMore, data?.length]);

  const renderEmpty = useCallback(() => {
    if (data.length > 0) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }, [data.length, emptyMessage]);

  const optimizedGetItemLayout = useMemo<
    NonNullable<FlatListProps<T>["getItemLayout"]>
  >(() => {
    if (getItemLayout) {
      return getItemLayout;
    }

    return (_data, index) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    });
  }, [getItemLayout, itemHeight]);

  const handleEndReached = useCallback(() => {
    if (onEndReached && hasMore && !loading) {
      onEndReached();
    }
  }, [onEndReached, hasMore, loading]);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={handleEndReached}
      onEndReachedThreshold={onEndReached ? onEndReachedThreshold : undefined}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      getItemLayout={optimizedGetItemLayout}
      maxToRenderPerBatch={maxToRenderPerBatch}
      windowSize={windowSize}
      removeClippedSubviews={removeClippedSubviews}
      initialNumToRender={initialNumToRender}
      contentContainerStyle={contentContainerStyle}
      style={style}
      showsVerticalScrollIndicator={false}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
    />
  );
};

const styles = StyleSheet.create({
  footer: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

const MemoizedVirtualizedList = memo(VirtualizedList) as <T>(
  props: VirtualizedListProps<T>,
) => ReactElement;

export default MemoizedVirtualizedList;
