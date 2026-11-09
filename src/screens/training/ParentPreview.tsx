// "Ebeveyn deneyimini önizle": ebeveynin aile uygulamasında göreceği ekranlar (rakipteki aile uygulamasına sadık).
// Ben › Derslere devam et → eğitim sayfası (Öğrenme modülleri, Uygulama görevleri, Tek seferlik görevler, Başla) → oynatıcı
// (okuma "Bu metni okudum", test "Cevabı gör" + Doğru/Yanlış + sonuç kartı, açık uçlu tek soru) → uygulama kaydı. Yerel; kaydedilmez.
// Gerçek ekranlar ParentApp penceresinin işi; bu bileşen uzmanın önizlemesi.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet, TextInput, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { LibItem, itemByKey, itemIntro, Training, Detail, TTask, typeMeta } from '../../lib/training';

type Screen = { k: 'home' } | { k: 'training' } | { k: 'player'; i: number; page: number } | { k: 'task'; task: TTask };
const TYPE_WORD: Record<string, string> = { reading: 'Okuma', quiz: 'Test', short: 'Test', video: 'Video', pdf: 'PDF' };

export default function ParentPreview({ items: given, training, detail, onClose }: {
  items?: LibItem[]; training?: Training; detail?: Detail; onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const framed = width >= 700 && height >= 560;
  const mods = useMemo(() => (training && detail ? detail.modules.filter((m) => m.training_id === training.id && !m.archived) : []), [training, detail]);
  const items = useMemo(() => given ?? mods.map((m) => itemByKey(m.item_key)).filter((x): x is LibItem => !!x), [given, mods]);
  const tasks = training && detail ? detail.tasks.filter((t) => t.training_id === training.id && !t.archived) : [];
  const todos = training && detail ? detail.todos.filter((t) => t.training_id === training.id && !t.archived) : [];
  const [done, setDone] = useState<Set<string>>(() => new Set(mods.filter((m) => m.completed_at).map((m) => m.item_key)));
  const [todoDone, setTodoDone] = useState<Set<string>>(() => new Set(todos.filter((t) => t.done_at).map((t) => t.id)));
  const [screen, setScreen] = useState<Screen>(training ? { k: 'home' } : { k: 'player', i: 0, page: 0 });
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');
  const pct = items.length ? Math.round((items.filter((x) => done.has(x.key)).length / items.length) * 100) : 0;
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 1800); };

  const body = (() => {
    if (screen.k === 'home') {
      return (
        <ScrollView contentContainerStyle={s.pad}>
          <Text style={s.big}>Ben</Text>
          <Text style={s.sec}>Görevlerin</Text>
          <View style={s.row}><Ionicons name="clipboard-outline" size={18} color={colors.navy} /><Text style={s.rowText}>Uzmanından {tasks.length + todos.length} görev</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} /></View>
          <View style={s.row}><Ionicons name="pulse-outline" size={18} color={colors.navy} /><Text style={s.rowText}>Çocuğunun davranışını kaydet</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} /></View>
          <Text style={s.sec}>Derslere devam et</Text>
          <Pressable onPress={() => setScreen({ k: 'training' })} style={s.lesson} accessibilityRole="button">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={[s.rowText, { fontWeight: '700' }]}>{training!.title}</Text><Text style={s.pctText}>%{pct}</Text></View>
            <View style={s.bar}><View style={[s.fill, { width: `${pct}%` }]} /></View>
          </Pressable>
        </ScrollView>
      );
    }
    if (screen.k === 'training') {
      return (
        <ScrollView contentContainerStyle={s.pad}>
          <Pressable onPress={() => setScreen({ k: 'home' })} style={s.back} accessibilityRole="button"><Ionicons name="arrow-back" size={16} color={colors.navy} /><Text style={s.backText}>Tüm dersler</Text></Pressable>
          <Text style={s.big}>{training!.title}</Text>
          <View style={s.secRow}><Text style={s.sec}>Öğrenme modülleri</Text><Text style={s.pctText}>%{pct}</Text></View>
          {items.map((it, i) => (
            <Pressable key={it.key} onPress={() => setScreen({ k: 'player', i, page: 0 })} style={s.row} accessibilityRole="button">
              <View style={{ flex: 1 }}><Text style={s.tiny}>{TYPE_WORD[it.type]}</Text><Text style={s.rowText}>{it.title}</Text></View>
              <View style={[s.box, done.has(it.key) && s.boxOn]}>{done.has(it.key) && <Ionicons name="checkmark" size={13} color="#fff" />}</View>
            </Pressable>
          ))}
          {tasks.length > 0 && <Text style={s.sec}>Uygulama görevleri</Text>}
          {tasks.map((t) => (
            <Pressable key={t.id} onPress={() => setScreen({ k: 'task', task: t })} style={s.row} accessibilityRole="button">
              <Text style={s.rowText}>{t.title}</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))}
          {todos.length > 0 && <Text style={s.sec}>Tek seferlik görevler</Text>}
          {todos.map((t) => (
            <Pressable key={t.id} onPress={() => setTodoDone((x) => { const n = new Set(x); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; })} style={s.row} accessibilityRole="checkbox" accessibilityState={{ checked: todoDone.has(t.id) }}>
              <View style={{ flex: 1 }}><Text style={s.tiny}>Tek seferlik görev</Text><Text style={s.rowText}>{t.title}</Text></View>
              <View style={[s.box, todoDone.has(t.id) && s.boxOn]}>{todoDone.has(t.id) && <Ionicons name="checkmark" size={13} color="#fff" />}</View>
            </Pressable>
          ))}
          {items.length > 0 && <Pressable onPress={() => setScreen({ k: 'player', i: Math.max(0, items.findIndex((x) => !done.has(x.key))), page: 0 })} style={s.primary} accessibilityRole="button"><Text style={s.primaryText}>Başla</Text></Pressable>}
        </ScrollView>
      );
    }
    if (screen.k === 'task') {
      const t = screen.task;
      return <PracticeSheet task={t} trainingTitle={training?.title ?? ''} onBack={() => setScreen({ k: 'training' })} onSubmit={() => { setScreen({ k: 'training' }); flash('Gönderildi (önizleme, kaydedilmedi)'); }} />;
    }
    // Oynatıcı
    const { i, page } = screen;
    const it = items[i];
    if (!it) return null;
    const remaining = items.filter((x) => !done.has(x.key)).length;
    const pages = it.type === 'reading' ? (it.sections?.length ?? 1) : it.type === 'quiz' ? (it.questions?.length ?? 0) + 1 : it.prompts?.length ?? 0;
    // sayfa 0 = giriş kartı; okuma 1..n bölüm; test 1..n soru + sonuç; açık uçlu 1..n soru
    const total = pages + 1;
    const finish = () => {
      setDone((d) => new Set(d).add(it.key));
      if (i + 1 < items.length) setScreen({ k: 'player', i: i + 1, page: 0 });
      else if (training) setScreen({ k: 'training' });
      else onClose();
    };
    const next = () => (page + 1 < total ? setScreen({ k: 'player', i, page: page + 1 }) : finish());
    const prev = () => (page > 0 ? setScreen({ k: 'player', i, page: page - 1 }) : i > 0 ? setScreen({ k: 'player', i: i - 1, page: 0 }) : training ? setScreen({ k: 'training' }) : onClose());
    const nextItem = items[i + 1];
    let content: React.ReactNode = null;
    let nextLabel = 'Sonraki';
    if (page === 0) {
      content = (
        <View style={s.intro}>
          <Ionicons name={typeMeta(it.type).icon as any} size={28} color={colors.navy} />
          <Text style={s.tiny}>{TYPE_WORD[it.type]}</Text>
          <Text style={[s.big, { textAlign: 'center' }]}>{it.title}</Text>
          <Text style={s.p}>{itemIntro(it)}</Text>
        </View>
      );
      nextLabel = 'Başla';
    } else if (it.type === 'reading') {
      const sec = it.sections![page - 1];
      content = (
        <View style={{ gap: 8 }}>
          <Text style={s.h}>{sec.heading}</Text>
          {(sec.paragraphs ?? []).map((p, j) => <Text key={j} style={s.p}>{p}</Text>)}
          {(sec.bullets ?? []).map((b, j) => <Text key={`b${j}`} style={s.p}>{/^\d+[.)]\s/.test(b) ? b : `• ${b}`}</Text>)}
        </View>
      );
      nextLabel = page === pages ? 'Bu metni okudum' : 'Sonraki';
    } else if (it.type === 'quiz') {
      const qs = it.questions ?? [];
      if (page <= qs.length) {
        const q = qs[page - 1], id = `${it.key}:${page}`, pick = picks[id], shown = !!checked[id];
        content = (
          <View style={{ gap: 8 }}>
            <Text style={s.tiny}>Soru {page} / {qs.length}</Text>
            <Text style={s.h}>{q.q}</Text>
            {q.options.map((o, j) => {
              const on = pick === j;
              const st = shown && j === q.answer ? s.right : shown && on ? s.wrong : on ? s.optOn : null;
              return (
                <Pressable key={j} disabled={shown} onPress={() => setPicks((p) => ({ ...p, [id]: j }))} style={[s.opt, st]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                  <Text style={s.p}>{o}</Text>
                </Pressable>
              );
            })}
            {shown && <View style={[s.banner, pick === q.answer ? s.right : s.wrong]}><Text style={s.bannerText}>{pick === q.answer ? 'Doğru' : 'Yanlış'}</Text></View>}
          </View>
        );
        if (!shown) {
          return <Player pct={pct} remaining={remaining} title={it.title} onClose={training ? () => setScreen({ k: 'training' }) : onClose} content={content}
            onPrev={prev} nextLabel="Cevabı gör" nextDisabled={pick === undefined} onNext={() => setChecked((c) => ({ ...c, [id]: true }))} />;
        }
        nextLabel = page < qs.length ? 'Sonraki soru' : 'Sonuç';
      } else {
        const right = qs.filter((q, k) => picks[`${it.key}:${k + 1}`] === q.answer).length;
        content = (
          <View style={s.intro}>
            <Ionicons name="ribbon-outline" size={30} color={colors.navy} />
            <Text style={[s.big, { textAlign: 'center' }]}>{qs.length} sorudan {right} tanesini doğru yanıtladın!</Text>
            <Text style={[s.p, { textAlign: 'center' }]}>Bu konuyu bir sonraki görüşmede uzmanınla birlikte gözden geçirebilirsin.</Text>
          </View>
        );
        nextLabel = nextItem ? `Sonraki: ${TYPE_WORD[nextItem.type]}` : 'Bitir';
      }
    } else if (it.type === 'short') {
      const q = it.prompts![page - 1], id = `${it.key}:${page}`;
      content = (
        <View style={{ gap: 8 }}>
          <Text style={s.tiny}>Soru {page} / {it.prompts!.length}</Text>
          <Text style={s.h}>{q}</Text>
          <TextInput value={texts[id] ?? ''} onChangeText={(v) => setTexts((x) => ({ ...x, [id]: v }))} placeholder="Yanıtını yaz..." placeholderTextColor={colors.muted}
            multiline style={s.input} accessibilityLabel={q} />
        </View>
      );
      nextLabel = page < it.prompts!.length ? 'Sonraki soru' : nextItem ? `Sonraki: ${TYPE_WORD[nextItem.type]}` : 'Bitir';
    }
    if (it.type === 'reading' && page === pages) nextLabel = 'Bu metni okudum';
    return <Player pct={pct} remaining={remaining} title={it.title} onClose={training ? () => setScreen({ k: 'training' }) : onClose} content={content} onPrev={prev} nextLabel={nextLabel} onNext={next} />;
  })();

  const phone = (
    <View style={framed ? [s.phoneBase, s.framed, { height: Math.min(820, height - 110) }] : [s.phoneBase, { flex: 1, width: '100%' }]}>
      <View style={s.note}><Ionicons name="eye-outline" size={14} color="#7A5A22" /><Text style={s.noteText}>Önizleme: ebeveynin göreceği ekran. Yaptıkların kaydedilmez.</Text></View>
      <View style={{ flex: 1 }}>{body}</View>
      {!!toast && <View style={s.toast}><Text style={s.toastText}>{toast}</Text></View>}
    </View>
  );
  return (
    <Modal visible animationType="slide" presentationStyle={framed ? 'overFullScreen' : 'fullScreen'} transparent={framed} onRequestClose={onClose}>
      <SafeAreaView style={[{ flex: 1 }, framed ? s.scrim : { backgroundColor: '#fff' }]}>
        <View style={s.topbar}>
          <Text style={[s.topTitle, framed && { color: '#fff' }]}>Ebeveyn deneyimi</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Önizlemeyi kapat"><Ionicons name="close" size={24} color={framed ? '#fff' : colors.navy} /></Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: framed ? 20 : 0 }}>{phone}</View>
      </SafeAreaView>
    </Modal>
  );
}

