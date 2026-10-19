import React from 'react';
import { View, Text, Platform } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, Circle, Polyline } from 'react-native-svg';
import { colors } from '../theme';

// SVG metni web'de varsayılan olarak tırnaklı yazı tipine düşer; arayüzle aynı sistem yazı tipi
const FONT = Platform.OS === 'web' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : undefined;

const short = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${Number(d)}.${Number(m)}`;
};

// Haftalık oran: hafta başına bir sütun (0–100 %), üstünde değer. Boş hafta = planlanan yok.
export function WeeklyRateBars({ data, height = 150, width = 520 }: {
  data: { start: string; rate: number | null }[]; height?: number; width?: number;
}) {
  const top = 18, bottom = 22, left = 4;
  const h = height - top - bottom;
  const slot = (width - left) / Math.max(data.length, 1);
  const bar = Math.min(36, slot * 0.6);
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {[0, 50, 100].map((g) => (
        <Line key={g} x1={left} x2={width} y1={top + h - (h * g) / 100} y2={top + h - (h * g) / 100}
          stroke={colors.line} strokeWidth={1} />
      ))}
      {data.map((d, i) => {
        const x = left + slot * i + (slot - bar) / 2;
        const v = d.rate ?? 0;
        const bh = (h * v) / 100;
        return (
          <React.Fragment key={d.start}>
            {d.rate !== null && <Rect x={x} y={top + h - bh} width={bar} height={Math.max(bh, 1)} rx={4} fill={colors.navy} />}
            <SvgText fontFamily={FONT} x={x + bar / 2} y={top + h - bh - 5} fontSize={11} fill={colors.text} textAnchor="middle">
              {d.rate === null ? '–' : `%${d.rate}`}
            </SvgText>
            <SvgText fontFamily={FONT} x={x + bar / 2} y={height - 6} fontSize={10} fill={colors.muted} textAnchor="middle">{short(d.start)}</SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// GAS çizgisi: -2 … +2, hafta başına bir nokta (puanlanmamış hafta boş geçer)
export function GasLine({ weeks, ratings, height = 110, width = 520 }: {
  weeks: string[]; ratings: Record<string, number>; height?: number; width?: number;
}) {
  const top = 10, bottom = 20, left = 24;
  const h = height - top - bottom;
  const slot = (width - left) / Math.max(weeks.length, 1);
  const y = (r: number) => top + h - ((r + 2) / 4) * h;
  const pts = weeks.map((w, i) => (ratings[w] === undefined ? null : { x: left + slot * i + slot / 2, y: y(ratings[w]) }));
  // Ardışık puanlı haftalar çizgiyle birleşir; puansız hafta çizgiyi böler
  const runs: { x: number; y: number }[][] = [];
  let run: { x: number; y: number }[] = [];
  pts.forEach((p) => {
    if (p) run.push(p);
    else { if (run.length) runs.push(run); run = []; }
  });
  if (run.length) runs.push(run);
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {[-2, -1, 0, 1, 2].map((g) => (
        <React.Fragment key={g}>
          <Line x1={left} x2={width} y1={y(g)} y2={y(g)} stroke={g === 0 ? colors.faint : colors.line} strokeWidth={1} />
          <SvgText fontFamily={FONT} x={left - 6} y={y(g) + 4} fontSize={10} fill={colors.muted} textAnchor="end">{g > 0 ? `+${g}` : g}</SvgText>
        </React.Fragment>
      ))}
      {runs.filter((r) => r.length > 1).map((r, i) => (
        <Polyline key={i} points={r.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colors.navy} strokeWidth={2} />
      ))}
      {pts.map((p, i) => p && <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.navy} />)}
      {weeks.map((w, i) => (
        <SvgText fontFamily={FONT} key={w} x={left + slot * i + slot / 2} y={height - 5} fontSize={10} fill={colors.muted} textAnchor="middle">{short(w)}</SvgText>
      ))}
    </Svg>
  );
}

// Yatay oran çubuğu (satır içinde)
export function RateBar({ rate }: { rate: number | null }) {
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden', flex: 1 }}>
      <View style={{ width: `${rate ?? 0}%`, height: 6, backgroundColor: colors.navy }} />
    </View>
  );
}

export function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: 150, backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 2 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.navy }}>{value}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{label}</Text>
      {hint ? <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 15 }}>{hint}</Text> : null}
    </View>
  );
}
