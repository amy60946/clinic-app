// "Ebeveyn deneyimini önizle": ebeveynin aile uygulamasında göreceği ekranlar (rakipteki aile uygulamasına sadık; 9 Kasım 2026 videoları).
// Ben (Görevlerin · Derslere devam et) → eğitim sayfası (Öğrenme modülleri %, Uygulama görevleri, Tek seferlik görevler, Başla) → oynatıcı
// (okuma sayfalı + "Bu metni okudum"; test giriş kartı, "Cevabı kontrol et", Doğru/Yanlış, sonuç kartı; açık uçlu) → uygulama kaydı → tek
// seferlik görev ("Tamamlandı olarak işaretle" → "Nasıl geçti?" + düşünce → "Tamamlandı!"). Yerel; kaydedilmez. Gerçek ekranlar ParentApp penceresinin işi.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet, TextInput, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { LibItem, itemByKey, Training, Detail, TTask, TTodo, measureLabel } from '../../lib/training';

type Screen = { k: 'home' } | { k: 'training' } | { k: 'player'; i: number; page: number } | { k: 'task'; task: TTask } | { k: 'todo'; todo: TTodo };
const TYPE_WORD: Record<string, string> = { reading: 'Okuma', quiz: 'Test', short: 'Açık uçlu', video: 'Video', pdf: 'PDF' };
const RATE = ['Çok kötü', 'Kötü', 'Fena değil', 'İyi', 'Harika'];
const trToday = () => new Date().toLocaleDateString('tr-TR');

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
  const [readOk, setReadOk] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');
  const pct = items.length ? Math.round((items.filter((x) => done.has(x.key)).length / items.length) * 100) : 0;
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 1800); };
  const back = () => (training ? setScreen({ k: 'training' }) : onClose());

  const body = (() => {
    if (screen.k === 'home') {
      return (
        <ScrollView contentContainerStyle={s.pad}>
          <Text style={s.big}>Ben</Text>
          <View style={s.card}>
            <Text style={s.cardHead}>Görevlerin</Text>
            <Pressable onPress={() => setScreen({ k: 'training' })} style={s.row} accessibilityRole="button">
              <Ionicons name="clipboard-outline" size={18} color={colors.navy} /><Text style={s.rowText}>Uzmanından {tasks.length + todos.filter((t) => !todoDone.has(t.id)).length} görev</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          </View>
          <Text style={s.sec}>Derslere devam et</Text>
          <Pressable onPress={() => setScreen({ k: 'training' })} style={s.lesson} accessibilityRole="button" accessibilityLabel={training!.title}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={[s.rowText, { fontWeight: '700' }]}>{training!.title}</Text><Text style={[s.pctText, { flexShrink: 0 }]}>%{pct}</Text></View>
            <View style={s.bar}><View style={[s.fill, { width: `${pct}%` }]} /></View>
          </Pressable>
        </ScrollView>
      );
    }
    if (screen.k === 'training') {
      return (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={[s.pad, { paddingBottom: 90 }]}>
            <Pressable onPress={() => setScreen({ k: 'home' })} style={s.back} accessibilityRole="button"><Ionicons name="arrow-back" size={16} color={colors.navy} /><Text style={s.backText}>Tüm dersler</Text></Pressable>
            <View style={s.titleCard}><Text style={s.big}>{training!.title}</Text></View>
            <View style={s.secRow}><Text style={[s.sec, { marginTop: 0, flexShrink: 1 }]}>Öğrenme modülleri</Text><Text style={[s.pctText, { flexShrink: 0, minWidth: 40, textAlign: 'right' }]}>%{pct}</Text></View>
            <View style={s.bar}><View style={[s.fill, { width: `${pct}%` }]} /></View>
            {items.map((it, i) => (
              <Pressable key={it.key} onPress={() => setScreen({ k: 'player', i, page: 0 })} style={s.row} accessibilityRole="button">
                <View style={{ flex: 1, minWidth: 0 }}><Text style={s.tiny}>{TYPE_WORD[it.type]}</Text><Text style={s.rowText}>{it.title}</Text></View>
                <View style={[s.box, done.has(it.key) && s.boxOn]}>{done.has(it.key) && <Ionicons name="checkmark" size={13} color="#fff" />}</View>
              </Pressable>
            ))}
            {tasks.length > 0 && <Text style={s.sec}>Uygulama görevleri</Text>}
            {tasks.map((t) => (
              <Pressable key={t.id} onPress={() => setScreen({ k: 'task', task: t })} style={s.row} accessibilityRole="button" accessibilityLabel={t.title}>
                <Text style={[s.rowText, s.upper]}>{t.title}</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
            ))}
            {todos.length > 0 && <Text style={s.sec}>Tek seferlik görevler</Text>}
            {todos.map((t) => (
              <Pressable key={t.id} onPress={() => setScreen({ k: 'todo', todo: t })} style={s.row} accessibilityRole="button" accessibilityLabel={t.title}>
                <View style={{ flex: 1, minWidth: 0 }}><Text style={s.tiny}>Tek seferlik görev</Text><Text style={[s.rowText, s.upper]}>{t.title}</Text></View>
                <View style={[s.box, todoDone.has(t.id) && s.boxOn]}>{todoDone.has(t.id) && <Ionicons name="checkmark" size={13} color="#fff" />}</View>
              </Pressable>
            ))}
          </ScrollView>
          {items.length > 0 && (
            <View style={s.sticky}>
              <Pressable onPress={() => setScreen({ k: 'player', i: Math.max(0, items.findIndex((x) => !done.has(x.key))), page: 0 })} style={[s.primary, { marginTop: 0 }]} accessibilityRole="button"><Text style={s.primaryText}>Başla</Text></Pressable>
            </View>
          )}
        </View>
      );
    }
    if (screen.k === 'task') {
      return <PracticeSheet task={screen.task} trainingTitle={training?.title ?? ''} onBack={back} onSubmit={() => { back(); flash('Gönderildi (önizleme, kaydedilmedi)'); }} />;
    }
    if (screen.k === 'todo') {
      return <TodoSheet todo={screen.todo} done={todoDone.has(screen.todo.id)} onBack={back}
        onDone={() => setTodoDone((x) => new Set(x).add(screen.todo.id))} />;
    }
    // Oynatıcı
    const { i, page } = screen;
    const it = items[i];
    if (!it) return null;
    const remaining = items.filter((x) => !done.has(x.key)).length;
    const nextItem = items[i + 1];
    const nextName = nextItem ? `Sonraki: ${TYPE_WORD[nextItem.type]}` : 'Bitir';
    const finish = () => {
      const left = new Set(done).add(it.key);
      setDone(left);
      if (nextItem) setScreen({ k: 'player', i: i + 1, page: 0 });
      else back();
    };
    const go = (p: number) => setScreen({ k: 'player', i, page: p });
    const prev = () => (page > 0 ? go(page - 1) : i > 0 ? setScreen({ k: 'player', i: i - 1, page: 0 }) : back());
    let content: React.ReactNode = null;
    let next = { label: 'İleri', onPress: () => go(page + 1), disabled: false };

    if (it.type === 'reading') {
      // giriş kartı yok; bölüm bölüm sayfa, son sayfada "Bu metni okudum" işaretlenmeden ilerlenmez
      const secs = it.sections ?? [];
      const sec = secs[page];
      const last = page >= secs.length - 1;
      content = (
        <View style={{ gap: 8 }}>
          {page === 0 && <Text style={s.big}>{it.title}</Text>}
          {sec && <Text style={s.h}>{sec.heading}</Text>}
          {(sec?.paragraphs ?? []).map((p, j) => <Text key={j} style={s.p}>{p}</Text>)}
          {(sec?.bullets ?? []).map((b, j) => <Text key={`b${j}`} style={s.p}>{/^\d+[.)]\s/.test(b) ? b : `• ${b}`}</Text>)}
          {last && (
            <Pressable onPress={() => setReadOk((r) => ({ ...r, [it.key]: !r[it.key] }))} style={s.checkRow} accessibilityRole="checkbox" accessibilityState={{ checked: !!readOk[it.key] }}>
              <View style={[s.box, readOk[it.key] && s.boxOn]}>{readOk[it.key] && <Ionicons name="checkmark" size={13} color="#fff" />}</View>
              <Text style={s.p}>Bu metni okudum</Text>
            </Pressable>
          )}
        </View>
      );
      next = last ? { label: nextName, onPress: finish, disabled: !readOk[it.key] } : next;
    } else if (it.type === 'quiz') {
      const qs = it.questions ?? [];
      if (page === 0) {
        content = <Intro title={it.title} line={`${qs.length} soruluk çoktan seçmeli test`} />;
        next = { label: 'Başla', onPress: () => go(1), disabled: false };
      } else if (page <= qs.length) {
        const q = qs[page - 1], id = `${it.key}:${page}`, pick = picks[id], shown = !!checked[id];
        content = (
          <View style={{ gap: 8 }}>
            <Text style={s.h}>{q.q}</Text>
            {q.options.map((o, j) => {
              const on = pick === j, right = j === q.answer;
              return (
                <Pressable key={j} disabled={shown} onPress={() => setPicks((p) => ({ ...p, [id]: j }))}
                  style={[s.opt, on && !shown && s.optOn, shown && right && s.rightOpt, shown && on && !right && s.wrongOpt]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                  <Text style={[s.p, { flex: 1 }]}>{o}</Text>
                  {shown && right && <Ionicons name="checkmark-circle" size={18} color="#2C4A9A" />}
                  {shown && on && !right && <Ionicons name="close-circle" size={18} color={colors.danger} />}
                </Pressable>
              );
            })}
            {shown && <Text style={[s.verdict, { color: pick === q.answer ? colors.ok : colors.danger }]}>{pick === q.answer ? '✓ Doğru' : '✗ Yanlış'}</Text>}
          </View>
        );
        next = shown
          ? { label: page < qs.length ? 'Sonraki soru' : 'Bitir', onPress: () => go(page + 1), disabled: false }
          : { label: 'Cevabı kontrol et', onPress: () => setChecked((c) => ({ ...c, [id]: true })), disabled: pick === undefined };
      } else {
        const right = qs.filter((q, k) => picks[`${it.key}:${k + 1}`] === q.answer).length;
        content = (
          <View style={s.intro}>
            <Text style={s.score}>%{qs.length ? Math.round((right / qs.length) * 100) : 0}</Text>
            <Text style={[s.big, { textAlign: 'center' }]}>{qs.length} sorudan {right} tanesini doğru yanıtladın!</Text>
            <Text style={[s.p, { textAlign: 'center' }]}>Bu konuyu bir sonraki seansında uzmanınla gözden geçirmeni öneririz.</Text>
          </View>
        );
        next = { label: nextName, onPress: finish, disabled: false };
      }
    } else if (it.type === 'short') {
      const ps = it.prompts ?? [];
      if (page === 0) {
        content = <Intro title={it.title} line={`${ps.length} açık uçlu soru`} />;
      } else {
        const q = ps[page - 1], id = `${it.key}:${page}`;
        content = (
          <View style={{ gap: 8 }}>
            <Text style={s.h}>{q}</Text>
            <TextInput value={texts[id] ?? ''} onChangeText={(v) => setTexts((x) => ({ ...x, [id]: v }))} placeholder="Yanıtını yaz..." placeholderTextColor={colors.muted}
              multiline style={s.input} accessibilityLabel={q} />
          </View>
        );
        if (page >= ps.length) next = { label: nextName, onPress: finish, disabled: false };
      }
    }
    return <Player pct={pct} remaining={remaining} content={content} onPrev={prev} canPrev={page > 0 || i > 0}
      onMenu={training ? () => setScreen({ k: 'training' }) : undefined} next={next} />;
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
        <View style={[s.topbar, framed && { backgroundColor: colors.navy }]}>
          <Text style={[s.topTitle, framed && { color: '#fff' }]}>Ebeveyn deneyimi</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Önizlemeyi kapat"><Ionicons name="close" size={24} color={framed ? '#fff' : colors.navy} /></Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: framed ? 20 : 0 }}>{phone}</View>
      </SafeAreaView>
    </Modal>
  );
}

