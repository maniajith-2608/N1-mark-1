import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { ReactNode } from 'react';
import {
  KeyboardScrollView,
  DetailHeader,
  N1Badge,
  N1Button,
  N1Card,
  N1DetailGrid,
  N1Divider,
  N1Icon,
  N1IconButton,
  N1Tabs,
  N1Text,
  createN1Styles,
  useN1Breakpoint,
  useN1Styles,
  sectionTabLabel,
  useSectionTabsOptions,
  type N1Tab,
} from '../../../shared/components';
import type { OrdersScreenProps } from '../types';
import {
  AdminScreen,
  AdminScreenBackground,
  AsyncContent,
  ComingSoon,
} from '../../../shared/components';
import { COMMON_STRINGS, DETAIL_COLUMNS } from '../../../shared/constants';
import {
  formatCurrency,
  formatLongDate,
  notifyUnavailable,
} from '../../../shared/utils';
import { useCustomers } from '../../customers';
import {
  BILLING_META,
  MetaBadge,
  QUOTATION_META,
  useJobCard,
  type JobCard,
} from '../../jobCards';
import { OrderJobCardItem } from '../components/OrderJobCardItem';
import {
  DocumentViewer,
  type ViewerTarget,
} from '../components/DocumentViewer';
import { printDocument } from '../../../services/files/viewDocument';
import { openStoredFile } from '../../../services/files/fileStorage';
import { printOrNotify } from '../../../services/print';
import type { Attachment } from '../../../shared/types';
import {
  RawMaterialDialog,
  isRawMaterialMissing,
} from '../components/RawMaterialDialog';
import { DocumentList } from '../components/DocumentList';
import { DrawingQrSection } from '../components/DrawingQrSection';
import { OrderStatusBadge, PriorityBadge } from '../components/OrderBadges';
import { RAW_MATERIAL_FIELDS } from '../components/orderForm';
import { MATERIAL_SOURCE_OPTIONS, ORDER_STRINGS } from '../constants';
import { useOrder } from '../hooks/useOrders';
import { documentPrintHtml, drawingPrintHtml, qrPrintHtml } from '../printing';
import { orderHeading, orderQrValue } from '../utils';

const D = ORDER_STRINGS.details;
const F = ORDER_STRINGS.form;
const P = ORDER_STRINGS.print;
const orDash = (v: string) => v || COMMON_STRINGS.dash;
// The drawing's and the order QR's rows in the documents list.
const DRAWING_DOC_ID = 'order-drawing';
const ORDER_QR_DOC_ID = 'order-qr';

type Tab = 'details' | 'material' | 'documents' | 'jobCard';

const TABS: N1Tab<Tab>[] = [
  { key: 'details', label: D.tabs.details, icon: 'file' },
  { key: 'material', label: D.tabs.material, icon: 'package' },
  { key: 'documents', label: D.tabs.documents, icon: 'file' },
  { key: 'jobCard', label: D.tabs.jobCard, icon: 'clipboard' },
];

/** Phones: one swipeable page per tab, like Employee and Customer details. */
const OrderTabs = createMaterialTopTabNavigator<Record<Tab, undefined>>();

const makeStyles = createN1Styles(t => ({
  // Phones: the order above the swipeable tabs, on white.
  compactRoot: { flex: 1, backgroundColor: t.colors.surface },
  compactHero: { padding: t.spacing.lg },
  top: { gap: t.spacing.md },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: t.spacing.xs,
  },
  pressed: { opacity: t.opacity.pressed },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: t.spacing.md,
  },
  title: { flexShrink: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  spacer: { flex: 1 },
  // Wide screens: the card fills the window. Title and tabs stay put; only
  // the tab's content scrolls.
  card: { gap: t.spacing.lg },
  fullCard: { flex: 1, minHeight: 0 },
  scroll: { flex: 1 },
  scrollContent: { gap: t.spacing.xl, paddingBottom: t.spacing.xs },
  compactContent: { gap: t.spacing.xl },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  link: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xxs },
  section: { gap: t.spacing.md },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.md,
  },
  emptyJobCard: {
    alignItems: 'center',
    gap: t.spacing.sm,
    padding: t.spacing.xxl,
    borderRadius: t.radius.md,
    borderWidth: t.borderWidth.hairline,
    borderStyle: 'dashed',
    borderColor: t.colors.border,
  },
}));

/**
 * One work order in a single card: back link, title, badges, Route card and
 * Edit on top, then tabs for the order (customer, then drawing with its QR),
 * raw material, documents (the drawing included) and its job card.
 */
