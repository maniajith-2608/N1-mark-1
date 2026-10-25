import React, { useCallback } from 'react';
import { View } from 'react-native';
import {
  AsyncContent,
  ComingSoon,
  N1Button,
  N1Header,
  N1RadioGroup,
  N1Text,
  N1TextInput,
  UserScreen,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { useForm, useOnSettled, type FormErrors } from '../../../shared/hooks';
import { isBlank } from '../../../shared/utils';
import {
  MATERIAL_SOURCE_OPTIONS,
  ORDER_STRINGS,
  useOrder,
  type WorkOrder,
} from '../../orders';
import {
  JOBS_STRINGS,
  RAW_MATERIAL_FIELDS,
  MATERIAL_SOURCE_FIELD,
} from '../constants';
import { useMyJobs } from '../hooks/useMyJobs';
import { useOpenOverTabs } from '../hooks/useOpenOverTabs';
import type { JobsScreenProps, RawMaterialInput } from '../types';
import { isRawMaterialMissing, rawMaterialOf } from '../utils';

const S = JOBS_STRINGS.rawMaterial;

const makeStyles = createN1Styles(t => ({
  heading: { gap: t.spacing.xs },
}));

const validate = (v: RawMaterialInput): FormErrors<RawMaterialInput> => {
  const errors: FormErrors<RawMaterialInput> = {};
  (Object.keys(v) as (keyof RawMaterialInput)[]).forEach(key => {
    if (isBlank(v[key])) {
      errors[key] = COMMON_STRINGS.required;
    }
  });
  return errors;
};

type FormProps = {
  order: WorkOrder;
  /** Replacing material RM QC rejected: a new heat, checked again. */
  retest: boolean;
  header: React.ReactNode;
  /** Called once the job is on My Jobs. */
  onImported: () => void;
};

// Mounted once the order has loaded, so the form starts from its values.
function RawMaterialForm({ order, retest, header, onImported }: FormProps) {
  const styles = useN1Styles(makeStyles);
  const { importJob, importing, importError } = useMyJobs();
  const { values, errors, bind, submit } = useForm(
    // New material comes from a new heat.
    retest ? { ...rawMaterialOf(order), heatNumber: '' } : rawMaterialOf(order),
    validate,
  );
  const missing = isRawMaterialMissing(order);

  useOnSettled(importing, importError, onImported);

  const save = useCallback(
    (v: RawMaterialInput) =>
      // Saved on the job card (saveJobCardRawMaterial); RM QC inspects it
      // (again, after a rejection).
      importJob(order.jobCardId, {
        rawMaterialGrade: v.rawMaterialGrade.trim(),
        rawMaterialSize: v.rawMaterialSize.trim(),
        heatNumber: v.heatNumber.trim(),
        rmPartNumber: v.rmPartNumber.trim(),
        materialSource: v.materialSource,
      }),
    [importJob, order.jobCardId],
  );

  const workOrder = ORDER_STRINGS.workOrder(order.number);
  return (
    <UserScreen
      header={header}
      footer={
        <N1Button
          title={retest ? S.retestSubmit : S.continue}
          leftIcon={retest ? 'refresh' : 'arrow-right'}
          size="lg"
          fullWidth
          loading={importing}
          onPress={submit(save)}
          testID="raw-material-submit"
        />
      }
      testID="raw-material-screen"
    >
      <View style={styles.heading}>
        <N1Text variant="title" weight="bold">
          {retest ? S.retestHeading : missing ? S.heading : S.confirmHeading}
        </N1Text>
        <N1Text variant="small" color="secondary">
          {retest
            ? S.retestHelp(workOrder)
            : missing
            ? S.help(workOrder)
            : S.confirmHelp(workOrder)}
        </N1Text>
      </View>
      {RAW_MATERIAL_FIELDS.map(field => (
        <N1TextInput
          key={field.key}
          label={field.label}
          placeholder={field.placeholder}
          value={values[field.key]}
          onChangeText={bind(field.key)}
          errorText={errors[field.key]}
          testID={`raw-material-${field.key}`}
        />
      ))}
      <N1RadioGroup
        label={MATERIAL_SOURCE_FIELD.label}
        options={MATERIAL_SOURCE_OPTIONS}
        value={values.materialSource || null}
        onChange={bind('materialSource')}
        errorText={errors.materialSource}
      />
      {importError && (
        <N1Text variant="small" color="danger">
          {importError}
        </N1Text>
      )}
    </UserScreen>
  );
}

/**
 * Mandatory raw material details, opened as a modal from the order. Continue
 * saves them on the job card (opened with the order), adds the job to My
 * Jobs (watchJob) and opens its job card (Back returns to My Jobs).
 */
export function RawMaterialScreen({
  route,
  navigation,
}: JobsScreenProps<'RawMaterial'>) {
  const { orderId, retest = false } = route.params;
  const { order, status, error, reload } = useOrder(orderId);

  const openOverTabs = useOpenOverTabs();
  const jobCardId = order?.jobCardId;
  const openJobCard = useCallback(() => {
    if (jobCardId) {
      openOverTabs('JobCardDetails', { jobCardId });
    }
  }, [openOverTabs, jobCardId]);

  const header = (
    <N1Header
      title={S.title}
      leftIcon="close"
      onLeftPress={() => navigation.goBack()}
    />
  );

  return order ? (
    <RawMaterialForm
      order={order}
      retest={retest}
      header={header}
      onImported={openJobCard}
    />
  ) : (
    <UserScreen header={header} testID="raw-material-screen">
      <AsyncContent status={status} error={error} onRetry={reload}>
        <ComingSoon
          icon="package"
          title={S.title}
          message={ORDER_STRINGS.details.notFound}
        />
      </AsyncContent>
    </UserScreen>
  );
}
