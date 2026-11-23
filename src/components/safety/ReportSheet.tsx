import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { api } from '../../lib/api';
import { notify } from '../../lib/dialog';
import type { TKey } from '../../lib/i18n';
import { radius } from '../../lib/theme';
import { useSettings } from '../../providers/SettingsProvider';
import { Button, Field, ListGroup, ListItem, Sheet, T } from '../ui';

const REASONS = ['spam', 'abuse', 'sexual', 'fake', 'minor', 'other'] as const;

export type ReportTarget = { kind: 'user'; userId: string } | { kind: 'message'; messageId: string; userId: string };

/**
 * Nahlášení uživatele nebo zprávy: důvod, podrobnosti a volitelně rovnou zablokovat.
 * Po odeslání se zavolá onDone(blocked).
 */
export function ReportSheet({
  target,
  onClose,
  onDone,
}: {
  target: ReportTarget | null;
  onClose: () => void;
  onDone?: (blocked: boolean) => void;
}) {
  const { t, colors } = useSettings();
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setReason(null);
    setDetails('');
    setAlsoBlock(true);
    onClose();
  };

  const send = async () => {
    if (!target || !reason) return;
    setBusy(true);
    const text = [t(`safety.reason.${reason}` as TKey), details.trim()].filter(Boolean).join(' – ').slice(0, 500);
    try {
      if (target.kind === 'message') await api.reportMessage(target.messageId, text);
      else await api.reportUser(target.userId, text);
      if (alsoBlock) await api.blockUser(target.userId);
      close();
      onDone?.(alsoBlock);
      notify(t('safety.reported'));
    } catch {
      notify(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      visible={!!target}
      onClose={close}
      title={target?.kind === 'message' ? t('safety.reportMessage') : t('safety.reportUser')}
    >
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <T v="small" muted>
          {t('safety.reportTitle')}
        </T>
        <View style={{ gap: 6 }}>
          {REASONS.map((r) => {
            const on = reason === r;
            return (
              <Pressable
                key={r}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setReason(r)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 9,
                  paddingHorizontal: 14,
                  borderRadius: radius.md,
                  borderWidth: 1.5,
                  borderColor: on ? colors.primary : colors.border,
                  backgroundColor: on ? colors.primarySoft : colors.surface,
                }}
              >
                <Ionicons
                  name={on ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={on ? colors.primary : colors.textMuted}
                />
                <T style={{ fontWeight: on ? '700' : '500', flex: 1 }}>{t(`safety.reason.${r}` as TKey)}</T>
              </Pressable>
            );
          })}
        </View>
        <Field label={t('safety.details')} value={details} onChangeText={setDetails} maxLength={400} />
        <ListGroup>
          <ListItem icon="ban-outline" title={t('safety.alsoBlock')} toggle={alsoBlock} onToggle={setAlsoBlock} />
        </ListGroup>
        <Button title={t('safety.send')} kind="danger" icon="flag-outline" onPress={send} loading={busy} disabled={!reason} />
      </ScrollView>
    </Sheet>
  );
}
