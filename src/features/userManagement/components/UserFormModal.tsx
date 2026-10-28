import { useCallback, useEffect, useMemo } from 'react';
import {
  N1Checklist,
  N1DropDown,
  N1Modal,
  N1Text,
  N1TextInput,
} from '../../../shared/components';
import { FormFooter, FormRow } from '../../../shared/components';
import {
  COMMON_STRINGS,
  NO_AUTOFILL_PASSWORD_PROPS,
  PASSWORD_MASK,
  PASSWORD_STRINGS,
} from '../../../shared/constants';
import {
  useForm,
  useHeldWhileVisible,
  useOnSettled,
  type FormErrors,
} from '../../../shared/hooks';
import {
  checkPassword,
  isBlank,
  isEmail,
  isPhone,
  isStrongPassword,
} from '../../../shared/utils';
import { ROLE_OPTIONS, STATUS_OPTIONS, USER_STRINGS } from '../constants';
import { useUsers } from '../hooks/useUsers';
import type { AdminUser, UserInput, UserRole, UserStatus } from '../types';

type FormValues = {
  name: string;
  designation: string;
  email: string;
  phone: string;
  password: string;
  /** Edit only: the new password typed again. */
  confirmPassword: string;
  role: UserRole;
  status: UserStatus;
};

const EMPTY: FormValues = {
  name: '',
  designation: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'operator',
  status: 'active',
};

const toValues = (user?: AdminUser | null): FormValues =>
  user
    ? {
        name: user.name,
        designation: user.designation,
        email: user.email,
        phone: user.phone,
        password: '',
        confirmPassword: '',
        role: user.role,
        status: user.status,
      }
    : EMPTY;

const F = USER_STRINGS.fields;

function makeValidator(isEdit: boolean) {
  return (v: FormValues): FormErrors<FormValues> => {
    const errors: FormErrors<FormValues> = {};
    if (isBlank(v.name)) {
      errors.name = COMMON_STRINGS.required;
    }
    if (!isBlank(v.email) && !isEmail(v.email)) {
      errors.email = COMMON_STRINGS.invalidEmail;
    }
    if (isBlank(v.phone)) {
      errors.phone = COMMON_STRINGS.required;
    } else if (!isPhone(v.phone)) {
      errors.phone = COMMON_STRINGS.invalidPhone;
    }
    if (isEdit) {
      // Both blank keeps the current password.
      if (v.password || v.confirmPassword) {
        const rules = checkPassword(v.password, v.confirmPassword);
        if (!rules.minLength || !rules.lettersAndNumbers) {
          errors.password = PASSWORD_STRINGS.rulesUnmet;
        } else if (!rules.matches) {
          errors.confirmPassword = PASSWORD_STRINGS.mismatch;
        }
      }
    } else if (isBlank(v.password)) {
      errors.password = COMMON_STRINGS.required;
    } else if (!isStrongPassword(v.password)) {
      errors.password = F.passwordWeak;
    }
    return errors;
  };
}

const createValidator = makeValidator(false);
const editValidator = makeValidator(true);

export type UserFormModalProps = {
  visible: boolean;
  /** Edit this user; omit to create a new one. */
  user?: AdminUser | null;
  organizationName: string;
  onClose: () => void;
};

