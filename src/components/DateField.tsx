import React, { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { formatTR, fromISO, toISO } from '../dates';

type Props = {
  mode: 'date' | 'time';
  value?: string; // date: ISO, time: HH:MM
  onChange: (v: string | undefined) => void;
  placeholder: string;
  clearable?: boolean;
  maximumDate?: Date;
};

const box = {
  backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 14, minHeight: 48,
  borderWidth: 1.5, borderColor: colors.line,
  flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const,
};

const toDate = (mode: Props['mode'], value?: string): Date => {
  if (!value) {
    const d = new Date();
    if (mode === 'time') d.setHours(19, 0, 0, 0);
    return d;
  }
  if (mode === 'date') return fromISO(value);
  const [h, m] = value.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

const fromDate = (mode: Props['mode'], d: Date) =>
  mode === 'date'
    ? toISO(d)
    : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// iOS: alanın altında açılan seçici + Vazgeç / Kaydet. Telefon karanlık moddaysa
// yazılar beyaz kalıp boş görünmesin diye seçici her zaman açık temada çizilir.
// Android: sistemin kendi tarih/saat penceresi (Tamam/İptal içinde).
export default function DateField({ mode, value, onChange, placeholder, clearable, maximumDate }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => toDate(mode, value));

  const label = value ? (mode === 'date' ? formatTR(value) : value) : placeholder;

  const show = () => {
    setDraft(toDate(mode, value));
    setOpen(true);
  };

  return (
    <View>
      <View style={[box, open && { borderWidth: 1.5, borderColor: colors.navy }]}>
        <Pressable style={{ flex: 1, paddingVertical: 14 }} onPress={open ? () => setOpen(false) : show}>
          <Text style={{ fontSize: 15, color: value ? colors.navy : colors.muted }}>{label}</Text>
        </Pressable>
        {clearable && !!value && !open && (
          <Pressable onPress={() => onChange(undefined)} hitSlop={10} accessibilityLabel="Temizle">
            <Ionicons name="close-circle" size={20} color={colors.faint} />
          </Pressable>
        )}
        {!value && <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color={colors.muted} />}
      </View>

      {open && Platform.OS === 'android' && (
        <DateTimePicker
          value={draft}
          mode={mode}
          is24Hour
          maximumDate={maximumDate}
          onChange={(e, d) => {
            setOpen(false);
            if (e.type === 'set' && d) onChange(fromDate(mode, d));
          }}
        />
      )}

      {open && Platform.OS !== 'android' && (
        <View style={{ backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, marginTop: 8, paddingTop: 4, overflow: 'hidden' }}>
          <DateTimePicker
            value={draft}
            mode={mode}
            is24Hour
            locale="tr-TR"
            display="spinner"
            themeVariant="light"
            textColor={colors.navy}
            maximumDate={maximumDate}
            onChange={(_, d) => d && setDraft(d)}
            style={{ height: 200, alignSelf: 'stretch' }}
          />
          <View style={{ flexDirection: 'row', gap: 10, padding: 12 }}>
            <Pressable
              onPress={() => setOpen(false)}
              style={{ flex: 1, height: 44, borderRadius: radius.sm, backgroundColor: '#F1F2F6', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.navy }}>Vazgeç</Text>
            </Pressable>
            <Pressable
              onPress={() => { onChange(fromDate(mode, draft)); setOpen(false); }}
              style={{ flex: 1, height: 44, borderRadius: radius.sm, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Kaydet</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
