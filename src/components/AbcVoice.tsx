import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { colors, radius } from '../theme';
import { abcAudioUrl } from '../lib/clinic';
import { track } from '../lib/track';

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Ebeveynin davranış kaydına eklediği ses (ParentApp › Davranış kaydı). Bağlantı imzalı ve 1 saat geçerli.
// compact: tablo hücresinde (Davranışlar ve Olaylar) düğme + süre, ilerleme çubuğu yok
export default function AbcVoice({ path, durationMs, compact }: { path: string; durationMs?: number | null; compact?: boolean }) {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    abcAudioUrl(path).then((u) => { if (alive) setUri(u); }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [path]);

  const player = useAudioPlayer(uri ? { uri } : null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  if (error) {
    return <Text style={styles.err}>{compact ? 'Ses kaydı açılamadı.' : 'Ses kaydı açılamadı (paylaşım bitmiş ya da kayıt silinmiş olabilir).'}</Text>;
  }

  const total = status.duration > 0 ? status.duration * 1000 : durationMs ?? 0;
  const pos = status.currentTime * 1000;
  const progress = total > 0 ? Math.min(1, pos / total) : 0;
  const toggle = async () => {
    if (!uri) return;
    if (status.playing) return player.pause();
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    player.play();
    track('abc.play');
  };

  const label = status.playing ? 'Ses kaydını duraklat' : 'Ses kaydını dinle';
  if (compact) {
    return (
      <Pressable onPress={toggle} hitSlop={6} disabled={!uri} style={styles.compact} accessibilityRole="button" accessibilityLabel={label}>
        <View style={styles.btnSmall}>
          {uri ? <Ionicons name={status.playing ? 'pause' : 'play'} size={14} color="#fff" /> : <ActivityIndicator color="#fff" size="small" />}
        </View>
        <Text style={styles.time}>Ses · {mmss(status.playing || pos > 0 ? pos : total)}</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.wrap}>
      <Pressable onPress={toggle} hitSlop={8} disabled={!uri} style={styles.btn}
        accessibilityLabel={label}>
        {uri ? <Ionicons name={status.playing ? 'pause' : 'play'} size={18} color="#fff" /> : <ActivityIndicator color="#fff" size="small" />}
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.label}>Ebeveynin sesli kaydı</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
      <Text style={styles.time}>{mmss(status.playing || pos > 0 ? pos : total)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.today, borderRadius: radius.sm, padding: 10, marginTop: 4 },
  btn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '600', color: colors.navy },
  track: { height: 4, borderRadius: 2, backgroundColor: '#C9CFDD' },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.navy },
  time: { fontSize: 12, color: colors.navy, fontVariant: ['tabular-nums'] },
  err: { fontSize: 12, color: colors.muted, marginTop: 4 },
  compact: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.today, borderRadius: radius.pill, paddingVertical: 3, paddingLeft: 3, paddingRight: 10 },
  btnSmall: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
});
