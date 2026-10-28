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

// Haftalık sayı (ör. zor an): hafta başına sütun, ölçek en büyük değere göre; 0 hafta ince çizgi
export function CountBars({ data, height = 140, width = 520, color = colors.navy }: {
  data: { start: string; value: number }[]; height?: number; width?: number; color?: string;
}) {
  const top = 18, bottom = 22, left = 4;
  const h = height - top - bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = (width - left) / Math.max(data.length, 1);
  const bar = Math.min(36, slot * 0.6);
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={left} x2={width} y1={top + h} y2={top + h} stroke={colors.line} strokeWidth={1} />
      {data.map((d, i) => {
        const x = left + slot * i + (slot - bar) / 2;
        const bh = (h * d.value) / max;
        return (
          <React.Fragment key={d.start}>
            <Rect x={x} y={top + h - Math.max(bh, 1)} width={bar} height={Math.max(bh, 1)} rx={4} fill={d.value ? color : colors.line} />
            <SvgText fontFamily={FONT} x={x + bar / 2} y={top + h - bh - 5} fontSize={11} fill={colors.text} textAnchor="middle">{String(d.value)}</SvgText>
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

// Çizgi renkleri (çoklu görev): lacivert dışında ayırt edilebilir, renk körlüğünde de farklı tonlar
export const SERIES_COLORS = ['#2C4A9A', '#D9822B', '#2F8F6B', '#C2417A', '#7A5BC8', '#8A6D1F'];

// Zaman içinde: hafta başına sayı, görev başına bir çizgi; isteğe bağlı kesikli "planlı" çizgisi (ilk seçili görev için)
export function MultiLine({ starts, series, target, height = 200, width = 640 }: {
  starts: string[]; series: { id: string; values: number[]; color: string }[]; target?: number[] | null; height?: number; width?: number;
}) {
  const top = 12, bottom = 22, left = 26, right = 8;
  const h = height - top - bottom;
  const all = [...series.flatMap((s) => s.values), ...(target ?? [])];
  const max = Math.max(7, ...all);
  const step = max <= 8 ? 1 : max <= 16 ? 2 : 5;
  const slot = (width - left - right) / Math.max(starts.length - 1, 1);
  const x = (i: number) => left + (starts.length === 1 ? (width - left - right) / 2 : slot * i);
  const y = (v: number) => top + h - (h * v) / max;
  const grid = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {grid.map((g) => (
        <React.Fragment key={g}>
          <Line x1={left} x2={width - right} y1={y(g)} y2={y(g)} stroke={colors.line} strokeWidth={1} />
          <SvgText fontFamily={FONT} x={left - 6} y={y(g) + 4} fontSize={10} fill={colors.muted} textAnchor="end">{g}</SvgText>
        </React.Fragment>
      ))}
      {!!target && (
        <Polyline points={target.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={colors.muted} strokeWidth={1.5} strokeDasharray="5 4" />
      )}
      {series.map((s) => (
        <React.Fragment key={s.id}>
          {s.values.length > 1 && (
            <Polyline points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2.2} />
          )}
          {s.values.map((v, i) => <Circle key={i} cx={x(i)} cy={y(v)} r={3.2} fill={s.color} />)}
        </React.Fragment>
      ))}
      {starts.map((w, i) => (
        <SvgText fontFamily={FONT} key={w} x={x(i)} y={height - 6} fontSize={10} fill={colors.muted} textAnchor="middle">{short(w)}</SvgText>
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