function Intro({ title, line }: { title: string; line: string }) {
  return (
    <View style={s.intro}>
      <Text style={[s.big, { textAlign: 'center' }]}>{title}</Text>
      <Text style={s.p}>{line}</Text>
    </View>
  );
}

function Player({ pct, remaining, content, onPrev, canPrev, next, onMenu }: {
  pct: number; remaining: number; content: React.ReactNode; onPrev: () => void; canPrev: boolean;
  next: { label: string; onPress: () => void; disabled: boolean }; onMenu?: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[s.pctText, { flexShrink: 0 }]}>%{pct}</Text>
          <View style={[s.bar, { flex: 1, marginTop: 0 }]}><View style={[s.fill, { width: `${pct}%` }]} /></View>
          {onMenu && <Pressable onPress={onMenu} hitSlop={8} accessibilityRole="button" accessibilityLabel="Eğitime dön"><Ionicons name="ellipsis-horizontal" size={20} color={colors.navy} /></Pressable>}
        </View>
        <Text style={s.tiny}>{remaining ? `${remaining} öğe kaldı` : 'Hepsi bitti!'}</Text>
      </View>
      <ScrollView contentContainerStyle={[s.pad, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">{content}</ScrollView>
      <View style={s.footer}>
        {canPrev && <Pressable onPress={onPrev} style={s.ghost} accessibilityRole="button"><Text style={s.ghostText}>Önceki</Text></Pressable>}
        <Pressable onPress={next.onPress} disabled={next.disabled} style={[s.primary, { flex: 1, marginTop: 0 }, next.disabled && { opacity: 0.4 }]} accessibilityRole="button"><Text style={s.primaryText}>{next.label}</Text></Pressable>
      </View>
    </View>
  );
}

function PracticeSheet({ task, trainingTitle, onBack, onSubmit }: { task: TTask; trainingTitle: string; onBack: () => void; onSubmit: () => void }) {
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [r, setR] = useState('');
  const num = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 4);
  return (
    <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[s.tiny, { flex: 1 }]}>Parçası: {trainingTitle}</Text>
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Geri"><Ionicons name="close" size={20} color={colors.navy} /></Pressable>
      </View>
      <View style={s.yellow}><Text style={[s.h, s.upper, { color: '#5C4300' }]}>{task.title}</Text></View>
      {!!task.description && <Text style={s.p}>{task.description}</Text>}
      {task.measure === 'frequency' && <Field label={measureLabel(task.measure) + ' sayısı'} value={a} onChange={(v) => setA(num(v))} />}
      {task.measure === 'accuracy' && <><Field label="Başarılı deneme sayısı" value={a} onChange={(v) => setA(num(v))} /><Field label="Toplam deneme sayısı" value={b} onChange={(v) => setB(num(v))} /></>}
      {task.measure === 'duration' && <Field label="Süre (dakika)" value={a} onChange={(v) => setA(num(v))} />}
      <Text style={s.label}>Paylaşmak istediğin bir düşünce var mı?</Text>
      <TextInput value={r} onChangeText={(v) => setR(v.slice(0, 255))} placeholder="Ne iyi gitti? Ne daha iyi olabilirdi?" placeholderTextColor={colors.muted} multiline style={s.input} accessibilityLabel="Düşüncen" />
      <Text style={[s.tiny, { alignSelf: 'flex-end' }]}>{r.length}/255</Text>
      <Pressable onPress={onSubmit} style={s.primary} accessibilityRole="button"><Text style={s.primaryText}>Gönder</Text></Pressable>
    </ScrollView>
  );
}

