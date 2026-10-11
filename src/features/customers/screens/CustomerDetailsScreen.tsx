import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useCallback, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  KeyboardScrollView,
  AdminScreen,
  AdminScreenBackground,
  AsyncContent,
  DetailHeader,
  ComingSoon,
  FormRow,
  N1Avatar,
  N1Badge,
  N1Card,
  N1IconButton,
  N1Modal,
  N1Tabs,
  N1TextInput,
  type N1Tab,
  N1Text,
  createN1Styles,
  useN1Breakpoint,
  useN1Styles,
  useSectionTabsOptions,
  sectionTabLabel,
} from '../../../shared/components';
import { PROFILE_PANEL_WIDTH } from '../../../shared/constants';
import { useConfirmDelete } from '../../../shared/hooks';
import { formatCurrency, formatDate } from '../../../shared/utils';
import { useOrganizationName } from '../../profile';
import {
  CustomerOrdersTable,
  CustomerQuotesTable,
} from '../components/CustomerHistoryTables';
import { CustomerProfilePanel } from '../components/CustomerProfilePanel';
import {
  CustomerSectionForm,
  type CustomerSection,
} from '../components/CustomerSectionForm';
import { DeleteCustomerDialog } from '../components/DeleteCustomerDialog';
import { CUSTOMER_STRINGS, CUSTOMER_TYPE_BADGE } from '../constants';
import { useCustomer } from '../hooks/useCustomers';
import type { AdminDrawerParamList } from '../../dashboard/types';
import type {
  Customer,
  CustomerDetailsOrigin,
  CustomersScreenProps,
} from '../types';

const D = CUSTOMER_STRINGS.details;

/** The drawer item each origin returns to. */
const FROM_ROUTE = {
  dashboard: 'Overview',
  orders: 'Orders',
  order: 'Orders',
} as const satisfies Record<CustomerDetailsOrigin, keyof AdminDrawerParamList>;

type Tab = CustomerSection | 'stats' | 'orders' | 'quotes';

const TABS: N1Tab<Tab>[] = [
  { key: 'info', label: D.tabs.info, icon: 'user' },
  { key: 'address', label: D.tabs.address, icon: 'building' },
  { key: 'stats', label: D.tabs.stats, icon: 'dashboard' },
  { key: 'orders', label: D.tabs.orders, icon: 'package' },
  { key: 'quotes', label: D.tabs.quotes, icon: 'receipt' },
  { key: 'notes', label: D.tabs.notes, icon: 'file' },
];

/** Phones: one swipeable page per section. */
const SectionTabs = createMaterialTopTabNavigator<Record<Tab, undefined>>();

const makeStyles = createN1Styles(t => ({
  // Phones: like Employee details, the customer above swipeable tabs.
  compactRoot: { flex: 1, backgroundColor: t.colors.surface },
  compactHero: { padding: t.spacing.lg, gap: t.spacing.sm },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
  },
  identityText: { flex: 1, gap: t.spacing.xxs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  // Wide screens: the card fills the window; the menu and the section each
  // scroll on their own.
  card: { flex: 1, minHeight: 0 },
  row: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: t.spacing.xl,
  },
  nav: {
    width: PROFILE_PANEL_WIDTH,
    paddingRight: t.spacing.xl,
    borderRightWidth: t.borderWidth.hairline,
    borderRightColor: t.colors.border,
  },
  fill: { flex: 1 },
  content: { flex: 1, minWidth: 0 },
  section: { gap: t.spacing.lg },
}));

/**
 * One customer, laid out like User details: who they are and a section menu
 * on the left (Customer info, Address info, Stats, Orders, Quotes, Notes),
 * the section on the right, edited in place. Phones put the menu on top.
 */
