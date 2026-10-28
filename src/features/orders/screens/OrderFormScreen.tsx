import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  DetailHeader,
  N1Button,
  N1Card,
  N1Combobox,
  N1DatePicker,
  N1DropDown,
  N1Divider,
  N1Icon,
  N1Text,
  N1TextInput,
  N1UploadBox,
  createN1Styles,
  findOptionByLabel,
  useN1Breakpoint,
  useN1Styles,
  type N1DropDownOption,
} from '../../../shared/components';
import type { OrdersScreenProps } from '../types';
import {
  pickDocument,
  pickDocuments,
} from '../../../services/files/pickDocument';
import {
  AdminScreen,
  AdminScreenBackground,
  AsyncContent,
  FormFooter,
  FormRow,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { useForm, useOnSettled } from '../../../shared/hooks';
import { formatFileSize, isBlank } from '../../../shared/utils';
import {
  CustomerFormModal,
  useCustomers,
  type CustomerInput,
} from '../../customers';
import { useOrganizationName } from '../../profile';
import { FieldsScrollView } from '../components/FieldsScrollView';
import { OrderStepper } from '../components/OrderStepper';
import {
  formValuesToOrderInput,
  orderToFormValues,
  REQUIRED_ORDER_FIELDS,
  firstStepWithErrors,
  hasStepErrors,
  validateOrderForm,
  type OrderFormValues,
} from '../components/orderForm';
import { DRAWING_KIND, ORDER_STRINGS, PRIORITY_OPTIONS } from '../constants';
import { useOrder } from '../hooks/useOrders';

const F = ORDER_STRINGS.form;

const STEP_COUNT = F.steps.length;

/** Plain text fields (not files, the customer or priority). */
type OrderTextField = Exclude<
  keyof OrderFormValues,
  'designFiles' | 'purchaseOrder' | 'customerId' | 'priority'
>;

const makeStyles = createN1Styles(t => ({
  // Wide screens: the card fills the window. The title and stepper stay at
  // the top, the buttons at the bottom; only the fields scroll.
  card: { flex: 1, minHeight: 0, gap: t.spacing.xl },
  top: { gap: t.spacing.xl },
  compact: { gap: t.spacing.lg },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: t.spacing.xs,
  },
  pressed: { opacity: t.opacity.pressed },
  section: { gap: t.spacing.lg },
  designFiles: { gap: t.spacing.sm },
  createCustomer: { alignSelf: 'flex-start' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: t.spacing.md,
    paddingTop: t.spacing.lg,
    borderTopWidth: t.borderWidth.hairline,
    borderTopColor: t.colors.border,
  },
}));

