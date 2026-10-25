import React, { useCallback } from 'react';
import { View } from 'react-native';
import {
  AsyncContent,
  ComingSoon,
  N1Badge,
  N1Button,
  N1Header,
  N1KeyValueList,
  N1Text,
  UserScreen,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { useOnSettled } from '../../../shared/hooks';
import {
  JOB_CARD_STRINGS,
  jobHeading,
  rejectedMaterialItems,
  useJobCard,
} from '../../jobCards';
import { useEmployeeProfile } from '../../profile/hooks/useEmployeeProfile';
import { JobOverview, QcStation } from '../components/JobOverview';
import { QC_STATUS_META, QC_STRINGS } from '../constants';
import { qcEntry, qcItem } from '../qc';
import type { JobsScreenProps } from '../types';

const S = QC_STRINGS.check;

const makeStyles = createN1Styles(t => ({
  summary: { gap: t.spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));

/** One QC check: what is inspected, then Pass, or Fail with remarks. */
export function QcCheckScreen({
  route,
  navigation,
}: JobsScreenProps<'QcCheck'>) {
  const styles = useN1Styles(makeStyles);
  const { jobCardId, kind } = route.params;
  const { jobCard, status, error, reload, run, saving, saveError } =
    useJobCard(jobCardId);
  const { profile } = useEmployeeProfile();

  const goBack = useCallback(() => navigation.goBack(), [navigation]);
  // A pass moves the item out of Pending; back to the list.
  useOnSettled(saving, saveError, goBack);

  const header = (
    <N1Header title={S.title} leftIcon="chevron-left" onLeftPress={goBack} />
  );
  if (!jobCard) {
    return (
      <UserScreen header={header} testID="qc-check-screen">
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon
            icon="clipboard"
            title={S.title}
            message={JOB_CARD_STRINGS.details.notFound}
          />
        </AsyncContent>
      </UserScreen>
    );
  }

  const item = qcItem(jobCard, kind);
  const meta = QC_STATUS_META[item.status];
  const entry = qcEntry(jobCard, kind);

  const footer =
    item.status === 'pending'
      ? [
          <N1Button
            key="pass"
            title={S.pass}
            leftIcon="check-circle"
            variant="success"
            size="lg"
            fullWidth
            loading={saving}
            onPress={() =>
              run({
                type: 'recordQc',
                kind,
                operationId: item.operation?.id,
                passed: true,
                remark: '',
                inspector: profile?.name ?? '',
              })
            }
            testID="qc-pass"
          />,
          <N1Button
            key="fail"
            title={S.fail}
            leftIcon="x-circle"
            variant="danger"
            size="lg"
            fullWidth
            disabled={saving}
            onPress={() => navigation.navigate('QcFail', { jobCardId, kind })}
            testID="qc-fail"
          />,
        ]
      : null;

  return (
    <UserScreen header={header} footer={footer} testID="qc-check-screen">
      <View style={styles.summary}>
        <View style={styles.badges}>
          <N1Badge label={QC_STRINGS.kind[kind]} tone="neutral" />
          <N1Badge label={item.stage} tone="info" />
          {item.status !== 'pending' && (
            <N1Badge label={meta.label} tone={meta.tone} dot />
          )}
        </View>
        <N1Text variant="h2">{jobHeading(jobCard)}</N1Text>
        <N1Text weight="semiBold" color="secondary">
          {jobCard.customerName}
        </N1Text>
      </View>
      {item.status === 'in_progress' && (
        <N1Text color="secondary">{S.running}</N1Text>
      )}
      {item.status === 'waiting' && (
        <N1Text color="secondary">{S.waiting}</N1Text>
      )}
      {item.status === 'failed' && entry?.remark ? (
        <N1KeyValueList
          title={S.remark}
          items={[
            { label: entry.stage, value: entry.remark },
            ...(entry.rejectedMaterial
              ? rejectedMaterialItems(entry.rejectedMaterial)
              : []),
          ]}
        />
      ) : null}
      <JobOverview
        jobCard={jobCard}
        onViewDetails={() =>
          navigation.navigate('OrderDetails', { orderId: jobCard.orderId })
        }
        station={
          <QcStation
            jobCard={jobCard}
            kind={kind}
            item={item}
            assignedQc={profile?.name ?? ''}
          />
        }
      />
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </UserScreen>
  );
}
