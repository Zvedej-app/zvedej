import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { confirm } from '../../lib/dialog';
import type { FriendStatus } from '../../lib/types';
import { useSettings } from '../../providers/SettingsProvider';
import { Button, Row } from '../ui';

/** Tlačítka „Přidat do přátel“ a „Napsat zprávu“ na cizím profilu. */
export function SocialActions({ userId }: { userId: string }) {
  const { t } = useSettings();
  const [status, setStatus] = useState<FriendStatus | null>(null);

  const load = useCallback(() => {
    api.friendStatus(userId).then(setStatus).catch(() => setStatus('none'));
  }, [userId]);
  useEffect(load, [load]);

  if (status === null) return null;
  const run = (p: Promise<unknown>) => p.catch(() => {}).then(load);

  return (
    <Row gap={8} style={{ flexWrap: 'wrap' }}>
      {status === 'none' && <Button small icon="person-add-outline" title={t('soc.addFriend')} style={{ flex: 1 }} onPress={() => run(api.sendFriendRequest(userId))} />}
      {status === 'outgoing' && (
        <Button small kind="secondary" icon="time-outline" title={t('soc.requestSent')} style={{ flex: 1 }} onPress={() => run(api.removeFriend(userId))} />
      )}
      {status === 'incoming' && (
        <>
          <Button small icon="checkmark" title={t('soc.accept')} style={{ flex: 1 }} onPress={() => run(api.respondFriendRequest(userId, true))} />
          <Button small kind="secondary" title={t('soc.decline')} style={{ flex: 1 }} onPress={() => run(api.respondFriendRequest(userId, false))} />
        </>
      )}
      {status === 'friends' && (
        <Button
          small
          kind="secondary"
          icon="people"
          title={t('soc.isFriend')}
          style={{ flex: 1 }}
          onPress={async () => {
            if (await confirm(t('soc.removeFriendQ'), { ok: t('soc.removeFriend'), cancel: t('common.cancel'), destructive: true })) run(api.removeFriend(userId));
          }}
        />
      )}
      <Button small kind="secondary" icon="chatbubble-ellipses-outline" title={t('soc.message')} style={{ flex: 1 }} onPress={() => router.push(`/chat/${userId}`)} />
    </Row>
  );
}
