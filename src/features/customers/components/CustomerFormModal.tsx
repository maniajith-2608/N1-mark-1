import { useCallback, useEffect } from 'react';
import {
  N1DropDown,
  N1Modal,
  N1RadioGroup,
  N1Text,
  N1TextInput,
} from '../../../shared/components';
import { FormFooter, FormRow } from '../../../shared/components';
import { COMMON_STRINGS, COUNTRY_OPTIONS } from '../../../shared/constants';
import {
  useForm,
  useHeldWhileVisible,
  useOnSettled,
  type FormErrors,
} from '../../../shared/hooks';
import { isBlank, isEmail, isPhone, isPinCode } from '../../../shared/utils';
import {
  CUSTOMER_STRINGS,
  CUSTOMER_TYPE_OPTIONS,
  DEFAULT_COUNTRY,
  DEFAULT_STATE,
  STATE_OPTIONS,
} from '../constants';
import { useCustomers } from '../hooks/useCustomers';
import type { Customer, CustomerInput } from '../types';

const F = CUSTOMER_STRINGS.form;
const GSTIN_PATTERN = /^[0-9A-Z]{15}$/;

const EMPTY: CustomerInput = {
  type: 'business',
  name: '',
  contactPerson: '',
  mobile: '',
  alternateMobile: '',
  email: '',
  gstNumber: '',
  address: '',
  city: '',
  state: DEFAULT_STATE,
  pinCode: '',
  country: DEFAULT_COUNTRY,
  notes: '',
};

export const toCustomerValues = (c?: Customer | null): CustomerInput =>
  c
    ? {
        type: c.type,
        name: c.name,
        contactPerson: c.contactPerson,
        mobile: c.mobile,
        alternateMobile: c.alternateMobile,
        email: c.email,
        gstNumber: c.gstNumber,
        address: c.address,
        city: c.city,
        state: c.state || DEFAULT_STATE,
        pinCode: c.pinCode,
        country: c.country || DEFAULT_COUNTRY,
        notes: c.notes,
      }
    : EMPTY;

export function validateCustomer(v: CustomerInput): FormErrors<CustomerInput> {
  const errors: FormErrors<CustomerInput> = {};
  if (isBlank(v.name)) {
    errors.name = COMMON_STRINGS.required;
  }
  if (isBlank(v.contactPerson)) {
    errors.contactPerson = COMMON_STRINGS.required;
  }
  if (isBlank(v.mobile)) {
    errors.mobile = COMMON_STRINGS.required;
  } else if (!isPhone(v.mobile)) {
    errors.mobile = COMMON_STRINGS.invalidPhone;
  }
  if (!isBlank(v.alternateMobile) && !isPhone(v.alternateMobile)) {
    errors.alternateMobile = COMMON_STRINGS.invalidPhone;
  }
  if (!isBlank(v.email) && !isEmail(v.email)) {
    errors.email = COMMON_STRINGS.invalidEmail;
  }
  if (
    !isBlank(v.gstNumber) &&
    !GSTIN_PATTERN.test(v.gstNumber.trim().toUpperCase())
  ) {
    errors.gstNumber = F.gstInvalid;
  }
  // The billing address is required by the API (street, city, PIN code).
  if (isBlank(v.address)) {
    errors.address = COMMON_STRINGS.required;
  }
  if (isBlank(v.city)) {
    errors.city = COMMON_STRINGS.required;
  }
  if (isBlank(v.pinCode)) {
    errors.pinCode = COMMON_STRINGS.required;
  } else if (!isPinCode(v.pinCode)) {
    errors.pinCode = F.pinCodeInvalid;
  }
  return errors;
}

export const trimCustomer = (v: CustomerInput): CustomerInput => ({
  ...v,
  name: v.name.trim(),
  contactPerson: v.contactPerson.trim(),
  mobile: v.mobile.trim(),
  alternateMobile: v.alternateMobile.trim(),
  email: v.email.trim(),
  gstNumber: v.gstNumber.trim().toUpperCase(),
  address: v.address.trim(),
  city: v.city.trim(),
  pinCode: v.pinCode.trim(),
  country: v.country.trim(),
  notes: v.notes.trim(),
});

export type CustomerFormModalProps = {
  visible: boolean;
  customer?: Customer | null;
  organizationName: string;
  /** Adding: fields to start with, e.g. what was typed on the order form. */
  initialValues?: Partial<CustomerInput>;
  onClose: () => void;
};

