import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  FormRow,
  N1Badge,
  N1Button,
  N1Card,
  N1DropDown,
  N1FieldHelper,
  N1IconButton,
  N1Table,
  N1Tabs,
  N1Text,
  N1TextInput,
  createN1Styles,
  useN1Styles,
  type N1TableColumn,
  EditableSectionHeader,
} from '../../../shared/components';
import { useForm, useOnSettled } from '../../../shared/hooks';
import { formatRate, splitGstRate } from '../../../shared/utils';
import {
  GST_STRINGS as S,
  activeTaxRates,
  gstSettingsChanges,
  newTaxRateId,
  toGstSettings,
  validateGstSettings,
  type GstSettings,
} from '../gst';
import { usePermission } from '../hooks/usePermission';
import { useSession } from '../hooks/useSession';
import { ORGANIZATION_SECTIONS, ORGANIZATION_STRINGS } from '../organization';
import type { Organization, TaxRate } from '../types';
import { TaxRateModal } from './TaxRateModal';

const meta = ORGANIZATION_SECTIONS.find(s => s.key === 'gst')!;

const makeStyles = createN1Styles(t => ({
  panel: { gap: t.spacing.lg },
  locked: { pointerEvents: 'none' },
  section: { gap: t.spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.md,
  },
  // Phones: one small grey card per configured rate.
  rateCard: {
    gap: t.spacing.xs,
    padding: t.spacing.md,
    borderRadius: t.radius.compact,
    backgroundColor: t.colors.surfaceMuted,
  },
  rateTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.sm,
  },
  rateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
  },
  how: { gap: t.spacing.sm },
  howRow: { gap: t.spacing.xxs },
}));

type RegisteredKey = 'yes' | 'no';
const REGISTERED_TABS: { key: RegisteredKey; label: string }[] = [
  { key: 'yes', label: S.yes },
  { key: 'no', label: S.no },
];

/** null: closed. undefined rate: adding. */
type RateEditor = { rate?: TaxRate } | null;

type Props = {
  organization: Organization;
  /** Fields are locked until Edit is pressed. */
  editing: boolean;
  onEdit: () => void;
  /** Cancel, or a successful save: lock the fields again. */
  onDone: () => void;
};

/**
 * GST & Tax Settings: registration, the default rate, the configured rates
 * (CGST / SGST / IGST derived) and how GST is applied on invoices. Locked
 * until Edit; nothing is saved until Save.
 */
