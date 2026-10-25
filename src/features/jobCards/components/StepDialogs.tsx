import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FormFooter,
  FormRow,
  N1DropDown,
  N1Modal,
  N1RadioGroup,
  N1Text,
  N1TextInput,
  type N1DropDownOption,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { useHeldWhileVisible, useOnSettled } from '../../../shared/hooks';
import { isBlank } from '../../../shared/utils';
import { useMachines } from '../../machines';
import { useOptionalEmployeeRole } from '../../profile/context/EmployeeRoleContext';
import { useUsers } from '../../userManagement';
import { JOB_CARD_STRINGS, PAUSE_REASON_OPTIONS } from '../constants';
import { useJobCardCommands, useJobCards } from '../hooks/useJobCards';
import type { JobCard, JobOperation, PauseReason, StepCounts } from '../types';

const D = JOB_CARD_STRINGS.details;

type DialogProps = {
  /** The step the dialog acts on; closed when null. */
  operation: JobOperation | null;
  jobCard: JobCard;
  onClose: () => void;
};

/** Closes the dialog once its own save lands (not on other card updates). */
function useCloseWhenSaved(onClose: () => void) {
  const commands = useJobCardCommands();
  const savingHere = useRef(false);
  useOnSettled(commands.saving, commands.saveError, () => {
    if (savingHere.current) {
      savingHere.current = false;
      onClose();
    }
  });
  const run: typeof commands.run = (id, command) => {
    savingHere.current = true;
    return commands.run(id, command);
  };
  return { ...commands, run };
}

type OperatorOption = N1DropDownOption<string>;

/** Admin: active operators from Users. */
function useAdminOperators(): OperatorOption[] {
  const { items } = useUsers();
  return useMemo(
    () =>
      items
        .filter(u => u.role === 'operator' && u.status === 'active')
        .map(u => ({ value: u.id, label: u.name })),
    [items],
  );
}

/**
 * Supervisor: the backend's people list is for admins only, so the choice
 * is the operators already working on the shop's job cards.
 */
function useShopFloorOperators(): OperatorOption[] {
  const { items } = useJobCards();
  return useMemo(() => {
    const seen = new Map<string, string>();
    items.forEach(c =>
      c.operations.forEach(op => {
        if (op.operatorId && op.operator) {
          seen.set(op.operatorId, op.operator);
        }
      }),
    );
    return [...seen]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);
}

function OperatorPicker({
  options,
  value,
  onChange,
  errorText,
}: {
  options: OperatorOption[];
  value: string;
  onChange: (id: string) => void;
  errorText?: string;
}) {
  const S = D.startStep;
  return (
    <N1DropDown
      label={S.operator}
      required
      placeholder={S.operatorPlaceholder}
      options={options}
      value={value || null}
      onChange={onChange}
      errorText={errorText}
      testID="start-step-operator"
    />
  );
}

const AdminOperatorPicker = (
  props: Omit<Parameters<typeof OperatorPicker>[0], 'options'>,
) => <OperatorPicker {...props} options={useAdminOperators()} />;

const ShopFloorOperatorPicker = (
  props: Omit<Parameters<typeof OperatorPicker>[0], 'options'>,
) => <OperatorPicker {...props} options={useShopFloorOperators()} />;

/**
 * Admin / supervisor: start (or redo) a step. It needs its operator and an
 * idle machine; the operator is assigned first when it changes.
 */
export function StartStepDialog({
  operation: current,
  jobCard,
  onClose,
}: DialogProps) {
  // Kept while the dialog fades out.
  const operation = useHeldWhileVisible(current !== null, current);
  const S = D.startStep;
  const role = useOptionalEmployeeRole();
  const { run, saving, saveError, clearErrors } = useCloseWhenSaved(onClose);
  const machines = useMachines();
  const [operatorId, setOperatorId] = useState('');
  const [machineId, setMachineId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (current) {
      setOperatorId(current.operatorId ?? '');
      setMachineId('');
      setSubmitted(false);
      clearErrors();
    }
  }, [current, clearErrors]);

  const idle = useMemo(
    () =>
      machines.items
        .filter(m => m.status === 'idle')
        .map(m => ({ value: m.id, label: `${m.name} · ${m.code}` })),
    [machines.items],
  );

  const submit = () => {
    setSubmitted(true);
    if (!operation || !operatorId || !machineId) {
      return;
    }
    run(jobCard.id, {
      type: 'start',
      operationId: operation.id,
      machineId,
      ...(operatorId !== operation.operatorId && { operatorId }),
    });
  };
  const picker = {
    value: operatorId,
    onChange: setOperatorId,
    errorText: submitted && !operatorId ? COMMON_STRINGS.required : undefined,
  };

  return (
    <N1Modal
      visible={current !== null}
      onClose={onClose}
      title={S.title(operation?.name ?? '')}
      subtitle={S.help}
      footer={
        <FormFooter
          onCancel={onClose}
          submitLabel={S.confirm}
          onSubmit={submit}
          loading={saving}
          submitTestID="start-step-submit"
        />
      }
      testID="start-step-dialog"
    >
      {role ? (
        <ShopFloorOperatorPicker {...picker} />
      ) : (
        <AdminOperatorPicker {...picker} />
      )}
      <N1DropDown
        label={S.machine}
        required
        placeholder={S.machinePlaceholder}
        options={idle}
        value={machineId || null}
        onChange={setMachineId}
        helperText={
          machines.status === 'succeeded' && !idle.length
            ? S.noMachines
            : undefined
        }
        errorText={
          submitted && !machineId ? COMMON_STRINGS.required : undefined
        }
        testID="start-step-machine"
      />
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </N1Modal>
  );
}

