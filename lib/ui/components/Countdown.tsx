import React, { useEffect, useState } from 'react';
import { Text } from './Text';
import { color } from '../tokens';

export function Countdown({ deadline }: { deadline: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!deadline) return <Text variant="num" color="muted">—</Text>;
  const ms = Math.max(0, new Date(deadline).getTime() - now);
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const isUrgent = ms < 3600_000;
  const fmt = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return <Text variant="num" style={{ color: isUrgent ? color.accent.warm : color.text.primary }}>{fmt}</Text>;
}
const pad = (n: number) => String(n).padStart(2, '0');
