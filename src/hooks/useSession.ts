import { useAuth } from '../providers/AuthProvider';

/** id přihlášeného uživatele (nebo null) */
export function useSession() {
  return useAuth().session?.userId ?? null;
}
