import { useCallback, useEffect, useMemo } from 'react';
import { FormFooter, N1Modal, N1Text } from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import {
  useForm,
  useHeldWhileVisible,
  useOnSettled,
  type FormErrors,
} from '../../../shared/hooks';
import { isBlank } from '../../../shared/utils';
import { MACHINE_STRINGS } from '../constants';
import { useMachines } from '../hooks/useMachines';
import type { Machine, MachineInput } from '../types';
import { MachineFields } from './MachineFields';

const F = MACHINE_STRINGS.form;

const EMPTY: MachineInput = {
  name: '',
  code: '',
  model: '',
  type: 'cnc_lathe',
  location: '',
  status: 'idle',
  notes: '',
};

export const toMachineValues = (m?: Machine | null): MachineInput =>
  m
    ? {
        name: m.name,
        code: m.code,
        model: m.model,
        type: m.type,
        location: m.location,
        status: m.status,
        notes: m.notes,
      }
    : EMPTY;

const normaliseCode = (code: string) => code.trim().toUpperCase();

/** Trimmed form values, with the code upper-cased. */
export const trimMachine = (v: MachineInput): MachineInput => ({
  ...v,
  name: v.name.trim(),
  code: normaliseCode(v.code),
  model: v.model.trim(),
  location: v.location.trim(),
  notes: v.notes.trim(),
});

/** Required fields, plus machine codes must be unique. */
export function makeMachineValidator(
  machines: readonly Machine[],
  editingId?: string,
) {
  const taken = new Set(
    machines.filter(m => m.id !== editingId).map(m => normaliseCode(m.code)),
  );
  return (v: MachineInput): FormErrors<MachineInput> => {
    const errors: FormErrors<MachineInput> = {};
    if (isBlank(v.name)) {
      errors.name = COMMON_STRINGS.required;
    }
    if (isBlank(v.code)) {
      errors.code = COMMON_STRINGS.required;
    } else if (taken.has(normaliseCode(v.code))) {
      errors.code = F.codeTaken;
    }
    if (isBlank(v.location)) {
      errors.location = COMMON_STRINGS.required;
    }
    return errors;
  };
}

type Props = {
  visible: boolean;
  machine?: Machine | null;
  onClose: () => void;
};

/** Add machine / Edit machine dialog (full screen on phones). */
export function MachineFormModal({
  visible,
  machine: machineProp,
  onClose,
}: Props) {
  // Kept while the dialog fades out, so the title doesn't flip to Create.
  const machine = useHeldWhileVisible(visible, machineProp);
  const isEdit = Boolean(machine);
  const { items, create, update, saving, saveError, clearErrors } =
    useMachines();
  const validate = useMemo(
    () => makeMachineValidator(items, machine?.id),
    [items, machine?.id],
  );
  const form = useForm<MachineInput>(toMachineValues(machine), validate);
  const { reset, values, errors, bind } = form;

  useEffect(() => {
    if (visible) {
      reset(toMachineValues(machine));
      clearErrors();
    }
  }, [visible, machine, reset, clearErrors]);

  useOnSettled(saving, saveError, onClose);

  const save = useCallback(
    (v: MachineInput) =>
      machine ? update(machine.id, trimMachine(v)) : create(trimMachine(v)),
    [machine, create, update],
  );

  return (
    <N1Modal
      visible={visible}
      onClose={onClose}
      title={isEdit ? F.editTitle : F.addTitle}
      subtitle={isEdit ? F.editSubtitle(machine?.name ?? '') : F.addSubtitle}
      footer={
        <FormFooter
          onCancel={onClose}
          submitLabel={isEdit ? COMMON_STRINGS.save : F.submitAdd}
          onSubmit={form.submit(save)}
          loading={saving}
          submitTestID="machine-form-submit"
        />
      }
      testID="machine-form"
    >
      <MachineFields
        values={values}
        errors={errors}
        bind={bind}
        isNew={!isEdit}
      />
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </N1Modal>
  );
}
