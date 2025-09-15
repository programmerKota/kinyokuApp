import React, { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import { formatRelative } from '../utils';

interface RelativeTimeProps {
  value: any; // Date | Firestore.Timestamp | string | number
  showSeconds?: boolean;
  updateIntervalMs?: number; // default depends on showSeconds
  style?: TextStyle | any;
}

const RelativeTime: React.FC<RelativeTimeProps> = ({
  value,
  showSeconds = false,
  updateIntervalMs,
  style,
}) => {
  // Update frequency: every 1s when showing seconds, otherwise every 30s
  const interval = updateIntervalMs ?? (showSeconds ? 1000 : 30000);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), interval);
    return () => clearInterval(id);
  }, [interval]);

  return <Text style={style}>{formatRelative(value, { showSeconds })}</Text>;
};

export default RelativeTime;