/** Pause the running step, with the reason the server asks for. */
export function PauseStepDialog({
  operation: current,
  jobCard,
  onClose,
}: DialogProps) {
  // Kept while the dialog fades out.
  const operation = useHeldWhileVisible(current !== null, current);
  const S = D.pauseStep;
  const { run, saving, saveError, clearErrors } = useCloseWhenSaved(onClose);
  const [reason, setReason] = useState<PauseReason | null>(null);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (current) {
      setReason(null);
      setNote('');
      setSubmitted(false);
      clearErrors();
    }
  }, [current, clearErrors]);

  // "Other" needs the details typed in.
  const noteMissing = reason === 'other' && isBlank(note);
  const submit = () => {
    setSubmitted(true);
    if (!operation || !reason || noteMissing) {
      return;
    }
    run(jobCard.id, {
      type: 'pause',
      operationId: operation.id,
      reason,
      note: note.trim(),
    });
  };

  return (
    <N1Modal
      visible={current !== null}
      onClose={onClose}
      title={S.title(operation?.name ?? '')}
      footer={
        <FormFooter
          onCancel={onClose}
          submitLabel={S.confirm}
          onSubmit={submit}
          loading={saving}
          submitTestID="pause-step-submit"
        />
      }
      testID="pause-step-dialog"
    >
      <N1RadioGroup
        label={S.reason}
        required
        direction="column"
        options={PAUSE_REASON_OPTIONS}
        value={reason}
        onChange={setReason}
        errorText={submitted && !reason ? COMMON_STRINGS.required : undefined}
      />
      <N1TextInput
        label={S.note}
        required={reason === 'other'}
        placeholder={S.notePlaceholder}
        value={note}
        onChangeText={setNote}
        multiline
        errorText={
          submitted && noteMissing ? COMMON_STRINGS.required : undefined
        }
        testID="pause-step-note"
      />
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </N1Modal>
  );
}

const COUNT_KEYS: (keyof StepCounts)[] = ['good', 'reject', 'rework', 'scrap'];

/**
 * Complete the running step: good, rejected, rework and scrap pieces, which
 * must add up to the quantity it started with. Good starts at all of them.
 */
export function CompleteStepDialog({
  operation: current,
  jobCard,
  onClose,
}: DialogProps) {
  // Kept while the dialog fades out.
  const operation = useHeldWhileVisible(current !== null, current);
  const S = D.completeStep;
  const { run, saving, saveError, clearErrors } = useCloseWhenSaved(onClose);
  const quantity = operation?.quantityStarted ?? jobCard.quantity;
  const [counts, setCounts] = useState<Record<keyof StepCounts, string>>({
    good: '',
    reject: '0',
    rework: '0',
    scrap: '0',
  });
  useEffect(() => {
    if (current) {
      setCounts({
        good: String(quantity),
        reject: '0',
        rework: '0',
        scrap: '0',
      });
      clearErrors();
    }
  }, [current, quantity, clearErrors]);

  const values = COUNT_KEYS.map(key => Number(counts[key] || 0));
  const valid = values.every(n => Number.isInteger(n) && n >= 0);
  const total = values.reduce((sum, n) => sum + n, 0);
  const mismatch = valid && total !== quantity;
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => setSubmitted(false), [current]);

  const submit = () => {
    setSubmitted(true);
    if (!operation || !valid || mismatch) {
      return;
    }
    const [good, reject, rework, scrap] = values;
    run(jobCard.id, {
      type: 'complete',
      operationId: operation.id,
      good,
      reject,
      rework,
      scrap,
    });
  };
  const field = (key: keyof StepCounts) => (
    <N1TextInput
      label={S[key]}
      value={counts[key]}
      onChangeText={value => setCounts(prev => ({ ...prev, [key]: value }))}
      keyboardType="number-pad"
      errorText={
        submitted && !Number.isInteger(Number(counts[key] || 0))
          ? COMMON_STRINGS.invalidNumber
          : undefined
      }
      testID={`complete-step-${key}`}
    />
  );

  return (
    <N1Modal
      visible={current !== null}
      onClose={onClose}
      title={S.title(operation?.name ?? '')}
      subtitle={S.help(quantity)}
      footer={
        <FormFooter
          onCancel={onClose}
          submitLabel={S.confirm}
          onSubmit={submit}
          loading={saving}
          submitTestID="complete-step-submit"
        />
      }
      testID="complete-step-dialog"
    >
      <FormRow>
        {field('good')}
        {field('reject')}
      </FormRow>
      <FormRow>
        {field('rework')}
        {field('scrap')}
      </FormRow>
      {submitted && mismatch && (
        <N1Text variant="small" color="danger" testID="complete-step-mismatch">
          {S.mismatch(total, quantity)}
        </N1Text>
      )}
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </N1Modal>
  );
}
