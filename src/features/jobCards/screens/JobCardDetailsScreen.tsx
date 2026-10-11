import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { Pressable, View, type ScrollViewInstance } from 'react-native';
import { StackActions } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import {
  AdminScreen,
  AdminScreenBackground,
  KeyboardScrollView,
  AsyncContent,
  DetailHeader,
  ComingSoon,
  N1BottomBar,
  N1Button,
  N1ConfirmDialog,
  N1Card,
  N1DetailGrid,
  N1Divider,
  N1Icon,
  N1IconButton,
  N1KeyValueList,
  N1Tabs,
  N1Text,
  createN1Styles,
  useN1Breakpoint,
  useN1Styles,
  sectionTabLabel,
  useSectionTabsOptions,
  type N1Tab,
} from '../../../shared/components';
import { useOnSettled, useToggle } from '../../../shared/hooks';
import type { Attachment } from '../../../shared/types';
import { pickDocument } from '../../../services/files/pickDocument';
import { openDocument } from '../../../services/files/viewDocument';
import {
  formatLongDate,
  notify,
  notifyUnavailable,
} from '../../../shared/utils';
import { BILLING_STRINGS, GenerateDispatchModal } from '../../billing';
import { PriorityBadge } from '../../orders/components/OrderBadges';
import { useOrder } from '../../orders/hooks/useOrders';
import { useOptionalEmployeeRole } from '../../profile/context/EmployeeRoleContext';
import {
  AddProcessButton,
  FlowEditor,
  useFlowEditor,
} from '../components/FlowEditor';
import { FlowEditorSheet } from '../components/FlowEditorSheet';
import { JobCardStatusBadge, MetaBadge } from '../components/JobCardBadges';
import { LinkedOrderCard } from '../components/LinkedOrderCard';
import {
  DocumentViewer,
  type ViewerTarget,
} from '../../orders/components/DocumentViewer';
import { DrawingQrSection } from '../../orders/components/DrawingQrSection';
import { printOrNotify } from '../../../services/print';
import { ORDER_STRINGS } from '../../orders/constants';
import { drawingPrintHtml } from '../../orders/printing';
import { orderHeading, orderQrValue } from '../../orders/utils';
import { COMMON_STRINGS } from '../../../shared/constants';
import { QcHistory } from '../components/QcHistory';
import { RouteCard } from '../components/RouteCard';
import { JOB_CARD_STRINGS, MATERIAL_QC_META } from '../constants';
import { useJobCardBack } from '../hooks/useJobCardBack';
import { useJobCard } from '../hooks/useJobCards';
import type {
  JobCard,
  JobCardInput,
  JobCardsScreenProps,
  QcEntry,
} from '../types';
import {
  attachQcReport,
  canCompleteFlow,
  canPauseOrComplete,
  canStart,
  completeFlow,
  jobCardStage,
  redoOperation,
  startBlockedReason,
  jobCardHeading,
  jobProgress,
  materialRejection,
  pauseOperation,
  rejectedMaterialItems,
  startOperation,
} from '../utils';

const S = JOB_CARD_STRINGS;
/** Part, due date, quantity and material QC side by side on wide screens. */
const OVERVIEW_COLUMNS = 4;
const D = S.details;
const I = D.info;
const R = D.report;

type Tab = 'machining' | 'qc' | 'order';

const TABS: N1Tab<Tab>[] = [
  { key: 'machining', label: D.tabs.machining, icon: 'wrench' },
  { key: 'qc', label: D.tabs.qc, icon: 'check-circle' },
  { key: 'order', label: D.tabs.order, icon: 'file' },
];

/** Phones: one swipeable page per tab, like Order and Customer details. */
const JobCardTabs = createMaterialTopTabNavigator<Record<Tab, undefined>>();

const makeStyles = createN1Styles(t => ({
  // Phones: the job card above the swipeable tabs, on white.
  compactRoot: { flex: 1, backgroundColor: t.colors.surface },
  compactHero: { padding: t.spacing.lg },
  top: { gap: t.spacing.lg },
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
  title: { flexShrink: 1, gap: t.spacing.xxs },
  spacer: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  // Machining: the drawing, QR and job facts above the route card.
  machining: { gap: t.spacing.xl },
  overview: { gap: t.spacing.xl },
  // Wide screens: the card fills the window. The header and tabs stay put;
  // only the tab's content scrolls.
  card: { gap: t.spacing.lg },
  fullCard: { flex: 1, minHeight: 0 },
  scroll: { flex: 1 },
  scrollContent: { gap: t.spacing.xl, paddingBottom: t.spacing.xs },
  compactContent: { gap: t.spacing.xl },
  section: { gap: t.spacing.md },
  stickyPane: { flex: 1, minHeight: 0, gap: t.spacing.md },
  sectionHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.md,
  },
}));