export function CustomerDetailsScreen({
  route,
  navigation,
}: CustomersScreenProps<'CustomerDetails'>) {
  const styles = useN1Styles(makeStyles);
  const sectionTabsOptions = useSectionTabsOptions();
  const { isCompact } = useN1Breakpoint();
  const organizationName = useOrganizationName();
  const { customer, status, error, reload, remove, deletingId, deleteError } =
    useCustomer(route.params.customerId);
  const [tab, setTab] = useState<Tab>(
    (route.params.tab as Tab | undefined) ?? 'info',
  );
  const [editing, setEditing] = useState(false);
  // Phones: a section's Edit opens it in a full-screen editor sliding up;
  // the section is kept while it slides away.
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSection, setEditorSection] = useState<CustomerSection>('info');
  const openEditor = useCallback((key: CustomerSection) => {
    setEditorSection(key);
    setEditorOpen(true);
  }, []);
  const closeEditor = useCallback(() => setEditorOpen(false), []);
  const startEdit = useCallback(() => setEditing(true), []);
  const stopEdit = useCallback(() => setEditing(false), []);
  // Leaving a tab drops its unsaved edits.
  const changeTab = useCallback((key: Tab) => {
    setTab(key);
    setEditing(false);
  }, []);
  // Back returns where this page was opened from: the order it was pushed
  // over (Orders stack), the Dashboard or Orders, else the Customers list
  // (also after a refresh or a shared link).
  const { from } = route.params;
  const goBack = useCallback(() => {
    const state = navigation.getState();
    const below = state.routes[state.index - 1];
    if (below && below.name !== 'CustomersList') {
      navigation.goBack();
    } else if (from) {
      navigation.navigate(FROM_ROUTE[from]);
    } else {
      navigation.popTo('CustomersList');
    }
  }, [navigation, from]);

  // Phones: a header with back and the screen's name, in place of the link.
  const deletion = useConfirmDelete<Customer>(
    remove,
    deletingId,
    deleteError,
    goBack,
  );
  const header = (
    <DetailHeader
      title={D.title}
      onBack={goBack}
      // Phones: Delete sits in the header, beside the screen's name.
      compactRight={
        customer && (
          <N1IconButton
            icon="trash"
            variant="tile"
            accessibilityLabel={CUSTOMER_STRINGS.a11y.delete(customer.name)}
            onPress={() => deletion.request(customer)}
            testID="delete-customer"
          />
        )
      }
    />
  );

  if (!customer) {
    return (
      <AdminScreen header={header} testID="customer-details-screen">
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon icon="building" title={D.title} message={D.notFound} />
        </AsyncContent>
      </AdminScreen>
    );
  }

  const heading = (title: string) => <N1Text variant="h3">{title}</N1Text>;
  // Read-only, like the locked fields of the other tabs.
  const readOnly = (label: string, value: string, id: string) => (
    <N1TextInput
      label={label}
      value={value}
      readOnly
      testID={`customer-stats-${id}`}
    />
  );

  const tabContent = (current: Tab = tab) => {
    switch (current) {
      case 'stats':
        return (
          <View style={styles.section} testID="customer-stats">
            {heading(D.tabs.stats)}
            <FormRow>
              {readOnly(
                D.currentProjects,
                CUSTOMER_STRINGS.active(customer.currentProjects),
                'current',
              )}
              {readOnly(
                D.previousProjects,
                CUSTOMER_STRINGS.completed(customer.previousProjects),
                'previous',
              )}
            </FormRow>
            <FormRow>
              {readOnly(
                D.totalRevenue,
                formatCurrency(customer.totalRevenue),
                'revenue',
              )}
              {readOnly(
                D.outstanding,
                formatCurrency(customer.outstandingBalance),
                'outstanding',
              )}
            </FormRow>
          </View>
        );
      case 'orders':
        return (
          <View style={styles.section}>
            {heading(D.tabs.orders)}
            <CustomerOrdersTable customer={customer} />
          </View>
        );
      case 'quotes':
        return (
          <View style={styles.section}>
            {heading(D.tabs.quotes)}
            <CustomerQuotesTable customer={customer} />
          </View>
        );
      default:
        return (
          <CustomerSectionForm
            key={current}
            customer={customer}
            section={current}
            editing={!isCompact && editing}
            onEdit={isCompact ? () => openEditor(current) : startEdit}
            onDone={stopEdit}
          />
        );
    }
  };

  const tabs = (
    <N1Tabs
      tabs={TABS}
      value={tab}
      onChange={changeTab}
      variant="menu"
      testID="customer-tab"
    />
  );

  const profile = (
    <CustomerProfilePanel
      customer={customer}
      backLabel={from ? D.backTo[from] : D.backToCustomers}
      onBack={goBack}
      showBack={!isCompact}
      onDelete={() => deletion.request(customer)}
    >
      {!isCompact && tabs}
    </CustomerProfilePanel>
  );

  const dialog = (
    <DeleteCustomerDialog
      customer={deletion.target}
      organizationName={organizationName}
      loading={deletion.loading}
      onConfirm={deletion.confirm}
      onCancel={deletion.cancel}
    />
  );

  const editorScreen = (title: string, form: ReactNode, footer: ReactNode) => (
    <N1Modal
      visible={editorOpen}
      onClose={closeEditor}
      title={title}
      footer={footer}
      testID="customer-editor"
    >
      {form}
    </N1Modal>
  );

  // Phones: like Employee details. The header's back and Delete, the
  // customer on top, then Material top tabs over a white page; Edit opens
  // the section in a full-screen editor.
  if (isCompact) {
    return (
      <AdminScreenBackground.Provider value="surface">
        <View style={styles.compactRoot} testID="customer-details-screen">
          {header}
          <View style={styles.compactHero} testID="customer-profile">
            <View style={styles.identityRow}>
              <N1Avatar name={customer.name} />
              <View style={styles.identityText}>
                <N1Text variant="title" weight="bold" numberOfLines={1}>
                  {customer.name}
                </N1Text>
                {customer.contactPerson ? (
                  <N1Text variant="caption" color="secondary" numberOfLines={1}>
                    {`${customer.contactPerson} · ${D.contactPersonSuffix}`}
                  </N1Text>
                ) : null}
              </View>
            </View>
            <View style={styles.badges}>
              <N1Badge label={CUSTOMER_TYPE_BADGE[customer.type]} tone="info" />
            </View>
            <N1Text variant="caption" color="tertiary">
              {D.since(formatDate(customer.customerSince))}
            </N1Text>
          </View>
          <SectionTabs.Navigator
            initialRouteName={tab}
            screenOptions={sectionTabsOptions}
            // Leaving a section drops its unsaved edits.
            screenListeners={({ route: page }) => ({
              focus: () => {
                changeTab(page.name);
                // Remembered on the route, so coming back (e.g. from an
                // order) reopens this tab.
                navigation.setParams({ tab: page.name });
              },
            })}
          >
            {TABS.map(({ key, label }) => (
              <SectionTabs.Screen
                key={key}
                name={key}
                options={{
                  title: label,
                  tabBarAccessibilityLabel: label,
                  tabBarButtonTestID: `customer-tab-${key}`,
                  tabBarLabel: sectionTabLabel(label),
                }}
              >
                {() => (
                  <AdminScreen testID={`customer-tab-page-${key}`}>
                    {tabContent(key)}
                  </AdminScreen>
                )}
              </SectionTabs.Screen>
            ))}
          </SectionTabs.Navigator>
          <CustomerSectionForm
            key={`editor-${editorSection}`}
            customer={customer}
            section={editorSection}
            editing={editorOpen}
            onEdit={startEdit}
            onDone={closeEditor}
            layout={({ form, footer }) =>
              editorScreen(CUSTOMER_STRINGS.form.editTitle, form, footer)
            }
          />
          {dialog}
        </View>
      </AdminScreenBackground.Provider>
    );
  }

  return (
    <AdminScreen header={header} fixed testID="customer-details-screen">
      <N1Card radius="sm" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.nav}>
            <KeyboardScrollView style={styles.fill}>
              {profile}
            </KeyboardScrollView>
          </View>
          <KeyboardScrollView style={styles.content}>
            {tabContent()}
          </KeyboardScrollView>
        </View>
      </N1Card>
      {dialog}
    </AdminScreen>
  );
}