/** Add customer / Edit customer dialog (full screen on phones). */
export function CustomerFormModal({
  visible,
  customer: customerProp,
  organizationName,
  initialValues,
  onClose,
}: CustomerFormModalProps) {
  // Kept while the dialog fades out, so the title doesn't flip to Create.
  const customer = useHeldWhileVisible(visible, customerProp);
  const isEdit = Boolean(customer);
  const { create, update, saving, saveError, clearErrors } = useCustomers();
  const form = useForm<CustomerInput>(
    toCustomerValues(customer),
    validateCustomer,
  );
  const { reset, values, errors, bind } = form;

  useEffect(() => {
    if (visible) {
      reset(
        customer
          ? toCustomerValues(customer)
          : { ...toCustomerValues(), ...initialValues },
      );
      clearErrors();
    }
  }, [visible, customer, initialValues, reset, clearErrors]);

  useOnSettled(saving, saveError, onClose);

  const save = useCallback(
    (v: CustomerInput) =>
      customer ? update(customer.id, trimCustomer(v)) : create(trimCustomer(v)),
    [customer, create, update],
  );

  return (
    <N1Modal
      visible={visible}
      onClose={onClose}
      size="lg"
      title={isEdit ? F.editTitle : F.addTitle}
      subtitle={
        isEdit
          ? F.editSubtitle(customer?.name ?? '')
          : F.addSubtitle(organizationName)
      }
      footer={
        <FormFooter
          onCancel={onClose}
          submitLabel={isEdit ? COMMON_STRINGS.save : F.submitAdd}
          onSubmit={form.submit(save)}
          loading={saving}
          submitTestID="customer-form-submit"
        />
      }
      testID="customer-form"
    >
      <N1RadioGroup
        label={F.type}
        options={CUSTOMER_TYPE_OPTIONS}
        value={values.type}
        onChange={bind('type')}
      />
      <N1TextInput
        label={F.name}
        required
        placeholder={F.namePlaceholder}
        value={values.name}
        onChangeText={bind('name')}
        errorText={errors.name}
        testID="customer-form-name"
      />
      <N1TextInput
        label={F.contact}
        required
        placeholder={F.contactPlaceholder}
        value={values.contactPerson}
        onChangeText={bind('contactPerson')}
        errorText={errors.contactPerson}
        testID="customer-form-contact"
      />
      <FormRow>
        <N1TextInput
          label={F.mobile}
          required
          placeholder={F.mobilePlaceholder}
          value={values.mobile}
          onChangeText={bind('mobile')}
          errorText={errors.mobile}
          keyboardType="phone-pad"
          testID="customer-form-mobile"
        />
        <N1TextInput
          label={F.alternateMobile}
          placeholder={F.alternateMobilePlaceholder}
          value={values.alternateMobile}
          onChangeText={bind('alternateMobile')}
          errorText={errors.alternateMobile}
          keyboardType="phone-pad"
          testID="customer-form-alternate-mobile"
        />
      </FormRow>
      <FormRow>
        <N1TextInput
          label={F.email}
          placeholder={F.emailPlaceholder}
          value={values.email}
          onChangeText={bind('email')}
          errorText={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          testID="customer-form-email"
        />
        <N1TextInput
          label={F.gst}
          placeholder={F.gstPlaceholder}
          value={values.gstNumber}
          onChangeText={bind('gstNumber')}
          errorText={errors.gstNumber}
          autoCapitalize="characters"
          autoCorrect={false}
          testID="customer-form-gst"
        />
      </FormRow>
      <N1TextInput
        label={F.address}
        required
        placeholder={F.addressPlaceholder}
        value={values.address}
        onChangeText={bind('address')}
        errorText={errors.address}
        testID="customer-form-address"
      />
      <FormRow>
        <N1TextInput
          label={F.city}
          required
          placeholder={F.cityPlaceholder}
          value={values.city}
          onChangeText={bind('city')}
          errorText={errors.city}
          testID="customer-form-city"
        />
        <N1DropDown
          label={F.state}
          options={STATE_OPTIONS}
          value={values.state}
          onChange={bind('state')}
        />
      </FormRow>
      <FormRow>
        <N1TextInput
          label={F.pinCode}
          required
          placeholder={F.pinCodePlaceholder}
          value={values.pinCode}
          onChangeText={bind('pinCode')}
          errorText={errors.pinCode}
          keyboardType="number-pad"
          maxLength={6}
          testID="customer-form-pin"
        />
        <N1DropDown
          label={F.country}
          options={COUNTRY_OPTIONS}
          value={values.country || null}
          onChange={bind('country')}
          placeholder={F.countryPlaceholder}
          testID="customer-form-country"
        />
      </FormRow>
      <N1TextInput
        label={F.notes}
        placeholder={F.notesPlaceholder}
        value={values.notes}
        onChangeText={bind('notes')}
        multiline
      />
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </N1Modal>
  );
}
