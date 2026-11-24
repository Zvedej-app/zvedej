import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../lib/api';
import { useRequireAccount } from '../../hooks/useRequireAccount';
import { notify } from '../../lib/dialog';
import type { Profile } from '../../lib/types';
import { useSettings } from '../../providers/SettingsProvider';
import { Avatar, Button, ListGroup, ListItem, Row, Sheet, T } from '../ui';

/** Souhlas svěřence s připojením k trenérovi – přesně co trenér uvidí. */
export function ConsentSheet({ coach, onClose, onDone }: { coach: Profile | null; onClose: () => void; onDone: () => void }) {
  const { t } = useSettings();
  const [shareBw, setShareBw] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = coach ? `${coach.firstName} ${coach.lastName}`.trim() : '';

  const needAccount = useRequireAccount();
  const accept = async () => {
    if (!coach) return;
    if (!(await needAccount())) return onClose();
    setBusy(true);
    try {
      await api.acceptCoach(coach.id, shareBw);
      onDone();
    } catch (e) {
      const m = String((e as Error)?.message ?? '');
      notify(
        m.includes('MINOR_CLUB') ? t('coach.minorClub') : m.includes('BLOCKED') ? t('safety.blockedChat') : t('common.error'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={!!coach} onClose={onClose} title={t('coach.joinTitle')}>
      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        <Row gap={12}>
          <Avatar uri={coach?.avatarUrl} name={name} size={48} />
          <View style={{ flex: 1 }}>
            <T v="h3">{name}</T>
            <T v="small" muted>
              {t('coach.wantsToCoach')}
            </T>
          </View>
        </Row>
        <View style={{ gap: 8 }}>
          <T v="label" muted>
            {t('coach.willSee')}
          </T>
          <Item icon="book-outline" text={t('coach.seeLog')} />
          <Item icon="barbell-outline" text={t('coach.seeMaxes')} />
          <Item icon="calendar-outline" text={t('coach.seePlans')} />
          <Item icon="videocam-outline" text={t('coach.seeVideos')} />
        </View>
        <ListGroup>
          <ListItem
            icon="scale-outline"
            title={t('coach.shareBw')}
            subtitle={t('coach.shareBwHint')}
            toggle={shareBw}
            onToggle={setShareBw}
          />
        </ListGroup>
        <T v="caption" muted>
          {t('coach.cancelAnytime')}
        </T>
        <Button icon="checkmark" title={t('coach.accept')} onPress={accept} loading={busy} />
      </View>
    </Sheet>
  );
}

function Item({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  const { colors } = useSettings();
  return (
    <Row gap={10} style={{ alignItems: 'flex-start' }}>
      <Ionicons name={icon} size={18} color={colors.success} style={{ marginTop: 2 }} />
      <T style={{ flex: 1 }}>{text}</T>
    </Row>
  );
}
