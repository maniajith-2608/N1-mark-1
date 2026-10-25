import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import {
  FormFooter,
  N1Icon,
  N1Modal,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS, DRAWING_CARD_THUMB } from '../../../shared/constants';
import { useHeldWhileVisible, useOnSettled } from '../../../shared/hooks';
import { DrawingPreview } from '../../orders/components/DrawingPreview';
import { PriorityBadge } from '../../orders/components/OrderBadges';
import { JOB_CARD_STRINGS as S } from '../constants';
import { useJobCardCommands } from '../hooks/useJobCards';
import type { JobCard } from '../types';
import { jobTitle } from '../utils';
import { FlowEditor, useFlowEditor } from './FlowEditor';

const makeStyles = createN1Styles(t => ({
  // The job card, small, above the steps: drawing thumbnail, job ID, part,
  // work order and priority.
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.md,
    padding: t.spacing.md,
    borderRadius: t.radius.compact,
    backgroundColor: t.colors.background,
  },
  thumb: {
    ...DRAWING_CARD_THUMB,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surface,
  },
  noThumb: {
    ...DRAWING_CARD_THUMB,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surface,
  },
  titles: { flex: 1, gap: t.spacing.xxs },
}));

type Props = {
  visible: boolean;
  jobCard: JobCard | undefined;
  /** The drawing number shown on the thumbnail. */
  drawingNumber: string;
  onClose: () => void;
};

/**
 * Phones: Create / Edit flow as a sheet that slides up — only the flow
 * editor, under the job card in small (drawing, job ID, part, priority),
 * with Cancel and Create / Save pinned at the bottom. Closes once saved.
 */
export function FlowEditorSheet({ visible, jobCard, ...rest }: Props) {
  // Kept while the sheet slides away; a fresh draft each time it opens.
  const held = useHeldWhileVisible(visible, jobCard);
  const [session, setSession] = useState(0);
  useEffect(() => {
    if (visible) {
      setSession(n => n + 1);
    }
  }, [visible]);
  return held ? (
    <FlowSheetBody key={session} visible={visible} jobCard={held} {...rest} />
  ) : null;
}

function FlowSheetBody({
  visible,
  jobCard,
  drawingNumber,
  onClose,
}: Omit<Props, 'jobCard'> & { jobCard: JobCard }) {
  const styles = useN1Styles(makeStyles);
  const editor = useFlowEditor(jobCard);
  const editing = jobCard.operations.length > 0;
  const { run, saving, saveError } = useJobCardCommands();
  // Closes once its own save lands, not on other job card updates.
  const savingHere = useRef(false);
  useOnSettled(saving, saveError, () => {
    if (savingHere.current) {
      savingHere.current = false;
      onClose();
    }
  });
  const save = useCallback(() => {
    const steps = editor.submit();
    if (steps) {
      savingHere.current = true;
      run(jobCard.id, { type: 'route', steps });
    }
  }, [editor, run, jobCard.id]);

  // Just a reminder of the part: a viewer can't open over this sheet.
  const thumb = jobCard.designFile ? (
    <DrawingPreview drawingNumber={drawingNumber} style={styles.thumb} />
  ) : (
    <View style={styles.noThumb}>
      <N1Icon name="file" size="md" color="textTertiary" />
    </View>
  );

  return (
    <N1Modal
      visible={visible}
      onClose={onClose}
      title={editing ? S.flow.editTitle : S.flow.createTitle}
      subtitle={S.workOrder(jobCard.number)}
      footer={
        <FormFooter
          onCancel={onClose}
          submitLabel={editing ? S.flow.save : S.flow.create}
          onSubmit={save}
          loading={saving}
          submitTestID="flow-submit"
        />
      }
      testID="flow-sheet"
    >
      <View style={styles.summary} testID="flow-sheet-job-card">
        {thumb}
        <View style={styles.titles}>
          <N1Text weight="bold" numberOfLines={1}>
            {S.jobCardNumber(jobCard.code)}
          </N1Text>
          <N1Text variant="small" color="secondary" numberOfLines={1}>
            {jobTitle(jobCard) || COMMON_STRINGS.dash}
          </N1Text>
          <N1Text variant="caption" color="tertiary">
            {S.workOrder(jobCard.number)}
          </N1Text>
        </View>
        <PriorityBadge priority={jobCard.priority} />
      </View>
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
      <FlowEditor editor={editor} editing={editing} />
    </N1Modal>
  );
}
