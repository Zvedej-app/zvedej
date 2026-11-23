import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Avatar, Button, Empty, Header, IconButton, ListGroup, ListItem, Loading, Screen } from '../components/ui';
import { api } from '../lib/api';
import { toast } from '../lib/dialog';
import type { Profile } from '../lib/types';
import { useSettings } from '../providers/SettingsProvider';

/** Seznam zablokovaných uživatelů s možností odblokovat. */
export default function BlockedScreen() {
  const { t } = useSettings();
  const [list, setList] = useState<Profile[] | null>(null);

  const load = useCallback(() => {
    api
      .listBlocked()
      .then(setList)
      .catch(() => setList([]));
  }, []);
  useEffect(load, [load]);

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={t('safety.blockedUsers')}
      />
      {list === null ? (
        <Loading />
      ) : list.length === 0 ? (
        <Empty icon="shield-checkmark-outline" text={t('safety.blockedEmpty')} />
      ) : (
        <Screen scroll edges={[]}>
          <ListGroup>
            {list.map((u) => {
              const name = `${u.firstName} ${u.lastName}`.trim();
              return (
                <ListItem
                  key={u.id}
                  left={<Avatar uri={u.avatarUrl} name={name} size={36} />}
                  title={name}
                  right={
                    <Button
                      small
                      kind="secondary"
                      title={t('safety.unblock')}
                      onPress={async () => {
                        await api.unblockUser(u.id).catch(() => {});
                        toast(t('safety.unblocked'));
                        load();
                      }}
                    />
                  }
                />
              );
            })}
          </ListGroup>
        </Screen>
      )}
    </Screen>
  );
}