function Player({ pct, remaining, title, content, onPrev, onNext, nextLabel, nextDisabled, onClose }: {
  pct: number; remaining: number; title: string; content: React.ReactNode; onPrev: () => void; onNext: () => void; nextLabel: string; nextDisabled?: boolean; onClose: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Kapat"><Ionicons name="close" size={20} color={colors.navy} /></Pressable>
          <View style={[s.bar, { flex: 1, marginTop: 0 }]}><View style={[s.fill, { width: `${pct}%` }]} /></View>
        </View>
        <Text style={s.tiny}>{remaining ? `${remaining} öğe kaldı` : 'Hepsi bitti!'} · {title}</Text>
      </View>
      <ScrollView contentContainerStyle={[s.pad, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">{content}</ScrollView>
      <View style={s.footer}>
        <Pressable onPress={onPrev} style={s.ghost} accessibilityRole="button"><Text style={s.ghostText}>Önceki</Text></Pressable>
        <Pressable onPress={onNext} disabled={nextDisabled} style={[s.primary, { flex: 1, marginTop: 0 }, nextDisabled && { opacity: 0.4 }]} accessibilityRole="button"><Text style={s.primaryText}>{nextLabel}</Text></Pressable>
      </View>
    </View>
  );
}

function PracticeSheet({ task, trainingTitle, onBack, onSubmit }: { task: TTask; trainingTitle: string; onBack: () => void; onSubmit: () => void }) {
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [r, setR] = useState('');
  const num = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 4);
  return (
    <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} style={s.back} accessibilityRole="button"><Ionicons name="arrow-back" size={16} color={colors.navy} /><Text style={s.backText}>Geri</Text></Pressable>
      <Text style={s.tiny}>Parçası: {trainingTitle}</Text>
      <View style={s.yellow}><Text style={[s.h, { color: '#5C4300' }]}>{task.title}</Text></View>
      {!!task.description && <Text style={s.p}>{task.description}</Text>}
      {task.measure === 'frequency' && <Field label="Sıklık sayısı" value={a} onChange={(v) => setA(num(v))} />}
      {task.measure === 'accuracy' && <><Field label="Başarılı deneme sayısı" value={a} onChange={(v) => setA(num(v))} /><Field label="Toplam deneme sayısı" value={b} onChange={(v) => setB(num(v))} /></>}
      {task.measure === 'duration' && <Field label="Süre (dakika)" value={a} onChange={(v) => setA(num(v))} />}
      <Text style={s.label}>Paylaşmak istediğin bir düşünce var mı?</Text>
      <TextInput value={r} onChangeText={(v) => setR(v.slice(0, 255))} placeholder="Ne iyi gitti? Ne daha iyi olabilirdi?" placeholderTextColor={colors.muted} multiline style={s.input} accessibilityLabel="Düşüncen" />
      <Text style={[s.tiny, { alignSelf: 'flex-end' }]}>{r.length}/255</Text>
      <Pressable onPress={onSubmit} style={s.primary} accessibilityRole="button"><Text style={s.primaryText}>Gönder</Text></Pressable>
    </ScrollView>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} style={[s.input, { minHeight: 44 }]} accessibilityLabel={label} />
    </View>
  );
}

