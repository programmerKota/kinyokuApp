import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import SupabaseService from "@core/services/supabase/supabaseService";
import { useFirebaseConnectivity } from "@shared/utils/firebaseConnectivity";

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <View
    style={{
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: color,
      marginRight: 6,
    }}
  />
);

export const ConnectivityBadge: React.FC = () => {
  const { status, api, firestore, refresh } = useFirebaseConnectivity({
    intervalMs: 30000,
  });
  const [lastWriteOk, setLastWriteOk] = useState<undefined | boolean>(
    undefined,
  );
  const [busy, setBusy] = useState(false);

  const color = useMemo(() => {
    switch (status) {
      case "online":
        return "#22c55e"; // green
      case "degraded":
        return "#eab308"; // amber
      default:
        return "#ef4444"; // red
    }
  }, [status]);

  const writeProbe = async () => {
    if (busy) return;
    try {
      setBusy(true);
      const ok = await SupabaseService.testConnection();
      setLastWriteOk(ok);
    } catch (e) {
      setLastWriteOk(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={() => {
        void refresh();
      }}
      onLongPress={() => {
        void writeProbe();
      }}
      style={{ position: "absolute", top: 8, right: 8, zIndex: 9999 }}
      accessibilityLabel="Connectivity badge"
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 6,
          paddingHorizontal: 10,
          backgroundColor: "rgba(0,0,0,0.6)",
          borderRadius: 12,
        }}
      >
        <Dot color={color} />
        <Text style={{ color: "white", fontSize: 12 }}>
          {status.toUpperCase()} • fs{" "}
          {firestore?.ok ? `${firestore.latencyMs ?? "-"}ms` : "NG"} • api{" "}
          {api?.ok ? `${api.latencyMs ?? "-"}ms` : "NG"}
          {lastWriteOk !== undefined
            ? ` • write ${lastWriteOk ? "OK" : "NG"}`
            : ""}
        </Text>
      </View>
    </Pressable>
  );
};

export default ConnectivityBadge;
