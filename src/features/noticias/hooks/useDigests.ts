import { useEffect, useState } from 'react';
import type { PositionWeight } from '../../../engine/digest';
import { fetchDigests } from '../services/digestService';
import type { Digest, DigestsStatus } from '../types';

interface DigestsState {
  key: string;
  status: DigestsStatus;
  digests: Digest[];
}

export function useDigests(hash: string, composition: PositionWeight[]) {
  const [state, setState] = useState<DigestsState>({ key: '', status: 'loading', digests: [] });
  const [attempt, setAttempt] = useState(0);
  const key = `${hash}#${attempt}`;

  useEffect(() => {
    if (composition.length === 0) return;
    const controller = new AbortController();
    fetchDigests(hash, composition, 30, controller.signal)
      .then((digests) => setState({ key, status: 'ready', digests }))
      .catch((err: unknown) => {
        if ((err as Error).name !== 'AbortError') setState({ key, status: 'error', digests: [] });
      });
    return () => controller.abort();
    // `composition` está determinada por `hash`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, attempt]);

  // Mientras la clave no coincide, la respuesta es de otra composición: seguimos "cargando".
  const current = state.key === key;
  return {
    status: (current ? state.status : 'loading') as DigestsStatus,
    digests: current ? state.digests : [],
    retry: () => setAttempt((a) => a + 1),
  };
}
