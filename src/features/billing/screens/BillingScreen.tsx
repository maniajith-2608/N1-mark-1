import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  AdminScreen,
  N1Tabs,
  createN1Styles,
  sectionTabLabel,
  useN1Breakpoint,
  useN1Styles,
  useSectionTabsOptions,
} from '../../../shared/components';
import { useTopBarAction } from '../../dashboard/hooks/useTopBarAction';
import { BillingHeaderSlot } from '../components/BillingHeaderSlot';
import { InvoicesTab } from '../components/InvoicesTab';
import { QuotesTab } from '../components/QuotesTab';
import { BILLING_STRINGS, BILLING_TABS } from '../constants';
import type { BillingScreenProps, BillingTab } from '../types';

/** Phones: Invoices and Quotes as swipeable pages. */
const BillingTabs =
  createMaterialTopTabNavigator<Record<BillingTab, undefined>>();

const makeStyles = createN1Styles(t => ({
  compactRoot: { flex: 1, backgroundColor: t.colors.background },
}));

const TAB_CONTENT: Record<BillingTab, () => ReactNode> = {
  invoices: () => <InvoicesTab />,
  quotes: () => <QuotesTab />,
};

export function BillingScreen({
  route,
  navigation,
}: BillingScreenProps<'BillingHome'>) {
  const styles = useN1Styles(makeStyles);
  const sectionTabsOptions = useSectionTabsOptions();
  // The detail screens' tab bar; with two tabs, each takes half the width.
  const tabOptions = useMemo(
    () => ({
      ...sectionTabsOptions,
      tabBarScrollEnabled: false,
      tabBarItemStyle: undefined,
    }),
    [sectionTabsOptions],
  );
  const { isCompact } = useN1Breakpoint();
  // The tab lives in the route so Back from a quote returns to the Quotes tab.
  const tab: BillingTab = route.params?.tab ?? 'invoices';
  const setTab = useCallback(
    (next: BillingTab) => navigation.setParams({ tab: next }),
    [navigation],
  );
  // Phones: on Quotes, Create quote is the top bar's +, in place of the
  // user's initials. Set here: the top bar belongs to the drawer above this
  // screen, not to the tab pages.
  const createQuote = useCallback(
    () => navigation.navigate('QuoteForm'),
    [navigation],
  );
  const topBarAction = useMemo(
    () =>
      isCompact && tab === 'quotes'
        ? {
            icon: 'plus' as const,
            label: BILLING_STRINGS.quotes.createA11y,
            onPress: createQuote,
            testID: 'create-quote',
          }
        : undefined,
    [isCompact, tab, createQuote],
  );
  useTopBarAction(topBarAction);
  // Phones: each tab's search bar, the open one shown on the black header.
  const [searchBars, setSearchBars] = useState<
    Partial<Record<BillingTab, ReactNode>>
  >({});
  const setSearchBar = useCallback(
    (key: BillingTab, bar: ReactNode) =>
      setSearchBars(prev => ({ ...prev, [key]: bar })),
    [],
  );

  // Phones: the open tab's search on the black header, then Invoices /
  // Quotes as the detail screens' tab bar, over swipeable pages.
  if (isCompact) {
    return (
      <BillingHeaderSlot.Provider value={setSearchBar}>
        <View style={styles.compactRoot} testID="billing-screen">
          {searchBars[tab]}
          <BillingTabs.Navigator
            initialRouteName={tab}
            screenOptions={tabOptions}
            screenListeners={({ route: page }) => ({
              focus: () => setTab(page.name),
            })}
          >
            {BILLING_TABS.map(({ key, label }) => (
              <BillingTabs.Screen
                key={key}
                name={key}
                options={{
                  title: label,
                  tabBarAccessibilityLabel: label,
                  tabBarButtonTestID: `billing-tabs-${key}`,
                  tabBarLabel: sectionTabLabel(label),
                }}
              >
                {() => (
                  <AdminScreen testID={`billing-tab-page-${key}`}>
                    {TAB_CONTENT[key]()}
                  </AdminScreen>
                )}
              </BillingTabs.Screen>
            ))}
          </BillingTabs.Navigator>
        </View>
      </BillingHeaderSlot.Provider>
    );
  }

  // Wide screens: the tabs sit in the table's toolbar, where the title
  // would be.
  const tabs = <N1Tabs tabs={BILLING_TABS} value={tab} onChange={setTab} />;
  return (
    <AdminScreen testID="billing-screen" fixed>
      {tab === 'invoices' ? (
        <InvoicesTab toolbarStart={tabs} />
      ) : (
        <QuotesTab toolbarStart={tabs} />
      )}
    </AdminScreen>
  );
}
