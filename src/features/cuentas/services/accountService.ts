import { supabase } from '../../../shared/lib';

/**
 * Da de baja la cuenta actual y borra sus planes (en el servidor, vía api/delete-account).
 * Irreversible: quien llama debe pedir confirmación antes.
 */
export async function deleteAccount(accessToken: string): Promise<void> {
  const res = await fetch('/api/delete-account', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'No se pudo dar de baja la cuenta');
  }
  // La cuenta ya no existe; cerramos la sesión local para que el navegador no la siga usando.
  if (supabase) await supabase.auth.signOut({ scope: 'local' });
}
