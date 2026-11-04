import { useEffect, useState } from 'react';
import type { ETFAsset, MonthlyReturnHistory } from '../../../types';
import { fetchMonthlyHistory, historyKey } from '../../../shared/lib';

export function useMonthlyHistory(activeEtfs: ETFAsset[]) {
  const key = historyKey(activeEtfs);
  const [history, setHistory] = useState<MonthlyReturnHistory | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (activeEtfs.length === 0) return;
    const ctrl = new AbortController();
    setHistoryLoading(true);
    setHistoryError(null);
    fetchMonthlyHistory(activeEtfs, ctrl.signal)
      .then(setHistory)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setHistoryError(err.message);
        }
      })
      .finally(() => setHistoryLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const historyReady = Boolean(
    history && activeEtfs.every((e) => history.series[e.ticker.toUpperCase()])
  );

  return {
    history,
    historyError,
    historyLoading,
    historyReady,
  };
}