/**
 * A tab whose header row (and optional foot) stays put: on wide screens the
 * head (title and its buttons) sits above the scrolling content and the foot
 * below it; on phones the page scrolls as one, so they're first and last.
 */
function StickyHeadPane({
  head,
  foot,
  sticky,
  children,
  testID,
  scrollRef,
}: {
  head: ReactNode;
  /** Pinned below the scrolling content on wide screens; last on phones. */
  foot?: ReactNode;
  sticky: boolean;
  children: ReactNode;
  testID?: string;
  scrollRef?: Ref<ScrollViewInstance>;
}) {
  const styles = useN1Styles(makeStyles);
  if (!sticky) {
    return (
      <View style={styles.section} testID={testID}>
        {head}
        {children}
        {foot}
      </View>
    );
  }
  return (
    <View style={styles.stickyPane} testID={testID}>
      {head}
      <KeyboardScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.section}
        testID={testID && `${testID}-scroll`}
      >
        {children}
      </KeyboardScrollView>
      {foot}
    </View>
  );
}

/**
 * Create / Edit flow in place of the route card: title with Cancel and Save
 * on top, then the steps.
 */
function InlineFlowEditor({
  jobCard,
  saving,
  saveError,
  onCancel,
  onSave,
  sticky,
}: {
  jobCard: JobCard;
  saving: boolean;
  saveError: string | null;
  onCancel: () => void;
  onSave: (input: JobCardInput) => void;
  /** Keep the title, Cancel and Save on top while the steps scroll. */
  sticky: boolean;
}) {
  const styles = useN1Styles(makeStyles);
  const editor = useFlowEditor(jobCard);
  const editing = jobCard.operations.length > 0;
  // A step added with the pinned Add process scrolls into view.
  const scrollRef = useRef<ScrollViewInstance>(null);
  const stepCount = useRef(editor.steps.length);
  useEffect(() => {
    if (editor.steps.length > stepCount.current) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
    stepCount.current = editor.steps.length;
  }, [editor.steps.length]);
  const save = () => {
    const input = editor.submit();
    if (input) {
      onSave(input);
    }
  };
  return (
    <StickyHeadPane
      sticky={sticky}
      testID="job-card-machining"
      foot={<AddProcessButton onPress={editor.add} />}
      scrollRef={scrollRef}
      head={
        <View style={styles.sectionHead}>
          <N1Text variant="title" weight="bold">
            {editing ? S.flow.editTitle : S.flow.createTitle}
          </N1Text>
          <View style={styles.actions}>
            <N1Button
              title={COMMON_STRINGS.cancel}
              variant="secondary"
              size="sm"
              onPress={onCancel}
              disabled={saving}
              testID="flow-cancel"
            />
            <N1Button
              title={editing ? S.flow.save : S.flow.create}
              leftIcon="check"
              size="sm"
              onPress={save}
              loading={saving}
              testID="flow-submit"
            />
          </View>
        </View>
      }
    >
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
      <FlowEditor editor={editor} editing={editing} showAdd={false} />
    </StickyHeadPane>
  );
}

/**
 * One job card in a single card: back link, title, status, Print and
 * Dispatch on top; then tabs for machining (route card and operation
 * controls), QC (material QC and QC history) and the order's details.
 */
