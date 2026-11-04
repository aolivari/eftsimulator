import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Baja de cuenta: borra el usuario de Supabase Auth. Sus planes y su perfil
 * se eliminan en cascada (`on delete cascade` en supabase/schema.sql).
 *
 * Seguridad: el usuario se identifica con SU token de sesión, no con un id que
 * llegue en la petición. La clave de servicio nunca sale del servidor.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    res.status(500).json({ error: 'Faltan variables de Supabase en el servidor' });
    return;
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.status(401).json({ error: 'Sesión no válida' });
    return;
  }

  // 1. Quién es el usuario de ese token.
  const who = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!who.ok) {
    res.status(401).json({ error: 'Sesión no válida o caducada' });
    return;
  }
  const user = (await who.json()) as { id?: string };
  if (!user.id) {
    res.status(401).json({ error: 'Sesión no válida' });
    return;
  }

  // 2. Borrado con privilegios de servicio. Cascade elimina planes y perfil.
  const del = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
    method: 'DELETE',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!del.ok) {
    res.status(500).json({ error: 'No se pudo completar la baja. Inténtalo de nuevo.' });
    return;
  }

  res.status(200).json({ ok: true });
}
