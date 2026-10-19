// Web önizlemesi için tarih/saat alanı (telefonda DateField.tsx kullanılır)
import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

type Props = {
  mode: 'date' | 'time';
  value?: string; // date: ISO, time: HH:MM
  onChange: (v: string | undefined) => void;
  placeholder: string;
  clearable?: boolean;
  maximumDate?: Date;
};

export default function DateField({ mode, value, onChange, clearable, maximumDate }: Props) {
  const max = maximumDate ? maximumDate.toISOString().slice(0, 10) : undefined;
  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 14, minHeight: 48,
      flexDirection: 'row', alignItems: 'center', gap: 8,
    }}>
      {React.createElement('input', {
        type: mode,
        lang: 'tr',
        max: mode === 'date' ? max : undefined,
        value: value ?? '',
        onChange: (e: { target: { value: string } }) => onChange(e.target.value || undefined),
        style: {
          flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', padding: '14px 0',
          fontSize: 15, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: value ? colors.navy : colors.muted,
        },
      })}
      {clearable && !!value && (
        <Pressable onPress={() => onChange(undefined)} hitSlop={10} accessibilityLabel="Temizle">
          <Ionicons name="close-circle" size={20} color={colors.faint} />
        </Pressable>
      )}
    </View>
  );
}
