import { useState } from 'react';
import { View } from 'react-native';
import {
  AsyncContent,
  ComingSoon,
  N1Badge,
  N1Button,
  N1FieldLabel,
  N1Header,
  N1Text,
  N1TextInput,
  N1UploadBox,
  UserScreen,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { useOnSettled } from '../../../shared/hooks';
import {
  formatFileSize,
  isBlank,
  notifyUnavailable,
} from '../../../shared/utils';
import type { Attachment } from '../../../shared/types';
import { pickDocument } from '../../../services/files/pickDocument';
import {
  JOB_CARD_STRINGS,
  jobHeading,
  useJobCard,
  type RejectedMaterial,
} from '../../jobCards';
import {
  QC_STATUS_META,
  QC_STRINGS,
  REJECTED_MATERIAL_FIELDS,
} from '../constants';
import { useEmployeeProfile } from '../../profile/hooks/useEmployeeProfile';
import { qcResult } from '../qc';
import type { JobsScreenProps } from '../types';

const S = QC_STRINGS.fail;

const makeStyles = createN1Styles(t => ({
  summary: { gap: t.spacing.xs, alignItems: 'flex-start' },
  field: { gap: t.spacing.sm },
  heading: { gap: t.spacing.xs },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.md,
  },
}));

const NO_MATERIAL: RejectedMaterial = { grade: '', heatNumber: '', size: '' };

/**
 * Why a QC check failed. Remarks are required, and an RM QC failure also
 * records the rejected material's grade, heat number and size. A supporting
 * document is optional and kept as the check's report. Submit Fail
 * marks the item failed and returns to the QC list.
 */
export function QcFailScreen({ route, navigation }: JobsScreenProps<'QcFail'>) {
  const styles = useN1Styles(makeStyles);
  const { jobCardId, kind } = route.params;
  const { jobCard, status, error, reload, update, saving, saveError } =
    useJobCard(jobCardId);
  // Recorded on the check as who failed it.
  const { profile } = useEmployeeProfile();
  const [remarks, setRemarks] = useState('');
  const [missing, setMissing] = useState(false);
  const [material, setMaterial] = useState(NO_MATERIAL);
  const [missingMaterial, setMissingMaterial] = useState<
    (keyof RejectedMaterial)[]
  >([]);
  const [report, setReport] = useState<Attachment | null>(null);
  const [picking, setPicking] = useState(false);
  const isRm = kind === 'rm';

  // Close both Fail Remarks and the QC Check under it.
  useOnSettled(saving, saveError, () => navigation.pop(2));

  const header = (
    <N1Header
      title={S.title}
      leftIcon="chevron-left"
      onLeftPress={() => navigation.goBack()}
    />
  );
  if (!jobCard) {
    return (
      <UserScreen header={header} testID="qc-fail-screen">
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

  const submit = () => {
    const blankMaterial = isRm
      ? REJECTED_MATERIAL_FIELDS.map(f => f.key).filter(key =>
          isBlank(material[key]),
        )
      : [];
    setMissing(isBlank(remarks));
    setMissingMaterial(blankMaterial);
    if (isBlank(remarks) || blankMaterial.length) {
      return;
    }
    update(
      jobCard.id,
      qcResult(
        jobCard,
        kind,
        false,
        remarks.trim(),
        new Date().toISOString(),
        profile?.name,
        isRm
          ? {
              grade: material.grade.trim(),
              heatNumber: material.heatNumber.trim(),
              size: material.size.trim(),
            }
          : undefined,
        report ?? undefined,
      ),
    );
  };
  const attach = async () => {
    setPicking(true);
    try {
      const file = await pickDocument(
        S.documentKind,
        S.documentSample,
        S.documentAccept,
      );
      if (file) {
        setReport(file);
      }
    } finally {
      setPicking(false);
    }
  };
  const setField = (key: keyof RejectedMaterial) => (value: string) => {
    setMaterial(prev => ({ ...prev, [key]: value }));
    setMissingMaterial(prev => prev.filter(k => k !== key));
  };

  const failed = QC_STATUS_META.failed;
  return (
    <UserScreen
      header={header}
      footer={
        <N1Button
          title={S.submit}
          leftIcon="check"
          variant="danger"
          size="lg"
          fullWidth
          loading={saving}
          onPress={submit}
          testID="qc-submit-fail"
        />
      }
      testID="qc-fail-screen"
    >
      <View style={styles.summary}>
        <N1Badge label={failed.label} tone={failed.tone} dot />
        <N1Text variant="title" weight="bold">
          {jobHeading(jobCard)}
        </N1Text>
        <N1Text variant="small" color="secondary">
          {jobCard.customerName}
        </N1Text>
      </View>
      {isRm && (
        <>
          <View style={styles.heading}>
            <N1Text weight="bold">{S.rejectedMaterial}</N1Text>
            <N1Text variant="small" color="secondary">
              {S.rejectedHelp}
            </N1Text>
          </View>
          {REJECTED_MATERIAL_FIELDS.map(field => (
            <N1TextInput
              key={field.key}
              label={field.label}
              required
              placeholder={field.placeholder}
              value={material[field.key]}
              onChangeText={setField(field.key)}
              errorText={
                missingMaterial.includes(field.key)
                  ? COMMON_STRINGS.required
                  : undefined
              }
              testID={`qc-rejected-${field.key}`}
            />
          ))}
        </>
      )}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <N1FieldLabel label={S.remarks} required />
          <N1Button
            title={S.voiceNote}
            leftIcon="mic"
            variant="secondary"
            size="sm"
            onPress={() => notifyUnavailable(S.voiceNotes)}
          />
        </View>
        <N1TextInput
          value={remarks}
          onChangeText={value => {
            setRemarks(value);
            setMissing(false);
          }}
          placeholder={S.placeholder}
          multiline
          errorText={missing ? COMMON_STRINGS.required : undefined}
          accessibilityLabel={S.remarks}
          testID="qc-remarks"
        />
      </View>
      <N1UploadBox
        label={S.document}
        hint={S.documentHint}
        onPress={attach}
        fileName={report?.name}
        fileSize={report ? formatFileSize(report.sizeBytes) : undefined}
        onRemove={() => setReport(null)}
        disabled={picking || saving}
        testID="qc-fail-document"
      />
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </UserScreen>
  );
}