/** Create user / Edit user dialog (full screen on phones). */
export function UserFormModal({
  visible,
  user: userProp,
  organizationName,
  onClose,
}: UserFormModalProps) {
  // Kept while the dialog fades out, so the title doesn't flip to Create.
  const user = useHeldWhileVisible(visible, userProp);
  const isEdit = Boolean(user);
  const { create, update, saving, saveError, clearErrors } = useUsers();
  const form = useForm<FormValues>(
    toValues(user),
    isEdit ? editValidator : createValidator,
  );
  const { reset } = form;

  // Refill the form each time it opens.
  useEffect(() => {
    if (visible) {
      reset(toValues(user));
      clearErrors();
    }
  }, [visible, user, reset, clearErrors]);

  useOnSettled(saving, saveError, onClose);

  const save = useCallback(
    ({ password, confirmPassword: _confirm, ...values }: FormValues) => {
      const input: UserInput = {
        ...values,
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        designation: values.designation.trim(),
        ...(isBlank(password) ? {} : { password }),
      };
      if (user) {
        update(user.id, input);
      } else {
        create(input);
      }
    },
    [user, create, update],
  );

  const { values, errors, bind } = form;
  const passwordRules = useMemo(() => {
    const r = checkPassword(values.password, values.confirmPassword);
    return [
      { label: PASSWORD_STRINGS.minLength, done: r.minLength },
      { label: PASSWORD_STRINGS.lettersAndNumbers, done: r.lettersAndNumbers },
      { label: PASSWORD_STRINGS.match, done: r.matches },
    ];
  }, [values.password, values.confirmPassword]);

  return (
    <N1Modal
      visible={visible}
      onClose={onClose}
      title={isEdit ? USER_STRINGS.editTitle : USER_STRINGS.createTitle}
      subtitle={
        isEdit
          ? USER_STRINGS.editSubtitle
          : USER_STRINGS.createSubtitle(organizationName)
      }
      footer={
        <FormFooter
          onCancel={onClose}
          submitLabel={isEdit ? COMMON_STRINGS.save : USER_STRINGS.createSubmit}
          onSubmit={form.submit(save)}
          loading={saving}
          submitTestID="user-form-submit"
        />
      }
      testID="user-form"
    >
      <N1TextInput
        label={F.name}
        required
        placeholder={F.namePlaceholder}
        value={values.name}
        onChangeText={bind('name')}
        errorText={errors.name}
        testID="user-form-name"
      />
      <N1TextInput
        label={F.designation}
        placeholder={F.designationPlaceholder}
        value={values.designation}
        onChangeText={bind('designation')}
      />
      <N1TextInput
        label={F.email}
        placeholder={F.emailPlaceholder}
        value={values.email}
        onChangeText={bind('email')}
        errorText={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        // Another person's email: don't offer the admin's saved login.
        autoComplete="off"
        testID="user-form-email"
      />
      <N1TextInput
        label={F.phone}
        required
        placeholder={F.phonePlaceholder}
        value={values.phone}
        onChangeText={bind('phone')}
        errorText={errors.phone}
        keyboardType="phone-pad"
        autoComplete="off"
        testID="user-form-phone"
      />
      {isEdit ? (
        <>
          <N1TextInput
            label={PASSWORD_STRINGS.current}
            value={PASSWORD_MASK}
            placeholder={PASSWORD_STRINGS.noPassword}
            readOnly
            autoComplete="off"
            testID="user-form-current-password"
          />
          <FormRow>
            <N1TextInput
              label={PASSWORD_STRINGS.newPassword}
              secure
              placeholder={PASSWORD_STRINGS.newPasswordPlaceholder}
              value={values.password}
              onChangeText={bind('password')}
              errorText={errors.password}
              {...NO_AUTOFILL_PASSWORD_PROPS}
              testID="user-form-password"
            />
            <N1TextInput
              label={PASSWORD_STRINGS.confirmPassword}
              secure
              placeholder={PASSWORD_STRINGS.confirmPasswordPlaceholder}
              value={values.confirmPassword}
              onChangeText={bind('confirmPassword')}
              errorText={errors.confirmPassword}
              {...NO_AUTOFILL_PASSWORD_PROPS}
              testID="user-form-confirm-password"
            />
          </FormRow>
          <N1Checklist items={passwordRules} />
          <N1Text variant="small" color="secondary">
            {F.passwordEditHelp}
          </N1Text>
        </>
      ) : (
        <N1TextInput
          label={F.password}
          required
          secure
          placeholder={F.passwordCreatePlaceholder}
          helperText={F.passwordCreateHelp}
          value={values.password}
          onChangeText={bind('password')}
          errorText={errors.password}
          autoCapitalize="none"
          // A password for someone else, not the admin's own saved one.
          autoComplete="new-password"
          testID="user-form-password"
        />
      )}
      <FormRow>
        <N1DropDown
          label={F.role}
          options={ROLE_OPTIONS}
          value={values.role}
          onChange={bind('role')}
        />
        <N1DropDown
          label={F.status}
          options={STATUS_OPTIONS}
          value={values.status}
          onChange={bind('status')}
        />
      </FormRow>
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </N1Modal>
  );
}
