import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, Modal, StyleSheet, View } from 'react-native';
import { useBottomInset } from '../lib/insets';
import { subscribeDialogs, type DialogRequest } from '../lib/dialog';
import { radius } from '../lib/theme';
import { useSettings } from '../providers/SettingsProvider';
import { Button, Row, T } from './ui';

/** Vykresluje potvrzovací okna, upozornění a toasty v barvách aplikace. */
export function DialogHost() {
  const { colors } = useSettings();
  const bottom = useBottomInset();
  const [queue, setQueue] = useState<Exclude<DialogRequest, { kind: 'toast' }>[]>([]);
  const [toastMsg, setToastMsg] = useState<{ id: number; message: string } | null>(null);
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(
    () =>
      subscribeDialogs((r) => {
        if (r.kind === 'toast') setToastMsg({ id: r.id, message: r.message });
        else setQueue((q) => [...q, r]);
      }),
    [],
  );

  useEffect(() => {
    if (!toastMsg) return;
    fade.setValue(0);
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start(({ finished }) => finished && setToastMsg((m) => (m?.id === toastMsg.id ? null : m)));
  }, [toastMsg, fade]);

  const cur = queue[0];
  const close = (value: boolean) => {
    if (!cur) return;
    if (cur.kind === 'confirm') cur.resolve(value);
    else cur.resolve();
    setQueue((q) => q.slice(1));
  };

  return (
    <>
      <Modal visible={!!cur} transparent animationType="fade" onRequestClose={() => close(false)} statusBarTranslucent>
        <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            {cur?.kind === 'confirm' && cur.options.title ? <T v="h3">{cur.options.title}</T> : null}
            {cur?.kind === 'notify' && cur.title ? <T v="h3">{cur.title}</T> : null}
            <T style={{ fontSize: 16, lineHeight: 22 }}>{cur?.message}</T>
            {cur?.kind === 'confirm' ? (
              <Row style={{ marginTop: 6 }}>
                <Button kind="secondary" title={cur.options.cancel} style={{ flex: 1 }} onPress={() => close(false)} />
                <Button
                  kind={cur.options.destructive ? 'danger' : 'primary'}
                  title={cur.options.ok}
                  style={{ flex: 1 }}
                  onPress={() => close(true)}
                />
              </Row>
            ) : (
              <Button title="OK" onPress={() => close(true)} style={{ marginTop: 6 }} />
            )}
          </View>
        </View>
      </Modal>

      {toastMsg && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastWrap,
            {
              bottom: bottom + 92,
              opacity: fade,
              transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            },
          ]}
        >
          <View style={[styles.toast, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <T color="#FFF" style={{ fontWeight: '700', flexShrink: 1 }}>
              {toastMsg.message}
            </T>
          </View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.lg + 4,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 12,
    overflow: 'hidden',
  },
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.pill,
    maxWidth: 420,
  },
});
