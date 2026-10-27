import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { IconButton, Notice } from '../../components/ui';
import { LegalDoc, legalDocuments, openLegal, isNotice } from '../../lib/legal';

const dateText = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

// Ayarlar › Yasal metinler (hukuk/50-uygulama-ici-metinler.md 3): legal_documents_for('clinic'); satıra dokununca metin
// tarayıcıda açılır (Edge Function `legal`). Onay isteyenlerde onay tarihi; aydınlatmada "gösterildi".
export default function LegalSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {visible && <Body onClose={onClose} />}
    </Modal>
  );
}

function Body({ onClose }: { onClose: () => void }) {
  const [docs, setDocs] = useState<LegalDoc[] | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => { legalDocuments().then(setDocs).catch(() => setFailed(true)); }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.header}>
          <IconButton name="close" onPress={onClose} label="Kapat" />
          <Text style={styles.title}>Yasal metinler</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
          {failed ? <Notice icon="alert-circle-outline" text="Yasal metinler yüklenemedi. İnternet bağlantını kontrol et." />
            : docs === undefined ? <ActivityIndicator color={colors.navy} style={{ marginTop: 24 }} />
            : docs === null || docs.length === 0 ? <Notice icon="time-outline" text="Yasal metinler henüz yayında değil." />
            : (
              <View style={styles.list}>
                {docs.map((d, i) => (
                  <Pressable key={d.key} onPress={() => openLegal(d.key, d.version)} accessibilityRole="link"
                    style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && { backgroundColor: '#F7F8FA' }]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.docTitle}>{d.title}</Text>
                      <Text style={styles.small}>
                        {d.version}{d.status === 'draft' ? ' · taslak' : ''}
                        {d.accepted_at ? ` · ${isNotice(d.key) ? 'Gösterildi' : 'Onayladın'}: ${dateText(d.accepted_at)}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={18} color={colors.faint} />
                  </Pressable>
                ))}
              </View>
            )}
          <Text style={styles.small}>Metinler tarayıcıda açılır.</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  list: { backgroundColor: '#fff', borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  docTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
});
