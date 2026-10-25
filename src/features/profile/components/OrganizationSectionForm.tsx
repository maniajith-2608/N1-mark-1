import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import {
  FormRow,
  N1DropDown,
  N1Text,
  N1TextInput,
  N1UploadBox,
  createN1Styles,
  useN1Styles,
  EditableSectionHeader,
} from '../../../shared/components';
import { COUNTRY_OPTIONS } from '../../../shared/constants';
import { useForm, useOnSettled } from '../../../shared/hooks';
import { formatDate, formatFileSize } from '../../../shared/utils';
import { pickDocument } from '../../../services/files/pickDocument';
import { usePermission } from '../hooks/usePermission';
import { useSession } from '../hooks/useSession';
import {
  BUSINESS_TYPE_OPTIONS,
  INDUSTRY_OPTIONS,
  ORGANIZATION_SECTIONS,
  ORGANIZATION_STRINGS as S,
  STATE_OPTIONS,
  sectionChanges,
  toFormValues,
  validateSection,
  type OrganizationFormValues,
  type OrganizationSection,
} from '../organization';
import type { Organization } from '../types';

/** The sections this form edits; GST has its own settings form. */
type FormSection = Exclude<OrganizationSection, 'gst'>;

const F = S.fields;
const P = S.placeholders;

type FileField = 'invoiceLogo' | 'signature';
type DropDownField = 'businessType' | 'industry' | 'state' | 'country';

const DROPDOWN_OPTIONS: Record<DropDownField, typeof STATE_OPTIONS> = {
  businessType: BUSINESS_TYPE_OPTIONS,
  industry: INDUSTRY_OPTIONS,
  state: STATE_OPTIONS,
  country: COUNTRY_OPTIONS,
};

const makeStyles = createN1Styles(t => ({
  panel: { gap: t.spacing.lg },
  fields: { gap: t.spacing.lg },
}));

type Props = {
  section: FormSection;
  organization: Organization;
  /** Fields are locked until Edit is pressed. */
  editing: boolean;
  onEdit: () => void;
  /** Cancel, or a successful save: lock the fields again. */
  onDone: () => void;
};

/**
 * One section of the organization (General, Address, …) as locked fields;
 * Edit unlocks them in place, Save or Cancel locks them again.
 */
export function OrganizationSectionForm({
  section,
  organization,
  editing,
  onEdit,
  onDone,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const { updateOrganization, saving, saveError } = useSession();
  // Only org.manage may save (an accountant sees the details read-only).
  const canManage = usePermission('org.manage');
  const validate = useCallback(
    (v: OrganizationFormValues) => validateSection(section, v),
    [section],
  );
  const form = useForm<OrganizationFormValues>(
    toFormValues(organization),
    validate,
  );
  const { reset, values, errors, bind, setField } = form;

  // Locked fields always show the saved organization; Cancel drops edits.
  useEffect(() => {
    if (!editing) {
      reset(toFormValues(organization));
    }
  }, [editing, organization, reset]);

  useOnSettled(saving, saveError, onDone);

  const save = useCallback(
    (v: OrganizationFormValues) =>
      updateOrganization(sectionChanges(section, v)),
    [section, updateOrganization],
  );

  const attach = useCallback(
    async (field: FileField) => {
      const file = await pickDocument(F[field], `${field}.png`);
      if (file) {
        setField(field, file);
      }
    },
    [setField],
  );

  const locked = !editing;
  const meta = ORGANIZATION_SECTIONS.find(s => s.key === section)!;

  const text = (
    key: keyof typeof P & keyof OrganizationFormValues,
    extra?: Partial<React.ComponentProps<typeof N1TextInput>>,
  ) => (
    <N1TextInput
      key={key}
      label={F[key as keyof typeof F]}
      value={values[key] as string}
      onChangeText={bind(key) as (value: string) => void}
      placeholder={editing ? P[key] : undefined}
      errorText={errors[key]}
      readOnly={locked}
      testID={`organization-form-${key}`}
      {...extra}
    />
  );

  /** Shown for reference; never editable. */
  const fixed = (label: string, value: string, testID: string) => (
    <N1TextInput label={label} value={value} readOnly testID={testID} />
  );

  const dropDown = (key: DropDownField, required = false) => (
    <N1DropDown
      key={key}
      label={F[key]}
      required={required && editing}
      errorText={errors[key]}
      options={DROPDOWN_OPTIONS[key]}
      value={values[key] || null}
      onChange={bind(key)}
      placeholder={editing ? P[key] : undefined}
      disabled={locked}
      testID={`organization-form-${key}`}
    />
  );

  const upload = (key: FileField) => {
    const file = values[key];
    return (
      <N1UploadBox
        key={key}
        label={F[key]}
        hint={editing ? S.uploadHint : S.notSet}
        onPress={() => attach(key)}
        fileName={file?.name}
        fileSize={file ? formatFileSize(file.sizeBytes) : undefined}
        onRemove={editing ? () => setField(key, null) : undefined}
        disabled={locked}
        testID={`organization-form-${key}`}
      />
    );
  };

  const fields = () => {
    switch (section) {
      case 'general':
        return (
          <>
            <FormRow>
              {text('name', { required: editing })}
              {fixed(S.code, organization.code, 'organization-code')}
            </FormRow>
            <FormRow>
              {text('phone', { keyboardType: 'phone-pad' })}
              {text('email', {
                required: editing,
                keyboardType: 'email-address',
                autoCapitalize: 'none',
              })}
            </FormRow>
            {text('website', { autoCapitalize: 'none', keyboardType: 'url' })}
          </>
        );
      case 'business':
        return (
          <>
            <FormRow>
              {dropDown('businessType')}
              {dropDown('industry')}
            </FormRow>
            <FormRow>
              {text('registrationDetails')}
              {fixed(
                S.createdAt,
                formatDate(organization.createdAt),
                'organization-created-at',
              )}
            </FormRow>
          </>
        );
      case 'address':
        return (
          <>
            {text('address', { multiline: true, required: editing })}
            <FormRow>
              {text('city', { required: editing })}
              {dropDown('state', true)}
            </FormRow>
            <FormRow>
              {text('pinCode', {
                keyboardType: 'number-pad',
                maxLength: 6,
                required: editing,
              })}
              {dropDown('country')}
            </FormRow>
          </>
        );
      case 'invoice':
        return (
          <>
            <FormRow>
              {text('invoicePrefix', { autoCapitalize: 'characters' })}
              {text('invoiceStartNumber', {
                required: editing,
                keyboardType: 'number-pad',
                helperText: editing ? S.help.invoiceStartNumber : undefined,
              })}
            </FormRow>
            {text('invoiceFooter', { multiline: true })}
          </>
        );
      case 'documents':
        return (
          <>
            {upload('invoiceLogo')}
            {text('termsAndConditions', { multiline: true })}
            {upload('signature')}
          </>
        );
    }
  };

  return (
    <View style={styles.panel} testID="organization-form">
      <EditableSectionHeader
        actionsInFooter={!canManage}
        title={meta.title}
        icon={meta.icon}
        editing={editing}
        saving={saving}
        onEdit={onEdit}
        onCancel={onDone}
        onSave={form.submit(save)}
        editLabel={S.edit(meta.title)}
        editTestID={`edit-organization-${section}`}
        submitTestID="organization-form-submit"
      />
      <View style={styles.fields}>{fields()}</View>
      {editing && saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </View>
  );
}