// Tek seferlik görev: "Tamamlandı olarak işaretle" → "Nasıl geçti?" (Çok kötü … Harika) + düşünce ≤ 140 → "Tamamlandı!"
function TodoSheet({ todo, done, onBack, onDone }: { todo: TTodo; done: boolean; onBack: () => void; onDone: () => void }) {
  const [step, setStep] = useState<'view' | 'rate'>('view');
  const [rate, setRate] = useState(2);
  const [r, setR] = useState('');
  return (
    <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Geri"><Ionicons name="close" size={20} color={colors.navy} /></Pressable>
      </View>
      <View style={s.yellow}><Text style={s.tiny}>Atandı: Bugün</Text><Text style={[s.h, s.upper, { color: '#5C4300' }]}>{todo.title}</Text></View>
      {!!todo.description && <Text style={s.p}>{todo.description}</Text>}
      <Text style={s.tiny}>{trToday()} · Atanma tarihi</Text>
      {done ? (
        <View style={s.intro}><Text style={s.big}>🎉 Tamamlandı!</Text></View>
      ) : step === 'view' ? (
        <Pressable onPress={() => setStep('rate')} style={s.primary} accessibilityRole="button"><Text style={s.primaryText}>✓ Tamamlandı olarak işaretle</Text></Pressable>
      ) : (
        <View style={{ gap: 10 }}>
          <Text style={s.label}>Nasıl geçti?</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {RATE.map((l, k) => (
              <Pressable key={l} onPress={() => setRate(k)} style={[s.rate, rate === k && s.rateOn]} accessibilityRole="radio" accessibilityState={{ selected: rate === k }} accessibilityLabel={l}>
                <Text style={[s.tiny, rate === k && { color: '#fff' }]}>{k + 1}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={s.tiny}>Çok kötü</Text><Text style={s.tiny}>Harika</Text></View>
          <Text style={s.label}>Paylaşmak istediğin bir düşünce var mı?</Text>
          <Text style={s.tiny}>Bu yalnızca uzmanınla paylaşılır.</Text>
          <TextInput value={r} onChangeText={(v) => setR(v.slice(0, 140))} multiline style={s.input} accessibilityLabel="Düşüncen" placeholderTextColor={colors.muted} />
          <Text style={[s.tiny, { alignSelf: 'flex-end' }]}>{r.length}/140</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => setStep('view')} style={s.ghost} accessibilityRole="button"><Text style={s.ghostText}>Vazgeç</Text></Pressable>
            <Pressable onPress={onDone} style={[s.primary, { flex: 1, marginTop: 0 }]} accessibilityRole="button"><Text style={s.primaryText}>Gönder</Text></Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType="number-pad" placeholder="#" placeholderTextColor={colors.muted} style={[s.input, { minHeight: 44 }]} accessibilityLabel={label} />
    </View>
  );
}

const s = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(10,14,28,0.78)' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  topTitle: { fontSize: 16, fontWeight: '700', color: colors.navy },
  phoneBase: { backgroundColor: '#fff', overflow: 'hidden' },
  framed: { width: 390, borderRadius: 34, borderWidth: 8, borderColor: '#0F1B3D' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3E9D6', paddingHorizontal: 12, paddingVertical: 6 },
  noteText: { fontSize: 11.5, color: '#7A5A22', flexShrink: 1 },
  pad: { padding: 16, gap: 10 },
  big: { fontSize: 20, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, gap: 8 },
  cardHead: { fontSize: 15, fontWeight: '700', color: colors.navy },
  titleCard: { backgroundColor: '#EEF1F8', borderRadius: 14, padding: 14 },
  sec: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 10 },
  secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12 },
  rowText: { fontSize: 14, color: colors.navy, flex: 1, flexShrink: 1 },
  upper: { textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.3 },
  lesson: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, gap: 8 },
  pctText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  bar: { height: 8, borderRadius: 4, backgroundColor: '#ECEEF3', overflow: 'hidden', marginTop: 2 },
  fill: { height: '100%', backgroundColor: colors.ok, borderRadius: 4 },
  tiny: { fontSize: 11.5, color: colors.muted, fontWeight: '600' },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.ok, borderColor: colors.ok },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { color: colors.navy, fontWeight: '600' },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line },
  primary: { backgroundColor: colors.navy, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ghost: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' },
  ghostText: { color: colors.navy, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: colors.line },
  intro: { alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 24, marginTop: 20 },
  score: { fontSize: 36, fontWeight: '800', color: colors.navy },
  h: { fontSize: 16, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  p: { fontSize: 14.5, lineHeight: 22, color: colors.text, flexShrink: 1 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  optOn: { borderColor: colors.navy, backgroundColor: '#EEF1F8' },
  rightOpt: { borderColor: '#2C4A9A', backgroundColor: '#E3EBFA' },
  wrongOpt: { borderColor: colors.danger, backgroundColor: '#FDE7EA' },
  verdict: { fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, minHeight: 90, fontSize: 14.5, color: colors.text, textAlignVertical: 'top' },
  label: { fontSize: 13, fontWeight: '600', color: colors.navy },
  yellow: { backgroundColor: '#FFF1C9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  rate: { flex: 1, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  rateOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 20, backgroundColor: colors.navy, borderRadius: 12, padding: 12, alignItems: 'center' },
  toastText: { color: '#fff', fontWeight: '600' },
});