export function JobCardDetailsScreen({
  route,
  navigation,
}: JobCardsScreenProps<'JobCardDetails'>) {
  const styles = useN1Styles(makeStyles);
  const sectionTabsOptions = useSectionTabsOptions();
  const { isCompact } = useN1Breakpoint();
  const { jobCardId } = route.params;
  const { jobCard, status, error, reload, update, saving, saveError } =
    useJobCard(jobCardId);
  // The work order behind the card (same id), shown as a card that opens it.
  const { order } = useOrder(jobCardId);
  const [tab, setTab] = useState<Tab>('machining');

  const back = useJobCardBack({ route, navigation });
  // Create / Edit flow happens here on the Machining tab, not on a screen of
  // its own. Opened with `editFlow` (from the lists), it starts open.
  const [editingFlow, setEditingFlow] = useState(
    Boolean(route.params.editFlow),
  );
  const openFlow = useCallback(() => {
    setTab('machining');
    setEditingFlow(true);
  }, []);
  const closeFlow = useCallback(() => {
    setEditingFlow(false);
    navigation.setParams({ editFlow: undefined });
  }, [navigation]);
  const savingFlow = useRef(false);
  const saveFlow = useCallback(
    (input: JobCardInput) => {
      savingFlow.current = true;
      update(jobCardId, input);
    },
    [update, jobCardId],
  );
  useOnSettled(saving, saveError, () => {
    if (savingFlow.current) {
      savingFlow.current = false;
      closeFlow();
    }
  });
  const [dispatchOpen, openDispatch, closeDispatch] = useToggle(false);
  const [completeOpen, openComplete, closeComplete] = useToggle(false);
  // Admin: open the invoice in Billing. Shop-floor roles have no Billing
  // screen, so they're told it was created.
  const showInvoice = useCallback(
    (invoiceId: string, fillRates: boolean) => {
      closeDispatch();
      const drawer = navigation.getParent();
      if (drawer?.getState()?.routeNames.includes('Billing')) {
        navigation.navigate('Billing', {
          screen: 'InvoiceDetails',
          // Back on the invoice returns to this job card; rates still to
          // fill in open it in edit mode.
          params: { invoiceId, fromJobCardId: jobCardId, edit: fillRates },
          initial: false,
        });
      } else {
        notify(
          BILLING_STRINGS.dispatch.created,
          BILLING_STRINGS.dispatch.createdMessage(invoiceId),
        );
      }
    },
    [closeDispatch, navigation, jobCardId],
  );
  // The drawing thumbnail opens full size and prints with the order's QR;
  // downloading files isn't available yet.
  const [viewing, setViewing] = useState<ViewerTarget | null>(null);
  const closeViewer = useCallback(() => setViewing(null), []);
  const printDrawing = useCallback(() => {
    if (!order) {
      notifyUnavailable(ORDER_STRINGS.details.printDrawing);
      return;
    }
    printOrNotify(
      drawingPrintHtml(order, order.drawingNumber || D.noDrawing),
      ORDER_STRINGS.print.drawingJob(orderHeading(order)),
      ORDER_STRINGS.details.printDrawing,
    );
  }, [order]);
  const download = useCallback(
    () => notifyUnavailable(ORDER_STRINGS.details.downloadAction),
    [],
  );
  // Admin: the order slides in on this stack (Job Cards, Orders, Customers)
  // and its Back returns here; opened from that order already, it goes back
  // to it. A stack without Order details (Dashboard, Users) opens it in
  // Orders. Shop-floor roles have neither, so the card is just shown.
  const stackHasOrder = navigation
    .getState()
    .routeNames.includes('OrderDetails');
  const canOpenOrder =
    stackHasOrder ||
    Boolean(navigation.getParent()?.getState()?.routeNames.includes('Orders'));
  const openOrder = useCallback(() => {
    const state = navigation.getState();
    const below = state.routes[state.index - 1];
    const belowParams = below?.params as { orderId?: string } | undefined;
    if (below?.name === 'OrderDetails' && belowParams?.orderId === jobCardId) {
      navigation.goBack();
    } else if (state.routeNames.includes('OrderDetails')) {
      navigation.push('OrderDetails', {
        orderId: jobCardId,
        fromJobCardId: jobCardId,
      });
    } else {
      navigation.navigate('Orders', {
        screen: 'OrderDetails',
        params: { orderId: jobCardId, fromJobCardId: jobCardId },
        initial: false,
      });
    }
  }, [navigation, jobCardId]);
  // QC reports: pick a file for a check, or open one (web opens files picked
  // this session; the rest explain it isn't available yet).
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const uploadReport = useCallback(
    async (entry: QcEntry) => {
      if (!jobCard) {
        return;
      }
      setUploadingId(entry.id);
      try {
        const file = await pickDocument(R.kind, R.sample, R.accept);
        if (file) {
          update(jobCard.id, attachQcReport(jobCard, entry.id, file));
        }
      } finally {
        setUploadingId(null);
      }
    },
    [jobCard, update],
  );
  const openReport = useCallback((report: Attachment) => {
    if (!openDocument(report)) {
      notifyUnavailable(R.open);
    }
  }, []);
  // Supervisor only: enter the replacement material so RM QC checks it again.
  // RawMaterial lives in the role's stack, not the admin Job Cards stack.
  const canReinitiate = useOptionalEmployeeRole() === 'supervisor';
  const reinitiate = useCallback(
    () =>
      navigation.dispatch(
        StackActions.push('RawMaterial', { orderId: jobCardId, retest: true }),
      ),
    [navigation, jobCardId],
  );

  const backLink = (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={back.label}
      onPress={back.goBack}
      style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
      testID="job-card-details-back"
    >
      <N1Icon name="arrow-left" size="sm" color="textSecondary" />
      <N1Text variant="label" color="secondary">
        {back.label}
      </N1Text>
    </Pressable>
  );

  // Phones: a header with back and the screen's name, in place of the link,
  // and Generate Dispatch beside it.
  const header = (
    <DetailHeader
      title={D.title}
      onBack={back.goBack}
      compactRight={
        jobCard && (
          <N1IconButton
            icon="package"
            variant="tile"
            accessibilityLabel={D.dispatch}
            onPress={openDispatch}
            testID="generate-dispatch"
          />
        )
      }
    />
  );

  if (!jobCard) {
    return (
      <AdminScreen header={header} testID="job-card-details-screen">
        {!isCompact && backLink}
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon icon="clipboard" title={D.title} message={D.notFound} />
        </AsyncContent>
      </AdminScreen>
    );
  }

  const now = () => new Date().toISOString();
  const start = () => update(jobCard.id, startOperation(jobCard, now()));
  const pause = () => update(jobCard.id, pauseOperation(jobCard));
  // Complete finishes the whole flow, not just the running step.
  const complete = () => {
    closeComplete();
    update(jobCard.id, completeFlow(jobCard, now()));
  };
  const remainingSteps = jobCard.operations.filter(
    op => op.status !== 'completed',
  ).length;
  const running = canPauseOrComplete(jobCard);
  const hasFlow = jobCard.operations.length > 0;
  // The next step waits for RM QC and for the last step's QC to pass.
  const blocked = running ? undefined : startBlockedReason(jobCard);
  // A step that failed its QC is sent back to be done again.
  const stage = jobCardStage(jobCard);
  const failedStep =
    stage.key === 'operation_qc' && stage.failed ? stage.operation : null;
  const redo = () =>
    failedStep &&
    update(jobCard.id, redoOperation(jobCard, failedStep.id, now()));

  const heading = (text: string) => (
    <N1Text variant="title" weight="bold">
      {text}
    </N1Text>
  );

  // Start / Pause / Complete: small, above the route card on wide screens;
  // on phones the sticky bottom bar shows large Start or Pause, and Complete.
  const startButton = (
    <N1Button
      key="start"
      title={isCompact ? D.startShort : D.start}
      leftIcon="play"
      size={isCompact ? 'lg' : 'sm'}
      fullWidth={isCompact}
      onPress={start}
      disabled={saving || !canStart(jobCard)}
      accessibilityLabel={D.start}
      testID="start-operation"
    />
  );
  const pauseButton = (
    <N1Button
      key="pause"
      title={D.pause}
      leftIcon="pause"
      variant="secondary"
      size={isCompact ? 'lg' : 'sm'}
      fullWidth={isCompact}
      onPress={pause}
      disabled={saving || !running}
      testID="pause-operation"
    />
  );
  const completeButton = (
    <N1Button
      key="complete"
      title={D.complete}
      leftIcon="check-circle"
      variant="secondary"
      size={isCompact ? 'lg' : 'sm'}
      fullWidth={isCompact}
      onPress={openComplete}
      disabled={saving || !canCompleteFlow(jobCard)}
      testID="complete-operation"
    />
  );
  const operationButtons = [startButton, pauseButton, completeButton];

  const top = (
    <View style={styles.top}>
      {!isCompact && backLink}
      <View style={styles.titleRow}>
        <View style={styles.title}>
          <N1Text variant={isCompact ? 'h2' : 'h1'} accessibilityRole="header">
            {jobCardHeading(jobCard)}
          </N1Text>
          <N1Text variant="small" color="secondary" testID="job-card-wo">
            {S.workOrder(jobCard.id)}
          </N1Text>
        </View>
        <View style={styles.badges}>
          <PriorityBadge priority={jobCard.priority} suffix="priority" />
          <JobCardStatusBadge jobCard={jobCard} />
        </View>
        {/* Phones: Generate Dispatch is in the header. */}
        {!isCompact && (
          <>
            <View style={styles.spacer} />
            <View style={styles.actions}>
              <N1Button
                title={D.dispatch}
                leftIcon="package"
                size="sm"
                onPress={openDispatch}
                testID="generate-dispatch"
              />
            </View>
          </>
        )}
      </View>
    </View>
  );

  const drawingNumber =
    order?.drawingNumber || jobCard.designFile?.name || D.noDrawing;
  // Above the route card: the drawing and Order QR, then part, due date,
  // quantity and material QC in one row (the QR lines up with material QC).
  const overview = (
    <View style={styles.overview} testID="job-card-overview">
      <DrawingQrSection
        drawingNumber={drawingNumber}
        hasDrawing={Boolean(jobCard.designFile)}
        qrValue={
          order ? orderQrValue(order) : ORDER_STRINGS.workOrder(jobCard.id)
        }
        onViewDrawing={() => setViewing({ type: 'drawing', drawingNumber })}
        onPrintDrawing={printDrawing}
        columns={OVERVIEW_COLUMNS}
        testID="job-card"
      />
      <N1DetailGrid
        columns={isCompact ? 2 : OVERVIEW_COLUMNS}
        items={[
          { label: I.part, value: jobCard.partName },
          { label: I.due, value: formatLongDate(jobCard.dueDate) },
          { label: I.qty, value: S.quantity(jobCard.quantity) },
          {
            label: I.materialQc,
            value: <MetaBadge meta={MATERIAL_QC_META[jobCard.materialQc]} />,
          },
        ]}
        testID="job-card-facts"
      />
    </View>
  );

  // Only the order lives here; the job's details are on Machining.
  const orderTab = (
    <View style={styles.section} testID="job-card-order-tab">
      {heading(D.orderSection)}
      {order ? (
        <LinkedOrderCard
          order={order}
          onPress={canOpenOrder ? openOrder : undefined}
        />
      ) : (
        <N1Text color="secondary">{ORDER_STRINGS.details.notFound}</N1Text>
      )}
    </View>
  );

  // Phones: the flow editor slides up as a sheet over this page instead.
  const machiningTab =
    editingFlow && !isCompact ? (
      <InlineFlowEditor
        jobCard={jobCard}
        saving={saving}
        saveError={saveError}
        onCancel={closeFlow}
        onSave={saveFlow}
        sticky={!isCompact}
      />
    ) : (
      // The whole tab scrolls as one: drawing, QR and facts, then the route card.
      <View style={styles.machining}>
        {overview}
        <N1Divider />
        <StickyHeadPane
          sticky={false}
          testID="job-card-machining"
          head={
            <View style={styles.sectionHead}>
              {heading(D.routeCard)}
              <N1Button
                title={
                  hasFlow
                    ? isCompact
                      ? D.editFlowShort
                      : D.editFlow
                    : D.createFlow
                }
                leftIcon={hasFlow ? 'edit' : 'plus'}
                variant="secondary"
                size="sm"
                onPress={openFlow}
                testID="open-flow"
              />
            </View>
          }
        >
          {/* Phones: Start, Pause and Complete sit in the sticky bottom
              bar. */}
          {hasFlow && (!isCompact || failedStep) && (
            <View style={styles.actions}>
              {!isCompact && operationButtons}
              {failedStep && (
                <N1Button
                  title={S.stages.redo(failedStep.name)}
                  leftIcon="refresh"
                  variant="danger"
                  size="sm"
                  onPress={redo}
                  disabled={saving}
                  testID="redo-operation"
                />
              )}
            </View>
          )}
          {hasFlow && blocked && !failedStep && (
            <N1Text variant="small" color="secondary" testID="start-blocked">
              {blocked}
            </N1Text>
          )}
          <RouteCard
            operations={jobCard.operations}
            progress={jobProgress(jobCard)}
          />
        </StickyHeadPane>
      </View>
    );

  const rejection = materialRejection(jobCard);
  const qcTab = (
    <>
      <View style={styles.section} testID="job-card-material-qc">
        <View style={styles.sectionHead}>
          {heading(D.materialQc)}
          <MetaBadge meta={MATERIAL_QC_META[jobCard.materialQc]} />
        </View>
        {jobCard.materialQc === 'rejected' && rejection?.rejectedMaterial && (
          <N1KeyValueList
            title={D.rejectedMaterial}
            items={[
              ...rejectedMaterialItems(rejection.rejectedMaterial),
              { label: D.reason, value: rejection.remark },
            ]}
            testID="rejected-material"
          />
        )}
        {jobCard.materialQc === 'rejected' && canReinitiate && (
          <View style={styles.actions}>
            <N1Button
              title={D.reinitiate}
              leftIcon="refresh"
              onPress={reinitiate}
              testID="reinitiate-rm-qc"
            />
          </View>
        )}
      </View>
      <N1Divider />
      <View style={styles.section}>
        {heading(D.qcHistory)}
        <QcHistory
          entries={jobCard.qcHistory}
          onUpload={uploadReport}
          onOpenReport={openReport}
          uploadingId={uploadingId}
        />
      </View>
    </>
  );

  const tabContent: Record<Tab, ReactNode> = {
    order: orderTab,
    machining: machiningTab,
    qc: qcTab,
  };
  const content = tabContent[tab];

  const tabs = (
    <N1Tabs
      tabs={TABS}
      value={tab}
      onChange={setTab}
      variant="underline"
      testID="job-card-tab"
    />
  );

  const dispatchModal = (
    <GenerateDispatchModal
      visible={dispatchOpen}
      jobCard={jobCard}
      onClose={closeDispatch}
      onInvoice={showInvoice}
    />
  );

  const completeDialog = (
    <N1ConfirmDialog
      visible={completeOpen}
      title={D.completeFlow.title}
      message={D.completeFlow.message(remainingSteps)}
      confirmLabel={D.completeFlow.confirm}
      icon="check-circle"
      onConfirm={complete}
      onCancel={closeComplete}
      testID="complete-flow-dialog"
    />
  );

  const viewer = (
    <DocumentViewer
      target={viewing}
      onClose={closeViewer}
      onPrint={printDrawing}
      onDownload={download}
      onOpen={null}
    />
  );

  // Phones: like Order and Customer details. The header's back and
  // Generate Dispatch, the job card on top, swipeable tabs over a white
  // page, and Start / Pause / Complete pinned to the bottom. Create / Edit
  // flow slides up over it.
  if (isCompact) {
    return (
      <AdminScreenBackground.Provider value="surface">
        <View style={styles.compactRoot} testID="job-card-details-screen">
          {header}
          <View style={styles.compactHero}>{top}</View>
          <JobCardTabs.Navigator
            initialRouteName={tab}
            screenOptions={sectionTabsOptions}
            screenListeners={({ route: page }) => ({
              focus: () => setTab(page.name),
            })}
          >
            {TABS.map(({ key, label }) => (
              <JobCardTabs.Screen
                key={key}
                name={key}
                options={{
                  title: label,
                  tabBarAccessibilityLabel: label,
                  tabBarButtonTestID: `job-card-tab-${key}`,
                  tabBarLabel: sectionTabLabel(label),
                }}
              >
                {() => (
                  <AdminScreen testID={`job-card-tab-page-${key}`}>
                    <View style={styles.compactContent}>{tabContent[key]}</View>
                  </AdminScreen>
                )}
              </JobCardTabs.Screen>
            ))}
          </JobCardTabs.Navigator>
          {/* Two buttons: Start (Pause while a step runs) and Complete. */}
          {hasFlow && (
            <N1BottomBar testID="job-card-operation-bar">
              {running ? pauseButton : startButton}
              {completeButton}
            </N1BottomBar>
          )}
        </View>
        <FlowEditorSheet
          visible={editingFlow}
          jobCard={jobCard}
          drawingNumber={drawingNumber}
          onClose={closeFlow}
        />
        {dispatchModal}
        {completeDialog}
        {viewer}
      </AdminScreenBackground.Provider>
    );
  }

  return (
    <AdminScreen header={header} fixed testID="job-card-details-screen">
      <N1Card padding="xxl" radius="sm" style={[styles.card, styles.fullCard]}>
        {top}
        {tabs}
        {/* A new tab starts at the top. The flow editor keeps its header
            row on top and scrolls its own steps. */}
        {tab === 'machining' && editingFlow ? (
          <View key={tab} style={styles.scroll}>
            {content}
          </View>
        ) : (
          <KeyboardScrollView
            key={tab}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            testID="job-card-details-scroll"
          >
            {content}
          </KeyboardScrollView>
        )}
      </N1Card>
      {dispatchModal}
      {completeDialog}
      {viewer}
    </AdminScreen>
  );
}
