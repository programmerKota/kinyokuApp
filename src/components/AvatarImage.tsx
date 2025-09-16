import React, { useEffect, useRef, useState } from 'react';
import { Image, View, StyleSheet, ViewStyle } from 'react-native';

interface AvatarImageProps {
  uri?: string;
  size: number;
  style?: ViewStyle | any;
  borderRadius?: number;
}

// AvatarImage keeps the previous image visible until the next URI is fetched,
// reducing flicker when props update.
const AvatarImage: React.FC<AvatarImageProps> = ({ uri, size, style, borderRadius }) => {
  const [displayedUri, setDisplayedUri] = useState<string | undefined>(uri);
  const prevUriRef = useRef<string | undefined>(uri);

  useEffect(() => {
    if (!uri || uri === prevUriRef.current) return;
    let cancelled = false;
    // Preload next image, then swap
    // On RN Web, Image.prefetch exists and returns a Promise
    (Image as any)
      .prefetch?.(uri)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setDisplayedUri(uri);
          prevUriRef.current = uri;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const radius = borderRadius ?? size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius }, style]}>
      {displayedUri ? (
        <Image
          source={{ uri: displayedUri }}
          style={{ width: '100%', height: '100%', borderRadius: radius }}
        />
      ) : (
        <View style={[styles.placeholder, { borderRadius: radius }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#EEE',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EEE',
  },
});

export default React.memo(AvatarImage);

