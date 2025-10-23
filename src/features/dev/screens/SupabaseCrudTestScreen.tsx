import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";

import { supabase, supabaseConfig } from "@app/config/supabase.config";

const styles = {
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: { color: "white", fontWeight: "700" },
  log: { fontFamily: "System", fontSize: 14, color: "#111", marginBottom: 4 },
  statusOk: { color: "#16a34a" },
  statusErr: { color: "#dc2626" },
  mono: { fontFamily: "System" },
} as const;

const nowIso = () => new Date().toISOString();

const SupabaseCrudTestScreen: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const append = useCallback((line: string) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString()} ${line}`, ...prev]);
  }, []);

  const runCrud = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setLogs([]);

    try {
      const url = supabaseConfig.url;
      const anon = supabaseConfig.anonKey;
      append(`Using URL: ${url ?? "<unset>"}`);
      append(
        `AnonKey: ${anon ? String(anon).substring(0, 8) + "..." : "<unset>"}`,
      );

      // 1) insert
      append("Inserting row...");
      const { data: inserted, error: insertErr } = await supabase
        .from("test_items")
        .insert({ title: `hello ${nowIso()}` })
        .select()
        .single();
      if (insertErr) throw insertErr;
      append(`Inserted id=${inserted.id}`);

      // 2) select
      append("Selecting rows...");
      const { data: selected, error: selectErr } = await supabase
        .from("test_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);
      if (selectErr) throw selectErr;
      append(`Selected ${selected?.length ?? 0} rows`);

      // 3) update
      append("Updating the inserted row...");
      const { error: updateErr } = await supabase
        .from("test_items")
        .update({ title: `updated ${nowIso()}` })
        .eq("id", inserted.id);
      if (updateErr) throw updateErr;
      append("Updated successfully");

      // 4) delete
      append("Deleting the inserted row...");
      const { error: deleteErr } = await supabase
        .from("test_items")
        .delete()
        .eq("id", inserted.id);
      if (deleteErr) throw deleteErr;
      append("Deleted successfully");

      append("DONE ✅");
    } catch (e: unknown) {
      append(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  }, [append, running]);

  const disabled = useMemo(() => running, [running]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase CRUD Test</Text>
      <Pressable
        style={[styles.button, disabled && { opacity: 0.5 }]}
        onPress={runCrud}
        disabled={disabled}
      >
        <Text style={styles.buttonText}>
          {running ? "Running..." : "Run CRUD"}
        </Text>
      </Pressable>
      <ScrollView>
        {logs.map((l, i) => (
          <Text key={i} style={styles.log}>
            {l}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

export default SupabaseCrudTestScreen;
