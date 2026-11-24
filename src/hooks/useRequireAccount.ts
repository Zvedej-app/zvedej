import { router } from 'expo-router';
import { useCallback } from 'react';
import { confirm } from '../lib/dialog';
import { useAuth } from '../providers/AuthProvider';
import { useSettings } from '../providers/SettingsProvider';

/**
 * Sociální funkce (zprávy, videa, lajky, přátelé, trenér) jsou jen pro účty.
 * Vrátí funkci: u hosta nabídne vytvoření účtu a vrátí false, jinak true.
 */
export function useRequireAccount() {
  const { session, profile } = useAuth();
  const { t } = useSettings();
  const guest = !!session?.isAnonymous;
  const waitingParent = !!profile?.needsParentConsent;
  return useCallback(async () => {
    if (waitingParent) {
      if (await confirm(t('parent.neededForThis'), { ok: t('parent.ask'), cancel: t('common.cancel'), title: t('parent.title') }))
        router.push('/parent-request');
      return false;
    }
    if (!guest) return true;
    if (
      await confirm(t('guest.needAccount'), {
        ok: t('guest.createAccount'),
        cancel: t('common.cancel'),
        title: t('guest.needAccountTitle'),
      })
    )
      router.push('/account');
    return false;
  }, [guest, waitingParent, t]);
}
