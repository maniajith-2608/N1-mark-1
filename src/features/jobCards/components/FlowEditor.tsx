import { memo, useCallback, useState } from 'react';
import { View } from 'react-native';
import {
  N1DropDown,
  N1ProcessStep,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import {
  JOB_CARD_STRINGS,
  NEW_FLOW_STEPS,
  OPERATION_OPTIONS,
} from '../constants';
import type { JobCard, RouteStep } from '../types';
import {
  flowSteps,
  initialFlowSteps,
  stepStatus,
  type FlowStep,
} from '../utils';
import { DashedTile } from './DashedTile';

const F = JOB_CARD_STRINGS.flow;

const makeStyles = createN1Styles(t => ({
  section: { gap: t.spacing.lg },
  steps: { gap: t.spacing.md },
}));

let nextKey = 0;
const blankStep = (): FlowStep => {
  nextKey += 1;
  return { key: `added-${nextKey}`, name: '' };
};

/**
 * The draft steps of a flow being created or edited. `submit` returns the
 * changes to save, or null (and shows the errors) when a step is blank.
 */
export function useFlowEditor(jobCard: JobCard) {
  const [steps, setSteps] = useState(() =>
    initialFlowSteps(jobCard, NEW_FLOW_STEPS),
  );
  const [submitted, setSubmitted] = useState(false);

  const rename = useCallback(
    (key: string, name: string) =>
      setSteps(prev => prev.map(s => (s.key === key ? { ...s, name } : s))),
    [],
  );
  const remove = useCallback(
    (key: string) => setSteps(prev => prev.filter(s => s.key !== key)),
    [],
  );
  const add = useCallback(() => setSteps(prev => [...prev, blankStep()]), []);
  const submit = (): RouteStep[] | null => {
    setSubmitted(true);
    return steps.length && steps.every(s => s.name) ? flowSteps(steps) : null;
  };

  return { steps, submitted, rename, remove, add, submit };
}

export type FlowEditorState = ReturnType<typeof useFlowEditor>;

/**
 * Create flow (no route card yet) or Edit flow (completed steps locked): one
 * operation picker per step, and Add process.
 */
export const FlowEditor = memo(function FlowEditorComponent({
  editor,
  editing,
  showAdd = true,
}: {
  editor: FlowEditorState;
  /** Editing a saved flow, rather than creating the first one. */
  editing: boolean;
  /** False when Add process is shown elsewhere (pinned below the steps). */
  showAdd?: boolean;
}) {
  const styles = useN1Styles(makeStyles);
  const { steps, submitted, rename, remove, add } = editor;
  return (
    <View style={styles.section} testID="flow-editor">
      <N1Text variant="small" color="secondary">
        {editing ? F.editHelp : F.createHelp}
      </N1Text>
      <View style={styles.steps}>
        {steps.map((step, i) => {
          const stepState = stepStatus(step, editing);
          return (
            <N1ProcessStep
              key={step.key}
              number={i + 1}
              status={stepState}
              // Only steps not started yet can change (the server's rule).
              locked={stepState === 'completed' || stepState === 'current'}
              onRemove={() => remove(step.key)}
              testID={`flow-step-${i + 1}`}
            >
              <N1DropDown
                options={OPERATION_OPTIONS}
                value={step.name || null}
                onChange={name => rename(step.key, name)}
                placeholder={F.stepPlaceholder}
                disabled={stepState === 'completed' || stepState === 'current'}
                errorText={
                  submitted && !step.name ? COMMON_STRINGS.required : undefined
                }
                testID={`flow-step-${i + 1}-operation`}
              />
            </N1ProcessStep>
          );
        })}
      </View>
      {submitted && !steps.length && (
        <N1Text variant="small" color="danger">
          {F.noSteps}
        </N1Text>
      )}
      {showAdd && <AddProcessButton onPress={add} />}
    </View>
  );
});

/** Adds a blank step to the end of the flow. */
export const AddProcessButton = memo(function AddProcessButtonComponent({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <DashedTile
      icon="plus"
      label={F.addProcess}
      layout="row"
      onPress={onPress}
      testID="add-process"
    />
  );
});
