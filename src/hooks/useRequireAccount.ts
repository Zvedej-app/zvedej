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
  const { session } = useAuth();
  const { t } = useSettings();
  const guest = !!session?.isAnonymous;
  return useCallback(async () => {
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
  }, [guest, t]);
}
