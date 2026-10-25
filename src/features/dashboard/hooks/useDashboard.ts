import { useCallback, useEffect, useMemo, useState } from 'react';
import { useN1Theme } from '../../../shared/components';
import { errorMessage } from '../../../shared/store';
import type { RequestStatus } from '../../../shared/types';
import { dashboardApi } from '../api/dashboardApi';
import { DASHBOARD_STRINGS } from '../constants';
import type { CustomerRow, DashboardData, DashboardPeriod } from '../types';

const EMPTY: DashboardData = {
  stats: { billed: 0, outstanding: 0, orders: 0 },
  customers: [],
  jobs: [],
  totalJobs: 0,
};

/**
 * Everything the dashboard shows for the period picked in the header, from
 * one dashboard(period) load; picking another period loads that one.
 */
export function useDashboard(period: DashboardPeriod) {
  const palette = useN1Theme().colors.chart;
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setStatus('loading');
    setError(null);
    dashboardApi.get(period).then(
      result => {
        if (current) {
          setData(result);
          setStatus('succeeded');
        }
      },
      (failure: unknown) => {
        if (current) {
          setError(errorMessage(failure, DASHBOARD_STRINGS.loadFailed));
          setStatus('failed');
        }
      },
    );
    // A slower answer for the period left behind is dropped.
    return () => {
      current = false;
    };
  }, [period, attempt]);

  const reload = useCallback(() => setAttempt(n => n + 1), []);

  // Chart colours follow the rows' order (biggest share first).
  const customers = useMemo<CustomerRow[]>(
    () =>
      data.customers.map((c, index) => ({
        ...c,
        color: palette[index % palette.length],
      })),
    [data.customers, palette],
  );

  return {
    status,
    error,
    reload,
    stats: data.stats,
    customers,
    jobs: data.jobs,
    totalJobs: data.totalJobs,
  };
}