export function GstSettingsForm({
  organization,
  editing,
  onEdit,
  onDone,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const { updateOrganization, saving, saveError } = useSession();
  // Only org.manage may save (an accountant sees the details read-only).
  const canManage = usePermission('org.manage');
  const form = useForm<GstSettings>(
    toGstSettings(organization),
    validateGstSettings,
  );
  const { reset, values, errors, setField, submit } = form;
  const [rateEditor, setRateEditor] = useState<RateEditor>(null);

  // Locked fields always show the saved settings; Cancel drops edits.
  useEffect(() => {
    if (!editing) {
      reset(toGstSettings(organization));
      setRateEditor(null);
    }
  }, [editing, organization, reset]);

  useOnSettled(saving, saveError, onDone);
  const locked = !editing;

  const saveRate = useCallback(
    (rate: number, active: boolean) => {
      const current = rateEditor?.rate;
      const rates = current
        ? values.taxRates.map(r =>
            r.id === current.id ? { ...r, rate, active } : r,
          )
        : [...values.taxRates, { id: newTaxRateId(), rate, active: true }];
      setField(
        'taxRates',
        [...rates].sort((a, b) => a.rate - b.rate),
      );
      // The default follows an edited rate; it's cleared if switched off.
      if (current && values.defaultTaxRate === current.rate) {
        setField('defaultTaxRate', active ? rate : null);
      }
      setRateEditor(null);
    },
    [rateEditor, values.taxRates, values.defaultTaxRate, setField],
  );

  const save = useCallback(
    (v: GstSettings) => updateOrganization(gstSettingsChanges(v)),
    [updateOrganization],
  );

  const defaultOptions = useMemo(
    () =>
      activeTaxRates(values.taxRates).map(rate => ({
        label: formatRate(rate),
        value: rate,
      })),
    [values.taxRates],
  );

  // Rates are edited only while the section is unlocked.
  const columns = useMemo(() => {
    const all: N1TableColumn<TaxRate>[] = [
      {
        key: 'rate',
        title: S.columns.rate,
        render: r => <N1Text weight="bold">{formatRate(r.rate)}</N1Text>,
      },
      ...(['cgst', 'sgst', 'igst'] as const).map(key => ({
        key,
        title: S.columns[key],
        render: (r: TaxRate) => (
          <N1Text>{formatRate(splitGstRate(r.rate)[key])}</N1Text>
        ),
      })),
      {
        key: 'status',
        title: S.columns.status,
        flex: 1.2,
        render: r =>
          r.active ? (
            <N1Badge label={S.active} tone="success" dot />
          ) : (
            <N1Badge label={S.inactive} tone="neutral" dot />
          ),
      },
      {
        key: 'action',
        title: S.columns.action,
        flex: 0.8,
        align: 'right',
        interactive: true,
        render: r => (
          <N1IconButton
            icon="edit"
            variant="primary"
            size="sm"
            accessibilityLabel={S.editRateA11y(formatRate(r.rate))}
            onPress={() => setRateEditor({ rate: r })}
            testID={`edit-rate-${r.rate}`}
          />
        ),
      },
    ];
    return editing ? all : all.filter(column => column.key !== 'action');
  }, [editing]);

  // Phones: the rate and its status, then the split on one line.
  const rateCard = (r: TaxRate) => {
    const split = splitGstRate(r.rate);
    return (
      <View style={styles.rateCard} testID={`rate-card-${r.rate}`}>
        <View style={styles.rateTop}>
          <N1Text weight="bold">{formatRate(r.rate)}</N1Text>
          <View style={styles.rateActions}>
            {/* The badge pins itself to the top; the wrapper centres it. */}
            <View>
              {r.active ? (
                <N1Badge label={S.active} tone="success" dot />
              ) : (
                <N1Badge label={S.inactive} tone="neutral" dot />
              )}
            </View>
            {editing && (
              // Just the pencil, like other row actions.
              <N1IconButton
                icon="edit"
                variant="ghost"
                size="sm"
                accessibilityLabel={S.editRateA11y(formatRate(r.rate))}
                onPress={() => setRateEditor({ rate: r })}
                testID={`edit-rate-${r.rate}`}
              />
            )}
          </View>
        </View>
        <N1Text variant="small" color="secondary">
          {(['cgst', 'sgst', 'igst'] as const)
            .map(key => `${S.columns[key]} ${formatRate(split[key])}`)
            .join(' · ')}
        </N1Text>
      </View>
    );
  };

  const example = values.defaultTaxRate ?? 18;
  const exampleSplit = splitGstRate(example);

  return (
    <View style={styles.panel} testID="gst-settings">
      <EditableSectionHeader
        actionsInFooter={!canManage}
        title={meta.title}
        icon={meta.icon}
        editing={editing}
        saving={saving}
        onEdit={onEdit}
        onCancel={onDone}
        onSave={submit(save)}
        editLabel={ORGANIZATION_STRINGS.edit(meta.title)}
        editTestID="edit-organization-gst"
        submitTestID="gst-settings-submit"
      />
      {/* 1. Registration */}
      <View style={styles.section}>
        <N1Text variant="title" weight="bold">
          {S.registered}
        </N1Text>
        <N1Tabs
          style={locked && styles.locked}
          tabs={REGISTERED_TABS}
          value={values.gstRegistered ? 'yes' : 'no'}
          onChange={key => setField('gstRegistered', key === 'yes')}
        />
        {values.gstRegistered ? (
          <FormRow>
            <N1TextInput
              label={S.gstin}
              required={editing}
              value={values.gstNumber}
              onChangeText={value => setField('gstNumber', value)}
              placeholder={S.gstinPlaceholder}
              errorText={errors.gstNumber}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={15}
              readOnly={locked}
              testID="gst-settings-gstin"
            />
            <N1DropDown
              label={S.defaultRate}
              required={editing}
              options={defaultOptions}
              value={values.defaultTaxRate}
              onChange={value => setField('defaultTaxRate', value)}
              placeholder={S.defaultRatePlaceholder}
              helperText={editing ? S.defaultRateHelp : undefined}
              errorText={errors.defaultTaxRate}
              disabled={locked}
              testID="gst-settings-default"
            />
          </FormRow>
        ) : (
          <N1Text color="secondary" testID="gst-not-applied">
            {S.notApplied}
          </N1Text>
        )}
      </View>

      {values.gstRegistered && (
        <>
          {/* 2. Configured rates */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <N1Text variant="title" weight="bold">
                {S.configured}
              </N1Text>
              {editing && (
                <N1Button
                  title={S.addRate}
                  leftIcon="plus"
                  variant="secondary"
                  size="sm"
                  onPress={() => setRateEditor({})}
                  testID="add-tax-rate"
                />
              )}
            </View>
            <N1Table
              columns={columns}
              data={values.taxRates}
              keyExtractor={r => r.id}
              renderCompactItem={rateCard}
              testID="tax-rates-table"
            />
            <N1FieldHelper errorText={errors.taxRates} />
          </View>

          {/* 3. How it's applied */}
          <N1Card title={S.howTitle} icon="info" testID="gst-how">
            <View style={styles.how}>
              <N1Text variant="small" color="secondary">
                {S.howIntro}
              </N1Text>
              <View style={styles.howRow}>
                <N1Text weight="semiBold">{S.intra}</N1Text>
                <N1Text variant="small" color="secondary">
                  {`${S.example(formatRate(example))} → CGST ${formatRate(
                    exampleSplit.cgst,
                  )} + SGST ${formatRate(exampleSplit.sgst)}`}
                </N1Text>
              </View>
              <View style={styles.howRow}>
                <N1Text weight="semiBold">{S.inter}</N1Text>
                <N1Text variant="small" color="secondary">
                  {`${S.example(formatRate(example))} → IGST ${formatRate(
                    exampleSplit.igst,
                  )}`}
                </N1Text>
              </View>
            </View>
          </N1Card>
        </>
      )}
      {editing && saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
      <TaxRateModal
        visible={rateEditor !== null}
        rate={rateEditor?.rate}
        rates={values.taxRates}
        onCancel={() => setRateEditor(null)}
        onSave={saveRate}
      />
    </View>
  );
}
