// Ebeveyn eğitimi ekranlarının ortak parçaları: tür simgesi, durum çipi, pencere çerçevesi, kısa tarih, yüzde grafiği, öğe önizlemesi
import React from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line, Polyline, Polygon, Circle, Text as SvgText } from 'react-native-svg';
import { colors, radius } from '../../theme';
import { IconButton } from '../../components/ui';
import { Sized } from '../../components/charts';
import { Platform } from 'react-native';
import { LibItem, ItemType, typeMeta, STATUS_META, TrainingStatus, Answer } from '../../lib/training';

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
// "28 Eki" (ISO gün ya da zaman damgası; gün yerel saatle)
export function shortDate(iso: string): string {
  const d = iso.length <= 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function TypeTile({ type, size = 34 }: { type: ItemType; size?: number }) {
  const t = typeMeta(type);
  return (
    <View style={{ width: size, height: size, borderRadius: 9, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={t.icon as any} size={size * 0.52} color={t.fg} />
    </View>
  );
}

export function StatusChip({ status, onPress }: { status: TrainingStatus; onPress?: (e: any) => void }) {
  const s = STATUS_META[status];
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={`Durum: ${s.label}${onPress ? '. Değiştir' : ''}`}
      style={[styles.chip, { backgroundColor: s.bg }]}>
      <Text style={{ color: s.fg, fontSize: 13, fontWeight: '700' }}>{s.label}</Text>
      {onPress && <Ionicons name="chevron-down" size={13} color={s.fg} />}
    </Pressable>
  );
}

export const NewDot = () => <View style={styles.dot} accessibilityLabel="Yeni etkinlik" />;

export function SheetFrame({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
        <View style={[styles.column, wide && { maxWidth: 1100 }]}>
          <View style={styles.sheetHeader}>
            <IconButton name="close" label="Kapat" onPress={onClose} />
            <Text style={styles.sheetTitle} numberOfLines={2}>{title}</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
            {children}
          </ScrollView>
          {footer && <View style={styles.sheetFooter}>{footer}</View>}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// Haftalık yüzde alanı (ustalık ölçütüne doğru gözlem verisi), 0–100
const SVG_FONT = Platform.OS === 'web' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : undefined;
export function PercentArea({ points, height = 170, target }: { points: { day: string; value: number }[]; height?: number; target?: number | null }) {
  return (
    <Sized height={height}>
      {(w) => {
        const left = 40, right = 26, top = 10, bottom = 26;
        const iw = Math.max(10, w - left - right), ih = height - top - bottom;
        const n = points.length;
        const x = (i: number) => left + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
        const y = (v: number) => top + ih - (Math.max(0, Math.min(100, v)) / 100) * ih;
        const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
        const area = n ? `${x(0)},${y(0)} ${line} ${x(n - 1)},${y(0)}` : '';
        return (
          <Svg width={w} height={height}>
            {[0, 25, 50, 75, 100].map((v) => (
              <React.Fragment key={v}>
                <Line x1={left} x2={left + iw} y1={y(v)} y2={y(v)} stroke={colors.line} strokeWidth={1} />
                <SvgText x={left - 6} y={y(v) + 4} fontSize={11} fontFamily={SVG_FONT} fill="#5F6884" textAnchor="end">{`%${v}`}</SvgText>
              </React.Fragment>
            ))}
            {n > 1 && <Polygon points={area} fill="#DCE4F5" />}
            {target != null && <Line x1={left} x2={left + iw} y1={y(target)} y2={y(target)} stroke={colors.ok} strokeWidth={1.5} strokeDasharray="5,4" />}
            {target != null && <SvgText x={left + iw} y={y(target) - 4} fontSize={11} fontFamily={SVG_FONT} fill={colors.ok} textAnchor="end">{`Ölçüt %${target}`}</SvgText>}
            {n > 1 && <Polyline points={line} fill="none" stroke={colors.navy} strokeWidth={2} />}
            {points.map((p, i) => (
              <React.Fragment key={i}>
                <Circle cx={x(i)} cy={y(p.value)} r={3.5} fill={colors.navy} />
                <SvgText x={x(i)} y={height - 7} fontSize={11} fontFamily={SVG_FONT} fill="#5F6884" textAnchor={n > 1 && i === n - 1 ? 'end' : n > 1 && i === 0 ? 'start' : 'middle'}>{shortDate(p.day)}</SvgText>
              </React.Fragment>
            ))}
          </Svg>
        );
      }}
    </Sized>
  );
}

// Uzmanın gördüğü öğe içeriği: okuma metni, test (doğru şık işaretli; ebeveyn yanıtladıysa seçtiği), açık uçlu (ebeveynin yanıtları)
export function GhostButton({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.ghost, danger && { borderColor: colors.danger }]} accessibilityRole="button">
      <Text style={[styles.ghostText, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

export function ItemContent({ item, answers, completed }: { item: LibItem; answers?: Answer[] | null; completed?: boolean }) {
  if (item.type === 'reading') {
    return (
      <View style={{ gap: 10 }}>
        {(item.sections ?? []).map((s, i) => (
          <View key={i} style={{ gap: 6 }}>
            <Text style={styles.h}>{s.heading}</Text>
            {(s.paragraphs ?? []).map((p, j) => <Text key={j} style={styles.p}>{p}</Text>)}
            {(s.bullets ?? []).map((b, j) => (
              <View key={`b${j}`} style={{ flexDirection: 'row', gap: 8 }}>
                {!/^\d+[.)]\s/.test(b) && <Text style={styles.p}>•</Text>}<Text style={[styles.p, { flex: 1 }]}>{b}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }
  if (item.type === 'quiz') {
    return (
      <View style={{ gap: 14 }}>
        {answers && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Legend color={colors.ok} label="Ebeveynin doğru yanıtı" />
            <Legend color={colors.danger} label="Ebeveynin yanlış yanıtı" />
            <Legend color="#2C4A9A" label="Doğru yanıt" />
          </View>
        )}
        {(item.questions ?? []).map((q, i) => {
          const pick = answers?.[i]?.pick;
          return (
            <View key={i} style={{ gap: 6 }}>
              <Text style={styles.qn}>Soru {i + 1} / {item.questions!.length}</Text>
              <Text style={styles.h}>{q.q}</Text>
              {q.options.map((o, j) => {
                const right = j === q.answer, chosen = pick === j;
                const bg = chosen && right ? '#E1F1E6' : chosen ? '#FDE7EA' : right ? '#E3EBFA' : '#fff';
                const border = chosen && right ? colors.ok : chosen ? colors.danger : right ? '#2C4A9A' : colors.line;
                return (
                  <View key={j} style={[styles.opt, { backgroundColor: bg, borderColor: border }]}>
                    <Text style={[styles.p, { flex: 1 }]}>{o}</Text>
                    {right && <Ionicons name="checkmark-circle" size={18} color={chosen ? colors.ok : '#2C4A9A'} />}
                    {chosen && !right && <Ionicons name="close-circle" size={18} color={colors.danger} />}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  }
  if (item.type === 'short') {
    return (
      <View style={{ gap: 14 }}>
        {(item.prompts ?? []).map((q, i) => {
          const a = answers?.[i]?.text?.trim();
          return (
            <View key={i} style={{ gap: 6 }}>
              <Text style={styles.qn}>Soru {i + 1} / {item.prompts!.length}</Text>
              <Text style={styles.h}>{q}</Text>
              <View style={styles.answer}><Text style={[styles.p, !a && { color: colors.muted, fontStyle: 'italic' }]}>{a || (completed ? 'Yanıtlanmadı' : 'Yanıtlar burada görünecek')}</Text></View>
            </View>
          );
        })}
      </View>
    );
  }
  return <Text style={styles.p}>{item.desc}</Text>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} /><Text style={{ fontSize: 12, color: colors.muted }}>{label}</Text></View>;
}

export const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  column: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: '#fff' },
  sheetTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.navy },
  sheetFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: '#fff' },
  ghost: { height: 48, paddingHorizontal: 18, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontSize: 15, fontWeight: '600', color: colors.navy },
  h: { fontSize: 15, fontWeight: '700', color: colors.navy },
  p: { fontSize: 14, lineHeight: 21, color: colors.text, flexShrink: 1 },
  qn: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  answer: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, backgroundColor: '#FAFBFC', minHeight: 48 },
});

// Ortada onay penceresi (rakipteki "Mark training as Active?"): başlık, kalın ilk cümle + açıklama, Vazgeç / onay
export function ConfirmDialog({ title, lead, body, confirm, onCancel, onConfirm }: {
  title: string; lead?: string; body: string; confirm: string; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={dialog.scrim} onPress={onCancel} accessibilityLabel="Kapat">
        <Pressable style={dialog.card} onPress={() => {}} accessibilityRole="alert">
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Text style={[dialog.title, { flex: 1 }]}>{title}</Text>
            <IconButton name="close" label="Kapat" onPress={onCancel} />
          </View>
          <Text style={dialog.body}>{lead ? <Text style={{ fontWeight: '700' }}>{lead} </Text> : null}{body}</Text>
          <View style={dialog.row}>
            <GhostButton label="Vazgeç" onPress={onCancel} />
            <Pressable onPress={onConfirm} style={dialog.primary} accessibilityRole="button"><Text style={dialog.primaryText}>{confirm}</Text></Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Kısa süreli bilgi şeridi ("Görev eklendi!")
export function useToast(): [React.ReactNode, (text: string) => void] {
  const [text, setText] = React.useState('');
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = React.useCallback((t: string) => {
    setText(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(''), 2200);
  }, []);
  const node = text ? <View pointerEvents="none" style={dialog.toast}><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={dialog.toastText}>{text}</Text></View> : null;
  return [node, show];
}

const dialog = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(10,14,28,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 440, backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: colors.navy },
  body: { fontSize: 14.5, lineHeight: 21, color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 4 },
  primary: { height: 48, paddingHorizontal: 18, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  toast: { position: 'absolute', alignSelf: 'center', bottom: 30, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.ok, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  toastText: { color: '#fff', fontWeight: '700' },
});
