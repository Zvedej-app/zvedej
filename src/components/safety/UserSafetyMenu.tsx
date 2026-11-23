import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { api } from '../../lib/api';
import { confirm, toast } from '../../lib/dialog';
import { useSettings } from '../../providers/SettingsProvider';
import { IconButton, ListGroup, ListItem, Sheet } from '../ui';
import { ReportSheet, type ReportTarget } from './ReportSheet';

/**
 * Tlačítko „⋯“ v hlavičce cizího profilu nebo chatu: nahlásit a zablokovat/odblokovat.
 * onBlockedChange dá vědět obrazovce (např. chat skryje psaní).
 */
export function UserSafetyMenu({
  userId,
  name,
  onBlockedChange,
}: {
  userId: string;
  name: string;
  onBlockedChange?: (blocked: boolean) => void;
}) {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [report, setReport] = useState<ReportTarget | null>(null);

  const refresh = useCallback(() => {
    api
      .isBlockedByMe(userId)
      .then((b) => {
        setBlocked(b);
        onBlockedChange?.(b);
      })
      .catch(() => {});
  }, [userId, onBlockedChange]);
  useEffect(refresh, [refresh]);

  const toggleBlock = async () => {
    setOpen(false);
    if (blocked) {
      await api.unblockUser(userId).catch(() => {});
      toast(t('safety.unblocked'));
    } else {
      const ok = await confirm(t('safety.blockConfirm', { name }), {
        ok: t('safety.block'),
        cancel: t('common.cancel'),
        destructive: true,
      });
      if (!ok) return;
      await api.blockUser(userId).catch(() => {});
      toast(t('safety.blocked'));
    }
    refresh();
  };

  return (
    <View>
      <IconButton name="ellipsis-horizontal" label={t('safety.more')} onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={name}>
        <View style={{ paddingHorizontal: 16 }}>
          <ListGroup>
            <ListItem
              icon="flag-outline"
              title={t('safety.reportUser')}
              onPress={() => {
                setOpen(false);
                setReport({ kind: 'user', userId });
              }}
            />
            <ListItem
              icon={blocked ? 'lock-open-outline' : 'ban-outline'}
              title={blocked ? t('safety.unblock') : t('safety.block')}
              danger={!blocked}
              onPress={toggleBlock}
            />
          </ListGroup>
        </View>
      </Sheet>
      <ReportSheet target={report} onClose={() => setReport(null)} onDone={refresh} />
    </View>
  );
}
