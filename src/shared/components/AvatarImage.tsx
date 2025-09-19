import React, { useEffect, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { Image, View, StyleSheet } from 'react-native';

interface AvatarImageProps {
  uri?: string;
  size: number;
  style?: ViewStyle;
  borderRadius?: number;
}

// AvatarImage keeps the previous image visible until the next URI is fetched,
// reducing flicker when props update.
const AvatarImage: React.FC<AvatarImageProps> = ({ uri, size, style, borderRadius }) => {
  // Show current URI immediately (first paint), swap only after next URI is fetched
  const [displayedUri, setDisplayedUri] = useState<string | undefined>(uri);
  const [failed, setFailed] = useState(false);
  const prevUriRef = useRef<string | undefined>(uri);

  useEffect(() => {
    // No URI -> clear to placeholder
    if (!uri) {
      setDisplayedUri(undefined);
      setFailed(false);
      prevUriRef.current = undefined;
      return;
    }
    // Same URI as before -> keep current image
    if (uri === prevUriRef.current) return;
    let cancelled = false;
    const prefetch = Image.prefetch?.bind(Image);
    if (prefetch) {
      void prefetch(uri)
        .then((ok: boolean) => {
          if (cancelled) return;
          if (ok) {
            setFailed(false);
            setDisplayedUri(uri);
            prevUriRef.current = uri;
          } else {
            // Keep previous image; show placeholder only if nothing shown yet
            setFailed(true);
            if (!displayedUri) setDisplayedUri(undefined);
          }
        })
        .catch(() => {
          if (cancelled) return;
          setFailed(true);
          if (!displayedUri) setDisplayedUri(undefined);
        });
    } else {
      // If prefetch is unavailable, swap immediately
      setFailed(false);
      setDisplayedUri(uri);
      prevUriRef.current = uri;
    }
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const radius = borderRadius ?? size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius }, style]}>
      {displayedUri && !failed ? (
        <Image
          source={{ uri: displayedUri }}
          style={{ width: '100%', height: '100%', borderRadius: radius }}
          onError={() => { setFailed(true); setDisplayedUri(undefined); }}
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
