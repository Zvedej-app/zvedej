import { useEffect } from 'react';
import { api } from '../../lib/api';
import { router } from 'expo-router';
import { confirm, notify } from '../../lib/dialog';
import type { TKey } from '../../lib/i18n';
import { OPERATOR } from '../../data/legal';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';

/**
 * Po přihlášení ukáže nepřečtená oznámení od moderátora (odstraněný obsah,
 * zablokování účtu) i s odůvodněním a možností se ohradit (DSA čl. 17 a 20).
 */
export function ModerationNotices() {
  const { session, refreshProfile } = useAuth();
  const { t } = useSettings();
  const userId = session?.userId;

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const list = await api.listNotices().catch(() => []);
      if (!alive || !list.length) return;
      for (const n of list) {
        const parts = [t(`notice.${n.kind}` as TKey)];
        if (n.reason) parts.push(`${t('notice.reason')}: ${n.reason}`);
        // proti odstranění obsahu nebo zablokování se lze odvolat přímo v aplikaci (DSA čl. 20)
        if (n.kind === 'content_removed' || n.kind === 'banned') {
          parts.push(t('notice.appealInApp', { email: OPERATOR.email }));
          const appeal = await confirm(parts.join('\n\n'), {
            ok: t('appeal.cta'),
            cancel: t('appeal.understood'),
            title: t('notice.title'),
          });
          if (appeal) router.push({ pathname: '/appeal', params: { notice: n.id, reason: n.reason ?? '' } });
        } else await notify(parts.join('\n\n'), t('notice.title'));
      }
      await api.markNoticesSeen().catch(() => {});
      refreshProfile();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}
