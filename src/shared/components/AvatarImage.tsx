import { Ionicons } from "@expo/vector-icons";
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
const isHttpUrl = (v?: string) =>
  typeof v === "string" && /^https?:\/\//i.test(v);
const canDisplayUri = (v?: string) => {
  if (!v) return false;
  if (isHttpUrl(v)) return true;
  // In native apps, allow local file or asset URIs
  if (Platform.OS !== "web") return true;
  return false;
};

const addCacheBust = (u: string, n: number) => {
  if (!u) return u;
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}cb=${n}`;
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
  const [attempt, setAttempt] = useState(0);
  const prevUriRef = useRef<string | undefined>(uri);

  useEffect(() => {
    // No URI -> clear to placeholder
    if (!uri) {
      setDisplayedUri(undefined);
      setFailed(false);
      setAttempt(0);
      prevUriRef.current = undefined;
      return;
    }
    if (!isHttpUrl(uri)) {
      if (Platform.OS !== "web") {
        // On native, render local file/asset URIs immediately
        setFailed(false);
        setDisplayedUri(uri);
        setAttempt(0);
        prevUriRef.current = uri;
      } else {
        // On web, avoid blob:/file: URIs
        setDisplayedUri(undefined);
        setFailed(false);
        setAttempt(0);
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
            setAttempt(0);
            prevUriRef.current = uri;
          } else {
            // Keep previous image; show placeholder only if nothing shown yet
            if (attempt < 2) {
              const next = addCacheBust(uri, Date.now());
              setAttempt((a) => a + 1);
              setFailed(false);
              setDisplayedUri(next);
              prevUriRef.current = uri; // keep original for equality
            } else {
              setFailed(true);
              if (!displayedUri) setDisplayedUri(undefined);
            }
          }
        })
        .catch(() => {
          if (cancelled) return;
          if (attempt < 2) {
            const next = addCacheBust(uri, Date.now());
            setAttempt((a) => a + 1);
            setFailed(false);
            setDisplayedUri(next);
            prevUriRef.current = uri;
          } else {
            setFailed(true);
            if (!displayedUri) setDisplayedUri(undefined);
          }
        });
    } else {
      // If prefetch is unavailable, swap immediately
      setFailed(false);
      setDisplayedUri(uri);
      setAttempt(0);
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
            if (uri && attempt < 2) {
              const next = addCacheBust(uri, Date.now());
              setAttempt((a) => a + 1);
              setFailed(false);
              setDisplayedUri(next);
            } else {
              setFailed(true);
              setDisplayedUri(undefined);
            }
          }}
        />
      ) : (
        <View style={[styles.placeholder, { borderRadius: radius }]}>
          <Ionicons name="person" size={size * 0.6} color="#999" />
        </View>
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
    justifyContent: "center",
    alignItems: "center",
  },
});

export default React.memo(AvatarImage);
