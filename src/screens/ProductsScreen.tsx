import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, FlatList, Image, TouchableOpacity } from 'react-native';

import { colors, spacing, typography } from '../theme';

type Product = {
    id: string;
    title: string;
    price: number;
    image?: string;
    url?: string;
};

const MOCK: Product[] = Array.from({ length: 8 }).map((_, i) => ({
    id: String(i + 1),
    title: `おすすめ商品 ${i + 1}`,
    price: (i + 1) * 1000,
    image: 'https://picsum.photos/seed/kinyoku' + (i + 1) + '/300/200',
    url: 'https://example.com',
}));

const ProductsScreen: React.FC = () => {
    const navigation = useNavigation();

    const handleGoBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        }
    };

    const renderItem = ({ item }: { item: Product }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.85}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.cardBody}>
                <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
                <Text style={styles.price}>¥{item.price.toLocaleString()}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.gray800} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>おすすめ商品</Text>
                </View>
                <Ionicons name="cart" size={20} color={colors.gray800} />
            </View>
            <FlatList
                data={MOCK}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={{ gap: spacing.md }}
                contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundTertiary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderPrimary,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        marginRight: spacing.md,
        padding: spacing.xs,
    },
    headerTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.gray800,
        flex: 1,
    },
    card: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: 12,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: 120,
        backgroundColor: '#eee',
    },
    cardBody: {
        padding: spacing.md,
    },
    title: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gray800,
        marginBottom: 6,
    },
    price: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.info,
    },
});

export default ProductsScreen;



