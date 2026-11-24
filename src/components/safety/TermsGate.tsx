import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { LEGAL_UPDATED } from '../../data/legal';
import { api } from '../../lib/api';
import { confirm } from '../../lib/dialog';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';

/**
 * Když se změní podmínky nebo zásady (LEGAL_UPDATED), požádá přihlášeného uživatele
 * o nový souhlas. Uživatel si může texty nejdřív přečíst.
 */
export function TermsGate() {
  const { session, profile, refreshProfile } = useAuth();
  const { t } = useSettings();
  const asked = useRef<string | null>(null);

  useEffect(() => {
    if (!session || session.isAnonymous || !profile) return;
    if (profile.termsVersion === LEGAL_UPDATED || asked.current === profile.id) return;
    asked.current = profile.id;
    (async () => {
      const ok = await confirm(t('terms.updated'), {
        ok: t('terms.agree'),
        cancel: t('terms.read'),
        title: t('terms.updatedTitle'),
      });
      if (!ok) {
        // nejdřív si přečte texty; dotaz se zobrazí znovu při dalším spuštění
        router.push('/legal/terms');
        return;
      }
      await api.acceptTerms(LEGAL_UPDATED).catch(() => {});
      refreshProfile();
    })();
  }, [session, profile, refreshProfile, t]);

  return null;
}
