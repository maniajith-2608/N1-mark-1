import { FormRow, N1DropDown, N1TextInput } from '../../../shared/components';
import type { FormErrors } from '../../../shared/hooks';
import {
  MACHINE_OPERATION_OPTIONS,
  MACHINE_SETTABLE_STATUS_OPTIONS,
  MACHINE_STATUS_OPTIONS,
  MACHINE_STRINGS,
  MACHINE_TYPE_OPTIONS,
} from '../constants';
import type { MachineInput } from '../types';

const F = MACHINE_STRINGS.form;

type Props = {
  values: MachineInput;
  errors: FormErrors<MachineInput>;
  bind: <K extends keyof MachineInput>(
    key: K,
  ) => (value: MachineInput[K]) => void;
  /** Machine details: fields stay locked until Edit is pressed. */
  locked?: boolean;
  /** Add machine: no status, since a new machine always starts idle. */
  isNew?: boolean;
};

/** The machine's fields, shared by Add machine and Machine details. */
export function MachineFields({
  values,
  errors,
  bind,
  locked = false,
  isNew = false,
}: Props) {
  // Locked fields hide placeholders and required marks; they only show data.
  const hint = (placeholder: string) => (locked ? undefined : placeholder);
  const running = values.status === 'running';
  return (
    <>
      <FormRow>
        <N1DropDown
          label={F.type}
          required={!locked}
          options={MACHINE_TYPE_OPTIONS}
          value={values.type}
          onChange={bind('type')}
          disabled={locked}
          testID="machine-form-type"
        />
        <N1DropDown
          label={F.operation}
          placeholder={hint(F.operationPlaceholder)}
          options={MACHINE_OPERATION_OPTIONS}
          value={values.operation || null}
          onChange={bind('operation')}
          disabled={locked}
          testID="machine-form-operation"
        />
      </FormRow>
      <FormRow>
        <N1TextInput
          label={F.code}
          required={!locked}
          placeholder={hint(F.codePlaceholder)}
          value={values.code}
          onChangeText={bind('code')}
          errorText={errors.code}
          autoCapitalize="characters"
          autoCorrect={false}
          readOnly={locked}
          testID="machine-form-code"
        />
        <N1TextInput
          label={F.model}
          placeholder={hint(F.modelPlaceholder)}
          value={values.model}
          onChangeText={bind('model')}
          readOnly={locked}
          testID="machine-form-model"
        />
      </FormRow>
      <FormRow>
        <N1TextInput
          label={F.location}
          required={!locked}
          placeholder={hint(F.locationPlaceholder)}
          value={values.location}
          onChangeText={bind('location')}
          errorText={errors.location}
          readOnly={locked}
          testID="machine-form-location"
        />
        {isNew ? null : (
          <N1DropDown
            label={F.status}
            options={
              running ? MACHINE_STATUS_OPTIONS : MACHINE_SETTABLE_STATUS_OPTIONS
            }
            value={values.status}
            onChange={bind('status')}
            disabled={locked || running}
            testID="machine-form-status"
          />
        )}
      </FormRow>
      <N1TextInput
        label={F.notes}
        placeholder={hint(F.notesPlaceholder)}
        // Locked and empty: say so instead of a blank box.
        value={locked && !values.notes ? F.noNotes : values.notes}
        onChangeText={bind('notes')}
        readOnly={locked}
        multiline
        testID="machine-form-notes"
      />
    </>
  );
}
