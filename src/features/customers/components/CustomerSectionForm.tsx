import { useCallback, useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  EditableSectionHeader,
  FormFooter,
  FormRow,
  N1DropDown,
  N1RadioGroup,
  N1Text,
  N1TextInput,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS, COUNTRY_OPTIONS } from '../../../shared/constants';
import { useForm, useOnSettled, type FormErrors } from '../../../shared/hooks';
import {
  CUSTOMER_STRINGS,
  CUSTOMER_TYPE_OPTIONS,
  STATE_OPTIONS,
} from '../constants';
import { useCustomers } from '../hooks/useCustomers';
import type { Customer, CustomerInput } from '../types';
import {
  toCustomerValues,
  trimCustomer,
  validateCustomer,
} from './CustomerFormModal';

const F = CUSTOMER_STRINGS.form;
const D = CUSTOMER_STRINGS.details;

export type CustomerSection = 'info' | 'address' | 'notes';

const SECTION_FIELDS: Record<CustomerSection, (keyof CustomerInput)[]> = {
  info: [
    'type',
    'name',
    'contactPerson',
    'mobile',
    'alternateMobile',
    'email',
    'gstNumber',
  ],
  address: ['address', 'city', 'state', 'pinCode', 'country'],
  notes: ['notes'],
};

const SECTION_TITLES: Record<CustomerSection, string> = {
  info: D.tabs.info,
  address: D.tabs.address,
  notes: D.tabs.notes,
};

/** Only this section's errors, so other sections can't block a save. */
const validatorFor =
  (section: CustomerSection) =>
  (v: CustomerInput): FormErrors<CustomerInput> => {
    const all = validateCustomer(v);
    const errors: FormErrors<CustomerInput> = {};
    SECTION_FIELDS[section].forEach(key => {
      if (all[key]) {
        errors[key] = all[key];
      }
    });
    return errors;
  };

const makeStyles = createN1Styles(t => ({
  panel: { gap: t.spacing.lg },
  fields: { gap: t.spacing.lg },
}));

type Props = {
  customer: Customer;
  section: CustomerSection;
  /** Fields are locked until Edit is pressed. */
  editing: boolean;
  onEdit: () => void;
  /** Cancel, or a successful save: lock the fields again. */
  onDone: () => void;
  /**
   * Phones: places the form and its Cancel / Save into a full-screen editor
   * (a modal sliding up). Without it, the buttons sit beside the title.
   */
  layout?: (parts: { form: ReactNode; footer: ReactNode }) => ReactNode;
};

/**
 * Customer details → Customer info, Address info or Notes: locked fields
 * that Edit unlocks in place (no dialog). Saves only this section.
 */
export function CustomerSectionForm({
  customer,
  section,
  editing,
  onEdit,
  onDone,
  layout,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const { update, saving, saveError } = useCustomers();
  const form = useForm<CustomerInput>(
    toCustomerValues(customer),
    validatorFor(section),
  );
  const { reset, values, errors, bind } = form;
  const locked = !editing;

  // Locked fields always show the saved customer; Cancel drops edits.
  useEffect(() => {
    if (!editing) {
      reset(toCustomerValues(customer));
    }
  }, [editing, customer, reset]);

  useOnSettled(saving, saveError, onDone);

  const save = useCallback(
    (v: CustomerInput) => {
      const trimmed = trimCustomer(v);
      const changes: Partial<CustomerInput> = {};
      SECTION_FIELDS[section].forEach(key => {
        (changes as Record<string, unknown>)[key] = trimmed[key];
      });
      update(customer.id, changes);
    },
    [customer.id, section, update],
  );

  const text = (
    key: Exclude<keyof CustomerInput, 'type' | 'state'>,
    label: string,
    placeholder: string,
    extra?: Partial<React.ComponentProps<typeof N1TextInput>>,
  ) => (
    <N1TextInput
      label={label}
      value={values[key]}
      onChangeText={bind(key)}
      errorText={errors[key]}
      readOnly={locked}
      placeholder={editing ? placeholder : undefined}
      testID={`customer-${section}-${key}`}
      {...extra}
    />
  );

  const fields = () => {
    switch (section) {
      case 'info':
        return (
          <>
            <N1RadioGroup
              label={F.type}
              options={CUSTOMER_TYPE_OPTIONS}
              value={values.type}
              onChange={bind('type')}
              disabled={locked}
            />
            <FormRow>
              {text('name', F.name, F.namePlaceholder, { required: editing })}
              {text('contactPerson', F.contact, F.contactPlaceholder, {
                required: editing,
              })}
            </FormRow>
            <FormRow>
              {text('mobile', F.mobile, F.mobilePlaceholder, {
                keyboardType: 'phone-pad',
              })}
              {text(
                'alternateMobile',
                F.alternateMobile,
                F.alternateMobilePlaceholder,
                { keyboardType: 'phone-pad' },
              )}
            </FormRow>
            <FormRow>
              {text('email', F.email, F.emailPlaceholder, {
                keyboardType: 'email-address',
                autoCapitalize: 'none',
                autoCorrect: false,
              })}
              {text('gstNumber', F.gst, F.gstPlaceholder, {
                autoCapitalize: 'characters',
                autoCorrect: false,
              })}
            </FormRow>
          </>
        );
      case 'address':
        return (
          <>
            {text('address', F.address, F.addressPlaceholder, {
              multiline: true,
            })}
            <FormRow>
              {text('city', F.city, F.cityPlaceholder)}
              <N1DropDown
                label={F.state}
                options={STATE_OPTIONS}
                value={values.state}
                onChange={bind('state')}
                disabled={locked}
                testID="customer-address-state"
              />
            </FormRow>
            <FormRow>
              {text('pinCode', F.pinCode, F.pinCodePlaceholder, {
                keyboardType: 'number-pad',
                maxLength: 6,
              })}
              <N1DropDown
                label={F.country}
                options={COUNTRY_OPTIONS}
                value={values.country || null}
                onChange={bind('country')}
                placeholder={editing ? F.countryPlaceholder : ''}
                disabled={locked}
                testID="customer-address-country"
              />
            </FormRow>
          </>
        );
      case 'notes':
        return text('notes', F.notes, F.notesPlaceholder, {
          multiline: true,
          // Locked and empty: say so instead of a blank box.
          value: locked && !values.notes ? D.noNotes : values.notes,
        });
    }
  };

  const panel = (
    <View style={styles.panel} testID={`customer-${section}-form`}>
      <EditableSectionHeader
        title={SECTION_TITLES[section]}
        editing={editing}
        saving={saving}
        onEdit={onEdit}
        onCancel={onDone}
        onSave={form.submit(save)}
        editLabel={CUSTOMER_STRINGS.a11y.edit(customer.name)}
        editTestID={`edit-customer-${section}`}
        submitTestID={`customer-${section}-submit`}
        actionsInFooter={Boolean(layout)}
      />
      <View style={styles.fields}>{fields()}</View>
      {editing && saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </View>
  );
  if (!layout) {
    return panel;
  }
  return layout({
    form: panel,
    footer: (
      <FormFooter
        submitLabel={COMMON_STRINGS.save}
        onSubmit={form.submit(save)}
        onCancel={onDone}
        loading={saving}
        submitTestID={`customer-${section}-submit`}
      />
    ),
  });
}
