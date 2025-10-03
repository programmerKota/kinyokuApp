import React, { useEffect, useRef, useState } from "react";
import type { ViewStyle } from "react-native";
import { Image, View, StyleSheet, Platform } from "react-native";

interface AvatarImageProps {
  uri?: string;
  size: number;
  style?: ViewStyle;
  borderRadius?: number;
}

// AvatarImage keeps the previous image visible until the next URI is fetched,
// reducing flicker when props update.
const isHttpUrl = (v?: string) => typeof v === "string" && /^https?:\/\//i.test(v);
const canDisplayUri = (v?: string) => {
  if (!v) return false;
  if (isHttpUrl(v)) return true;
  // In native apps, allow local file or asset URIs
  if (Platform.OS !== "web") return true;
  return false;
};

const AvatarImage: React.FC<AvatarImageProps> = ({
  uri,
  size,
  style,
  borderRadius,
}) => {
  // Show current URI immediately (first paint), swap only after next URI is fetched
  const [displayedUri, setDisplayedUri] = useState<string | undefined>(
    canDisplayUri(uri) ? uri : undefined,
  );
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
    if (!isHttpUrl(uri)) {
      if (Platform.OS !== "web") {
        // On native, render local file/asset URIs immediately
        setFailed(false);
        setDisplayedUri(uri);
        prevUriRef.current = uri;
      } else {
        // On web, avoid blob:/file: URIs
        setDisplayedUri(undefined);
        setFailed(false);
        prevUriRef.current = uri;
      }
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
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      {displayedUri && !failed ? (
        <Image
          source={{ uri: displayedUri }}
          style={{ width: "100%", height: "100%", borderRadius: radius }}
          onError={() => {
            setFailed(true);
            setDisplayedUri(undefined);
          }}
        />
      ) : (
        <View style={[styles.placeholder, { borderRadius: radius }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: "#EEE",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#EEE",
  },
});

export default React.memo(AvatarImage);