const s = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(10,14,28,0.6)' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  topTitle: { fontSize: 16, fontWeight: '700', color: colors.navy },
  phoneBase: { backgroundColor: '#fff', overflow: 'hidden' },
  framed: { width: 390, borderRadius: 34, borderWidth: 8, borderColor: '#0F1B3D' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3E9D6', paddingHorizontal: 12, paddingVertical: 6 },
  noteText: { fontSize: 11.5, color: '#7A5A22', flexShrink: 1 },
  pad: { padding: 16, gap: 10 },
  big: { fontSize: 20, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  sec: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 10 },
  secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12 },
  rowText: { fontSize: 14, color: colors.navy, flex: 1, flexShrink: 1 },
  lesson: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, gap: 8 },
  pctText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  bar: { height: 8, borderRadius: 4, backgroundColor: '#ECEEF3', overflow: 'hidden', marginTop: 2 },
  fill: { height: '100%', backgroundColor: colors.ok, borderRadius: 4 },
  tiny: { fontSize: 11.5, color: colors.muted, fontWeight: '600' },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.ok, borderColor: colors.ok },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { color: colors.navy, fontWeight: '600' },
  primary: { backgroundColor: colors.navy, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ghost: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' },
  ghostText: { color: colors.navy, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: colors.line },
  intro: { alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 24, marginTop: 20 },
  h: { fontSize: 16, fontWeight: '700', color: colors.navy },
  p: { fontSize: 14.5, lineHeight: 22, color: colors.text, flexShrink: 1 },
  opt: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  optOn: { borderColor: colors.navy, backgroundColor: '#EEF1F8' },
  right: { borderColor: colors.ok, backgroundColor: '#E1F1E6' },
  wrong: { borderColor: colors.danger, backgroundColor: '#FDE7EA' },
  banner: { borderWidth: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  bannerText: { fontWeight: '700', color: colors.navy },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, minHeight: 90, fontSize: 14.5, color: colors.text, textAlignVertical: 'top' },
  label: { fontSize: 13, fontWeight: '600', color: colors.navy },
  yellow: { backgroundColor: '#FFF1C9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 20, backgroundColor: colors.navy, borderRadius: 12, padding: 12, alignItems: 'center' },
  toastText: { color: '#fff', fontWeight: '600' },
});