export function OrderFormScreen({
  route,
  navigation,
}: OrdersScreenProps<'OrderForm'>) {
  const styles = useN1Styles(makeStyles);
  const { isCompact } = useN1Breakpoint();
  const orderId = route.params?.orderId;
  const {
    order,
    status,
    error,
    reload,
    create,
    update,
    saving,
    saveError,
    clearErrors,
  } = useOrder(orderId);
  const { items: customers } = useCustomers();
  const organizationName = useOrganizationName();
  const isEdit = Boolean(orderId);
  const [step, setStep] = useState(1);
  // The furthest step opened so far; editing can open any step.
  const [reached, setReached] = useState(1);
  const reachable = isEdit ? STEP_COUNT : reached;
  const form = useForm<OrderFormValues>(
    orderToFormValues(order),
    validateOrderForm,
  );
  const { values, errors, bind, setField, reset } = form;

  // Fill the form once the order arrives (deep link / refresh).
  useEffect(() => {
    if (order) {
      reset(orderToFormValues(order));
    }
  }, [order, reset]);

  useEffect(() => {
    clearErrors();
  }, [clearErrors]);

  // Back, Cancel and Save return where the form was opened from: an edit opened
  // from the order's details goes back there, everything else to the list.
  const fromDetails = Boolean(orderId) && route.params?.from === 'details';
  const leave = useCallback(
    () =>
      fromDetails && orderId
        ? navigation.popTo('OrderDetails', { orderId }, { merge: true })
        : navigation.popTo('OrdersList'),
    [navigation, fromDetails, orderId],
  );
  // Every save leaves the form (see `leave`). createOrder opens the order's
  // job card itself.
  useOnSettled(saving, saveError, leave);

  const customerOptions = useMemo<N1DropDownOption<string>[]>(
    () => customers.map(c => ({ value: c.id, label: c.name })),
    [customers],
  );

  // Picking a saved customer fills in their email.
  const pickCustomer = useCallback(
    (id: string, name: string) => {
      setField('customerId', id);
      setField('customerName', name);
      const email = customers.find(c => c.id === id)?.email;
      if (email) {
        setField('customerEmail', email);
      }
    },
    [customers, setField],
  );
  const selectCustomer = useCallback(
    (option: N1DropDownOption<string>) =>
      pickCustomer(option.value, option.label),
    [pickCustomer],
  );
  // Typing a saved customer's exact name counts as picking them; any other
  // name isn't a customer yet: validation asks to create them first (an
  // order is made for a saved customer).
  const typeCustomer = useCallback(
    (text: string) => {
      const match = findOptionByLabel(customerOptions, text);
      if (match) {
        pickCustomer(match.value, text);
      } else {
        setField('customerId', '');
        setField('customerName', text);
      }
    },
    [customerOptions, pickCustomer, setField],
  );

  // Create customer opens Add customer with the typed name and email. The ids
  // known on open tell which customer the save added, so it gets picked.
  const [newCustomer, setNewCustomer] = useState<Partial<CustomerInput>>();
  const [knownIds, setKnownIds] = useState<Set<string>>();
  const openCreateCustomer = useCallback(() => {
    setNewCustomer({
      name: values.customerName.trim(),
      email: values.customerEmail.trim(),
    });
    setKnownIds(new Set(customers.map(c => c.id)));
  }, [values.customerName, values.customerEmail, customers]);
  const closeCreateCustomer = useCallback(() => setNewCustomer(undefined), []);
  useEffect(() => {
    const added = knownIds && customers.find(c => !knownIds.has(c.id));
    if (added) {
      setKnownIds(undefined);
      pickCustomer(added.id, added.name);
    }
  }, [customers, knownIds, pickCustomer]);
  const canCreateCustomer =
    !isEdit && !values.customerId && !isBlank(values.customerName);

  const attachPurchaseOrder = useCallback(async () => {
    const file = await pickDocument(F.poKind, F.poSample, F.poAccept);
    if (file) {
      setField('purchaseOrder', file);
    }
  }, [setField]);
  // Any number of drawings; each prints with the order QR.
  const { designFiles } = values;
  const addDesignFiles = useCallback(async () => {
    const files = await pickDocuments(
      DRAWING_KIND,
      F.designSample,
      F.designAccept,
    );
    if (files.length) {
      setField('designFiles', [...designFiles, ...files]);
    }
  }, [designFiles, setField]);
  const removeDesignFile = useCallback(
    (id: string) =>
      setField(
        'designFiles',
        designFiles.filter(doc => doc.id !== id),
      ),
    [designFiles, setField],
  );

  const show = useCallback((n: number) => {
    setStep(n);
    setReached(r => Math.max(r, n));
  }, []);
  // Moving on checks this step first (and shows its errors); going back
  // never does.
  const goTo = useCallback(
    (n: number) => {
      if (n < step) {
        setStep(n);
      } else if (hasStepErrors(step, values)) {
        form.validate();
      } else {
        show(n);
      }
    },
    [step, values, form, show],
  );
  const next = useCallback(() => goTo(step + 1), [goTo, step]);
  const previous = useCallback(() => setStep(s => s - 1), []);

  const save = useCallback(() => {
    const input = formValuesToOrderInput(values, order);
    if (orderId) {
      update(orderId, input);
    } else {
      create(input);
    }
  }, [values, order, orderId, create, update]);

  const isLast = step === STEP_COUNT;
  const backLinkLabel = fromDetails ? F.backToOrder : F.backToOrders;
  // Phones: the form slides up as a sheet, with the same white header as
  // Edit machine: back, the form's name and what it does.
  const header = (
    <DetailHeader
      sheet
      title={isEdit ? F.editTitle : F.createTitle}
      subtitle={
        isEdit && order ? F.editSubtitle(order.number) : F.createSubtitle
      }
      onBack={leave}
    />
  );
  const busy = saving;
  const submitLabel = isEdit ? F.submitEdit : F.submitCreate;
  const backLabel = step === 1 ? COMMON_STRINGS.cancel : F.back;
  const onBack = step === 1 ? leave : previous;
  // Saving checks every step; a problem opens the first step that has one.
  const submit = () => {
    if (form.validate()) {
      save();
    } else {
      setStep(firstStepWithErrors(values));
    }
  };
  const onNext = isLast ? submit : next;

  if (isEdit && !order) {
    return (
      <AdminScreen header={header} testID="order-form-screen">
        <AsyncContent status={status} error={error} onRetry={reload}>
          <N1Text>{ORDER_STRINGS.details.notFound}</N1Text>
        </AsyncContent>
      </AdminScreen>
    );
  }

  const heading = (text: string) => <N1Text variant="overline">{text}</N1Text>;

  const customerStep = (
    <View style={styles.section} testID="order-form-step-1">
      {heading(F.customerSection)}
      <FormRow>
        <View style={styles.designFiles}>
          {designFiles.map((doc, i) => (
            <N1UploadBox
              key={doc.id}
              label={i === 0 ? F.designFile : undefined}
              required
              hint={F.designHint}
              onPress={addDesignFiles}
              fileName={doc.name}
              fileSize={formatFileSize(doc.sizeBytes)}
              onRemove={() => removeDesignFile(doc.id)}
              testID={`order-form-design-${i}`}
            />
          ))}
          <N1UploadBox
            label={designFiles.length ? undefined : F.designFile}
            required
            hint={
              designFiles.length
                ? F.addDesignFile
                : isCompact
                ? F.designHintCompact
                : F.designHint
            }
            onPress={addDesignFiles}
            errorText={errors.designFiles}
            testID="order-form-design"
          />
        </View>
        <N1UploadBox
          label={F.purchaseOrder}
          hint={isCompact ? F.poHintCompact : F.poHint}
          onPress={attachPurchaseOrder}
          fileName={values.purchaseOrder?.name}
          fileSize={
            values.purchaseOrder
              ? formatFileSize(values.purchaseOrder.sizeBytes)
              : undefined
          }
          onRemove={() => setField('purchaseOrder', null)}
        />
      </FormRow>
      <FormRow>
        {isEdit ? (
          // An order keeps its customer.
          <N1TextInput
            label={F.customer}
            required
            value={values.customerName}
            disabled
            helperText={F.customerLocked}
            testID="order-form-customer"
          />
        ) : (
          <N1Combobox
            label={F.customer}
            required
            placeholder={F.customerPlaceholder}
            leftIcon="search"
            options={customerOptions}
            value={values.customerName}
            onChangeText={typeCustomer}
            onSelect={selectCustomer}
            errorText={errors.customerName}
            testID="order-form-customer"
          />
        )}
        <N1TextInput
          label={F.customerEmail}
          placeholder={F.customerEmailPlaceholder}
          value={values.customerEmail}
          onChangeText={bind('customerEmail')}
          errorText={errors.customerEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          testID="order-form-email"
        />
      </FormRow>
      {canCreateCustomer && (
        <N1Button
          title={F.createCustomer(values.customerName.trim())}
          variant="secondary"
          leftIcon="plus"
          onPress={openCreateCustomer}
          style={styles.createCustomer}
          testID="order-form-create-customer"
        />
      )}
    </View>
  );

  const isRequired = (key: keyof OrderFormValues) =>
    (REQUIRED_ORDER_FIELDS as readonly string[]).includes(key);

  const text = (
    key: OrderTextField,
    label: string,
    placeholder: string,
    extra?: Partial<React.ComponentProps<typeof N1TextInput>>,
  ) => (
    <N1TextInput
      label={label}
      required={isRequired(key)}
      placeholder={placeholder}
      value={values[key]}
      onChangeText={bind(key)}
      errorText={errors[key]}
      {...extra}
    />
  );
  const date = (
    key: 'dcDate' | 'deliveryDate',
    label: string,
    testID: string,
  ) => (
    <N1DatePicker
      label={label}
      required={isRequired(key)}
      placeholder={F.datePlaceholder}
      value={values[key]}
      onChange={bind(key)}
      errorText={errors[key]}
      testID={testID}
    />
  );

  const orderStep = (
    <View style={styles.section} testID="order-form-step-2">
      {heading(F.orderSection)}
      <FormRow>
        {text('partName', F.partName, F.partNamePlaceholder, {
          testID: 'order-form-part-name',
        })}
        {text('drawingNumber', F.drawingNumber, F.drawingNumberPlaceholder, {
          testID: 'order-form-drawing-number',
        })}
      </FormRow>
      <FormRow>
        {date('dcDate', F.dcDate, 'order-form-dc-date')}
        {date('deliveryDate', F.deliveryDate, 'order-form-delivery')}
      </FormRow>
      <FormRow>
        <N1DropDown
          label={F.priority}
          placeholder={F.priorityPlaceholder}
          options={PRIORITY_OPTIONS}
          value={values.priority || null}
          onChange={bind('priority')}
          testID="order-form-priority"
        />
        {text('quantity', F.quantity, F.quantityPlaceholder, {
          keyboardType: 'number-pad',
          testID: 'order-form-quantity',
        })}
      </FormRow>
      <FormRow>
        {text('partNumber', F.partNumber, F.partNumberPlaceholder, {
          testID: 'order-form-part-number',
        })}
        {text('projectId', F.projectId, F.projectIdPlaceholder)}
      </FormRow>
      <FormRow>
        {text('shopOrderNumber', F.shopOrderNumber, F.shopOrderPlaceholder)}
      </FormRow>
      <FormRow>
        {text('poNumber', F.poNumber, F.poNumberPlaceholder, {
          testID: 'order-form-po-number',
        })}
        {text('poAmount', F.poAmount, F.poAmountPlaceholder, {
          keyboardType: 'decimal-pad',
          testID: 'order-form-po-amount',
        })}
      </FormRow>
      {text('dcNo', F.dcNo, F.dcNoPlaceholder, {
        testID: 'order-form-dc-no',
      })}
      {text('description', F.description, F.descriptionPlaceholder, {
        multiline: true,
        testID: 'order-form-description',
      })}
    </View>
  );

  const stepContent = [customerStep, orderStep][step - 1];

  const footer = (
    <View style={styles.footer}>
      <N1Button
        title={backLabel}
        leftIcon={step === 1 ? undefined : 'arrow-left'}
        variant="secondary"
        disabled={saving}
        onPress={onBack}
        testID="order-form-back"
      />
      <N1Button
        title={isLast ? submitLabel : F.next}
        rightIcon={isLast ? undefined : 'arrow-right'}
        loading={isLast && busy}
        onPress={onNext}
        testID={isLast ? 'order-form-submit' : 'order-form-next'}
      />
    </View>
  );

  const compactFooter = (
    <FormFooter
      onCancel={onBack}
      cancelLabel={backLabel}
      submitLabel={isLast ? submitLabel : F.next}
      onSubmit={onNext}
      loading={isLast && busy}
      submitTestID={isLast ? 'order-form-submit' : 'order-form-next'}
    />
  );

  const top = (
    <View style={styles.top}>
      {/* Phones show these in the header instead. */}
      {!isCompact && (
        <>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={backLinkLabel}
            onPress={leave}
            style={({ pressed }) => [
              styles.backLink,
              pressed && styles.pressed,
            ]}
            testID="order-form-back-to-list"
          >
            <N1Icon name="arrow-left" size="sm" color="textSecondary" />
            <N1Text variant="label" color="secondary">
              {backLinkLabel}
            </N1Text>
          </Pressable>
          <N1Text variant="h1" accessibilityRole="header">
            {isEdit ? F.editTitle : F.createTitle}
          </N1Text>
        </>
      )}
      <OrderStepper
        steps={F.steps}
        current={step}
        reachable={reachable}
        onSelect={goTo}
      />
      <N1Divider />
    </View>
  );

  const fields = (
    <>
      {stepContent}
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </>
  );

  const createCustomerModal = (
    <CustomerFormModal
      visible={newCustomer !== undefined}
      initialValues={newCustomer}
      organizationName={organizationName}
      onClose={closeCreateCustomer}
    />
  );

  // Phones: a white sheet like Edit machine; the page scrolls and the
  // buttons sit in the bottom bar.
  if (isCompact) {
    return (
      <AdminScreenBackground.Provider value="surface">
        <AdminScreen
          header={header}
          compactFooter={compactFooter}
          testID="order-form-screen"
        >
          <View style={styles.compact}>
            {top}
            {fields}
          </View>
          {createCustomerModal}
        </AdminScreen>
      </AdminScreenBackground.Provider>
    );
  }

  return (
    <AdminScreen header={header} fixed testID="order-form-screen">
      <N1Card padding="xxl" radius="sm" style={styles.card}>
        {top}
        {/* A new step starts at the top. */}
        <FieldsScrollView key={step} testID="order-form-scroll">
          {fields}
        </FieldsScrollView>
        {footer}
      </N1Card>
      {createCustomerModal}
    </AdminScreen>
  );
}
