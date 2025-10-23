import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

type State = {
  error: Error | null;
  info?: { componentStack: string } | null;
};

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Keep minimal logging; on device without Metro we'll render the message instead
    try {
      // eslint-disable-next-line no-console
      console.error("App crashed", error, info);
    } catch {
      /* noop */
    }
    this.setState({ error, info });
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={styles.title}>アプリでエラーが発生しました</Text>
        <ScrollView style={styles.box} contentContainerStyle={{ padding: 12 }}>
          <Text selectable style={styles.message}>
            {String(error?.message || error)}
          </Text>
          {!!info?.componentStack && (
            <Text selectable style={styles.stack}>
              {info.componentStack}
            </Text>
          )}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  box: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8 },
  message: { color: "#b00020", marginBottom: 12 },
  stack: { color: "#333" },
});
