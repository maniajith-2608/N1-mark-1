import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { BillingTab } from '../types';

/**
 * Phones: each tab (Invoices / Quotes) puts its search and filter into the
 * Billing screen's header, where its search state can't reach. Kept per
 * tab: both tab pages stay mounted, and the header shows the open one's.
 */
export const BillingHeaderSlot = createContext<
  ((tab: BillingTab, header: ReactNode) => void) | null
>(null);

/** Offers `header` as this tab's header in Billing while mounted. */
export function useBillingHeader(
  tab: BillingTab,
  header: ReactNode,
  enabled: boolean,
) {
  const setHeader = useContext(BillingHeaderSlot);
  useEffect(() => {
    if (!setHeader || !enabled) {
      return undefined;
    }
    setHeader(tab, header);
    return () => setHeader(tab, null);
  }, [setHeader, enabled, tab, header]);
}