export function OrderDetailsScreen({
  route,
  navigation,
}: OrdersScreenProps<'OrderDetails'>) {
  const styles = useN1Styles(makeStyles);
  const sectionTabsOptions = useSectionTabsOptions();
  const { isCompact } = useN1Breakpoint();
  const { order, status, error, reload } = useOrder(route.params.orderId);
  const { items: customers } = useCustomers();
  const [tab, setTab] = useState<Tab>('details');
  // createOrder opened the order's job card with it.
  const { jobCard } = useJobCard(order?.jobCardId || undefined);

  // Back to where the order was opened from: the customer, job card or
  // invoice it was opened on (keeping that page's own Back), else the
  // orders list.
  const { fromCustomerId, fromJobCardId, fromInvoiceId } = route.params;
  const goBack = useCallback(() => {
    // Pushed on top of another screen in this stack (a job card, or a
    // customer when opened from Customers): back to it.
    const state = navigation.getState();
    const below = state.routes[state.index - 1];
    if (below && below.name !== 'OrdersList') {
      navigation.goBack();
      return;
    }
    if (fromInvoiceId) {
      navigation.navigate('Billing', {
        screen: 'InvoiceDetails',
        params: { invoiceId: fromInvoiceId },
        merge: true,
      });
    } else if (fromJobCardId) {
      navigation.navigate('JobCards', {
        screen: 'JobCardDetails',
        params: { jobCardId: fromJobCardId },
        initial: false,
      });
    } else if (fromCustomerId) {
      navigation.navigate('Customers', {
        screen: 'CustomerDetails',
        params: { customerId: fromCustomerId },
        merge: true,
      });
    } else {
      navigation.popTo('OrdersList');
    }
  }, [navigation, fromCustomerId, fromJobCardId, fromInvoiceId]);
  const backLabel = fromInvoiceId
    ? D.backToInvoice
    : fromJobCardId
    ? D.backToJobCard
    : fromCustomerId
    ? D.backToCustomer
    : D.backToOrders;
  const edit = useCallback(
    () =>
      navigation.navigate('OrderForm', {
        orderId: route.params.orderId,
        from: 'details',
      }),
    [navigation, route.params.orderId],
  );
  // Slides the customer in on this stack (no jump to Customers); Back
  // returns to this order. Opened from that customer already: back to it.
  const openCustomer = useCallback(() => {
    const customerId = order?.customerId;
    if (!customerId) {
      return;
    }
    const state = navigation.getState();
    const below = state.routes[state.index - 1];
    const belowParams = below?.params as { customerId?: string } | undefined;
    if (
      below?.name === 'CustomerDetails' &&
      belowParams?.customerId === customerId
    ) {
      navigation.goBack();
    } else {
      navigation.push('CustomerDetails', { customerId, from: 'order' });
    }
  }, [navigation, order?.customerId]);
  // Pushed on this stack: Back returns to this order. Opened from that job
  // card already (Job Cards stack): back to it.
  const openJobCard = useCallback(
    (card: JobCard) => {
      const state = navigation.getState();
      const below = state.routes[state.index - 1];
      const belowParams = below?.params as { jobCardId?: string } | undefined;
      if (
        below?.name === 'JobCardDetails' &&
        belowParams?.jobCardId === card.id
      ) {
        navigation.goBack();
      } else {
        navigation.push('JobCardDetails', {
          jobCardId: card.id,
          from: 'order',
        });
      }
    },
    [navigation],
  );
  // Raw material still missing: a popup collects it and saves it on the job
  // card (saveJobCardRawMaterial), which RM QC then inspects.
  const [askRawMaterial, setAskRawMaterial] = useState(false);
  const openRawMaterial = useCallback(() => setAskRawMaterial(true), []);
  const closeRawMaterial = useCallback(() => setAskRawMaterial(false), []);
  const printDrawing = useCallback(() => {
    if (order) {
      const html = drawingPrintHtml(order, orDash(order.drawingNumber));
      printOrNotify(html, P.drawingJob(orderHeading(order)), D.printDrawing);
    }
  }, [order]);
  // Stored files open (or download) from a short-lived link.
  const download = useCallback((doc?: Attachment) => {
    if (!doc) {
      notifyUnavailable(D.downloadAction);
      return;
    }
    openStoredFile(doc)
      .then(opened => opened || notifyUnavailable(D.downloadAction))
      .catch(() => notifyUnavailable(D.downloadAction));
  }, []);
  // View / print a document or the drawing. A PDF picked this session on web
  // prints in the browser's own viewer; anything else prints as a page.
  const [viewing, setViewing] = useState<ViewerTarget | null>(null);
  const closeViewer = useCallback(() => setViewing(null), []);
  const viewDocument = useCallback(
    (doc: Attachment) => setViewing({ type: 'document', doc }),
    [],
  );
  const printFile = useCallback(
    (doc: Attachment) => {
      const isPickedFile =
        Platform.OS === 'web' && doc.uri && !doc.uri.startsWith('data:image');
      if (isPickedFile && printDocument(doc)) {
        return;
      }
      if (order) {
        printOrNotify(documentPrintHtml(order, doc), doc.name, D.printAction);
      }
    },
    [order],
  );
  const printQr = useCallback(() => {
    if (order) {
      printOrNotify(
        qrPrintHtml(order),
        D.orderQrFile(order.number),
        D.printAction,
      );
    }
  }, [order]);
  const printTarget = useCallback(
    (target: ViewerTarget) =>
      target.type === 'drawing'
        ? printDrawing()
        : target.type === 'qr'
        ? printQr()
        : printFile(target.doc),
    [printDrawing, printQr, printFile],
  );
  const openFile = download;

  // The drawing row downloads the design file; the QR is drawn here, not
  // stored, so it prints instead.
  const designFile = order?.designFile ?? undefined;
  const downloadDoc = useCallback(
    (doc: Attachment) =>
      download(
        doc.id === DRAWING_DOC_ID
          ? designFile
          : doc.id === ORDER_QR_DOC_ID
          ? undefined
          : doc,
      ),
    [download, designFile],
  );

  const customer = useMemo(
    () => customers.find(c => c.id === order?.customerId),
    [customers, order?.customerId],
  );

  const backLink = (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={backLabel}
      onPress={goBack}
      style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
      testID="order-details-back"
    >
      <N1Icon name="arrow-left" size="sm" color="textSecondary" />
      <N1Text variant="label" color="secondary">
        {backLabel}
      </N1Text>
    </Pressable>
  );

  // Phones: a header with back and the screen's name, in place of the link,
  // and Edit beside it.
  const header = (
    <DetailHeader
      title={D.title}
      onBack={goBack}
      compactRight={
        order && (
          <N1IconButton
            icon="edit"
            variant="tile"
            accessibilityLabel={ORDER_STRINGS.a11y.edit(order.number)}
            onPress={edit}
            testID="edit-order"
          />
        )
      }
    />
  );

  if (!order) {
    return (
      <AdminScreen header={header} testID="order-details-screen">
        {!isCompact && backLink}
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon icon="package" title={D.title} message={D.notFound} />
        </AsyncContent>
      </AdminScreen>
    );
  }

  const rawMaterialButton = jobCard && isRawMaterialMissing(order) && (
    <N1Button
      title={D.addRawMaterial}
      leftIcon="plus"
      variant="secondary"
      size="sm"
      onPress={openRawMaterial}
      testID="order-add-raw-material"
    />
  );

  const top = (
    <View style={styles.top}>
      {!isCompact && backLink}
      <View style={styles.titleRow}>
        <N1Text
          variant={isCompact ? 'h2' : 'h1'}
          accessibilityRole="header"
          style={styles.title}
        >
          {orderHeading(order)}
        </N1Text>
        <View style={styles.badges}>
          <PriorityBadge priority={order.priority} suffix="priority" />
          <OrderStatusBadge status={order.status} />
        </View>
        {/* Phones: Edit is in the header and Add raw material on the Raw
            material tab. */}
        {!isCompact && (
          <>
            <View style={styles.spacer} />
            <View style={styles.actions}>
              {rawMaterialButton}
              <N1Button
                title={D.edit}
                leftIcon="edit"
                size="sm"
                onPress={edit}
                testID="edit-order"
              />
            </View>
          </>
        )}
      </View>
    </View>
  );

  const heading = (text: string) => (
    <N1Text variant="title" weight="bold">
      {text}
    </N1Text>
  );

  const customerSection = (
    <View style={styles.section} testID="order-customer">
      <View style={styles.sectionHead}>
        {heading(D.customer)}
        {customer && (
          <Pressable
            accessibilityRole="link"
            onPress={openCustomer}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            testID="order-view-customer"
          >
            <N1Text variant="small" weight="semiBold">
              {D.viewCustomer}
            </N1Text>
            <N1Icon name="arrow-right" size="sm" />
          </Pressable>
        )}
      </View>
      <N1DetailGrid
        columns={isCompact ? 2 : DETAIL_COLUMNS}
        items={[
          { label: D.customerName, value: orDash(order.customerName) },
          {
            label: D.email,
            value: orDash(order.customerEmail || customer?.email || ''),
          },
          { label: D.mobile, value: orDash(customer?.mobile ?? '') },
        ]}
      />
    </View>
  );

  const drawingNo = orDash(order.drawingNumber);
  // What the order QR holds; the app's scanner imports the order from it.
  const qrValue = orderQrValue(order);
  const viewDrawing = () =>
    setViewing({ type: 'drawing', drawingNumber: drawingNo });
  const drawingSection = (
    <DrawingQrSection
      drawingNumber={drawingNo}
      qrValue={qrValue}
      onViewDrawing={viewDrawing}
      onPrintDrawing={printDrawing}
      testID="order"
    />
  );

  const detailsTab = (
    <>
      {customerSection}
      <N1Divider />
      {drawingSection}
      <N1Divider />
      <View style={styles.section}>
        {heading(D.overview)}
        <N1DetailGrid
          columns={isCompact ? 2 : DETAIL_COLUMNS}
          items={[
            { label: F.poNumber, value: orDash(order.poNumber) },
            {
              label: F.poAmount,
              value:
                order.poAmount == null
                  ? COMMON_STRINGS.dash
                  : formatCurrency(order.poAmount),
            },
            { label: F.partName, value: orDash(order.partName) },
            { label: F.partNumber, value: orDash(order.partNumber) },
            { label: F.drawingNumber, value: orDash(order.drawingNumber) },
            {
              label: D.quantity,
              value: order.quantity
                ? ORDER_STRINGS.quantity(order.quantity)
                : COMMON_STRINGS.dash,
            },
            {
              label: F.deliveryDate,
              value: orDash(formatLongDate(order.dueDate)),
            },
            { label: F.projectId, value: orDash(order.projectId) },
            { label: F.shopOrderNumber, value: orDash(order.shopOrderNumber) },
          ]}
          testID="order-overview"
        />
      </View>
      <N1Divider />
      <View style={styles.section}>
        {heading(D.dispatch)}
        <N1DetailGrid
          columns={isCompact ? 2 : DETAIL_COLUMNS}
          items={[
            { label: F.routeCardNo, value: orDash(order.routeCardNo) },
            { label: F.dcNo, value: orDash(order.dcNo) },
            { label: F.dcDate, value: orDash(formatLongDate(order.dcDate)) },
          ]}
        />
      </View>
      <N1Divider />
      {/* Quotation and billing are tracked on the job card; none yet → dashes. */}
      <View style={styles.section}>
        {heading(D.billingSection)}
        <N1DetailGrid
          columns={isCompact ? 2 : DETAIL_COLUMNS}
          items={[
            {
              label: D.quotation,
              value: jobCard ? (
                <MetaBadge meta={QUOTATION_META[jobCard.quotation]} />
              ) : (
                COMMON_STRINGS.dash
              ),
            },
            {
              label: D.billing,
              value: jobCard ? (
                <MetaBadge meta={BILLING_META[jobCard.billing]} />
              ) : (
                COMMON_STRINGS.dash
              ),
            },
          ]}
          testID="order-billing"
        />
      </View>
      {(order.description !== '' || order.notes !== '') && <N1Divider />}
      {order.description !== '' && (
        <View style={styles.section}>
          {heading(D.description)}
          <N1Text color="secondary">{order.description}</N1Text>
        </View>
      )}
      {order.notes !== '' && (
        <View style={styles.section}>
          {heading(D.notes)}
          <N1Text color="secondary">{order.notes}</N1Text>
        </View>
      )}
    </>
  );

  const arrived = RAW_MATERIAL_FIELDS.every(key => order[key] !== '');
  const source = MATERIAL_SOURCE_OPTIONS.find(
    o => o.value === order.materialSource,
  );
  const materialTab = (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        {heading(D.tabs.material)}
        <N1Badge
          label={arrived ? D.materialArrived : D.materialPending}
          tone={arrived ? 'success' : 'warning'}
          dot
        />
      </View>
      {!arrived && (
        <N1Text variant="small" color="secondary">
          {D.materialPendingHelp}
        </N1Text>
      )}
      {isCompact && rawMaterialButton}
      <N1DetailGrid
        columns={isCompact ? 2 : DETAIL_COLUMNS}
        items={[
          {
            label: F.materialSource,
            value: source?.label ?? COMMON_STRINGS.dash,
          },
          { label: F.rmPartNumber, value: orDash(order.rmPartNumber) },
          { label: F.rawMaterialSize, value: orDash(order.rawMaterialSize) },
          { label: F.heatNumber, value: orDash(order.heatNumber) },
          {
            label: F.rawMaterialGrade,
            value: orDash(order.rawMaterialGrade),
          },
        ]}
        testID="order-raw-material"
      />
    </View>
  );

  // Every file for the order, the drawing included, lives on this tab.
  const drawingDoc: Attachment | null = order.drawingNumber
    ? {
        id: DRAWING_DOC_ID,
        name: D.drawingTitle(order.drawingNumber),
        kind: D.drawing,
        sizeBytes: 0,
      }
    : null;
  const qrDoc: Attachment = {
    id: ORDER_QR_DOC_ID,
    name: D.orderQrFile(order.number),
    kind: D.orderQr,
    sizeBytes: 0,
  };
  const documentsTab = (
    <View style={styles.section}>
      {heading(D.documents)}
      <DocumentList
        documents={[
          ...(drawingDoc ? [drawingDoc] : []),
          qrDoc,
          ...(order.designFile ? [order.designFile] : []),
          ...order.documents,
        ]}
        onDownload={downloadDoc}
        onView={doc =>
          doc.id === DRAWING_DOC_ID
            ? viewDrawing()
            : doc.id === ORDER_QR_DOC_ID
            ? setViewing({ type: 'qr', doc, value: qrValue })
            : viewDocument(doc)
        }
        onPrint={doc =>
          doc.id === DRAWING_DOC_ID
            ? printDrawing()
            : doc.id === ORDER_QR_DOC_ID
            ? printQr()
            : printFile(doc)
        }
      />
    </View>
  );

  const jobCardTab = (
    <View style={styles.section} testID="order-job-cards">
      {heading(D.jobCards)}
      {jobCard ? (
        <OrderJobCardItem jobCard={jobCard} onPress={openJobCard} />
      ) : (
        <View style={styles.emptyJobCard}>
          <N1Icon name="clipboard" size="lg" color="textTertiary" />
          <N1Text weight="semiBold">{D.noJobCard}</N1Text>
          <N1Text variant="small" color="secondary" align="center">
            {D.noJobCardHelp}
          </N1Text>
        </View>
      )}
    </View>
  );

  const tabContent: Record<Tab, ReactNode> = {
    details: detailsTab,
    material: materialTab,
    documents: documentsTab,
    jobCard: jobCardTab,
  };
  const content = tabContent[tab];

  const tabs = (
    <N1Tabs
      tabs={TABS}
      value={tab}
      onChange={setTab}
      variant="underline"
      testID="order-tab"
    />
  );

  const viewer = (
    <DocumentViewer
      target={viewing}
      onClose={closeViewer}
      onPrint={printTarget}
      onDownload={downloadDoc}
      onOpen={openFile}
    />
  );

  const rawMaterialDialog = (
    <RawMaterialDialog
      visible={askRawMaterial}
      order={order}
      jobCardId={order.jobCardId}
      onClose={closeRawMaterial}
      onSaved={closeRawMaterial}
    />
  );

  // Phones: like Employee and Customer details. The header's back and
  // Edit, the order on top, then swipeable tabs over a white page.
  if (isCompact) {
    return (
      <AdminScreenBackground.Provider value="surface">
        <View style={styles.compactRoot} testID="order-details-screen">
          {header}
          <View style={styles.compactHero}>{top}</View>
          <OrderTabs.Navigator
            initialRouteName={tab}
            screenOptions={sectionTabsOptions}
            screenListeners={({ route: page }) => ({
              focus: () => setTab(page.name),
            })}
          >
            {TABS.map(({ key, label }) => (
              <OrderTabs.Screen
                key={key}
                name={key}
                options={{
                  title: label,
                  tabBarAccessibilityLabel: label,
                  tabBarButtonTestID: `order-tab-${key}`,
                  tabBarLabel: sectionTabLabel(label),
                }}
              >
                {() => (
                  <AdminScreen testID={`order-tab-page-${key}`}>
                    <View style={styles.compactContent}>{tabContent[key]}</View>
                  </AdminScreen>
                )}
              </OrderTabs.Screen>
            ))}
          </OrderTabs.Navigator>
          {rawMaterialDialog}
          {viewer}
        </View>
      </AdminScreenBackground.Provider>
    );
  }

  return (
    <AdminScreen header={header} fixed testID="order-details-screen">
      <N1Card padding="xxl" radius="sm" style={[styles.card, styles.fullCard]}>
        {top}
        {tabs}
        {/* A new tab starts at the top. */}
        <KeyboardScrollView
          key={tab}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          testID="order-details-scroll"
        >
          {content}
        </KeyboardScrollView>
      </N1Card>
      {rawMaterialDialog}
      {viewer}
    </AdminScreen>
  );
}
