import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  FormRow,
  FormScope,
  N1Button,
  N1Checklist,
  N1Text,
  N1TextInput,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import {
  COMMON_STRINGS,
  NO_AUTOFILL_PASSWORD_PROPS,
  PASSWORD_MASK,
  PASSWORD_STRINGS as P,
} from '../../../shared/constants';
import { useForm, useOnSettled, type FormErrors } from '../../../shared/hooks';
import { checkPassword, isBlank } from '../../../shared/utils';
import { PROFILE_STRINGS as S } from '../constants';
import { useSession } from '../hooks/useSession';

type Values = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY: Values = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const validate = (v: Values): FormErrors<Values> => {
  const errors: FormErrors<Values> = {};
  if (isBlank(v.currentPassword)) {
    errors.currentPassword = COMMON_STRINGS.required;
  }
  const rules = checkPassword(v.newPassword, v.confirmPassword);
  if (!rules.minLength || !rules.lettersAndNumbers) {
    errors.newPassword = P.rulesUnmet;
  } else if (!rules.matches) {
    errors.confirmPassword = P.match;
  }
  return errors;
};

const makeStyles = createN1Styles(t => ({
  panel: { gap: t.spacing.lg },
  fields: { gap: t.spacing.lg },
  footer: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
}));

const TEST_ID = 'password-form';

/**
 * My profile → Security. The current password shows as set (dots), locked;
 * Update password asks for it (changeMyPassword checks it) and the new one
 * with its confirmation. An admin resets someone else's from User details.
 */
export function ChangePasswordForm() {
  const styles = useN1Styles(makeStyles);
  const { profile, changePassword, changingPassword, passwordError } =
    useSession();
  const hasPassword = profile?.hasPassword ?? false;
  const [choosing, setChoosing] = useState(false);
  const [changed, setChanged] = useState(false);
  const form = useForm<Values>(EMPTY, validate);
  const { reset, values, errors, bind } = form;

  const start = useCallback(() => {
    setChanged(false);
    setChoosing(true);
  }, []);
  const cancel = useCallback(() => {
    reset(EMPTY);
    setChoosing(false);
  }, [reset]);

  // Saved: locked again, cleared, and say so.
  useOnSettled(changingPassword, passwordError, () => {
    if (choosing) {
      reset(EMPTY);
      setChoosing(false);
      setChanged(true);
    }
  });

  const rules = useMemo(() => {
    const r = checkPassword(values.newPassword, values.confirmPassword);
    return [
      { label: P.minLength, done: r.minLength },
      { label: P.lettersAndNumbers, done: r.lettersAndNumbers },
      { label: P.match, done: r.matches },
    ];
  }, [values.newPassword, values.confirmPassword]);

  const save = useCallback(
    (v: Values) =>
      changePassword({
        currentPassword: v.currentPassword,
        newPassword: v.newPassword,
      }),
    [changePassword],
  );

  return (
    <View style={styles.panel} testID={TEST_ID}>
      <View>
        <N1Text variant="h3">{S.passwordTitle}</N1Text>
        <N1Text variant="small" color="secondary">
          {S.passwordSubtitle}
        </N1Text>
      </View>
      {choosing ? (
        // Its own form on web, so Chrome never fills the menu search.
        <FormScope>
          <View style={styles.fields}>
            <N1TextInput
              label={S.currentPassword}
              secure
              placeholder={S.currentPasswordPlaceholder}
              value={values.currentPassword}
              onChangeText={bind('currentPassword')}
              errorText={errors.currentPassword}
              autoComplete="current-password"
              textContentType="password"
              autoCapitalize="none"
              testID={`${TEST_ID}-current`}
            />
            <FormRow>
              <N1TextInput
                label={P.newPassword}
                secure
                placeholder={P.newPasswordPlaceholder}
                value={values.newPassword}
                onChangeText={bind('newPassword')}
                errorText={errors.newPassword}
                {...NO_AUTOFILL_PASSWORD_PROPS}
              />
              <N1TextInput
                label={P.confirmPassword}
                secure
                placeholder={P.confirmPasswordPlaceholder}
                value={values.confirmPassword}
                onChangeText={bind('confirmPassword')}
                errorText={errors.confirmPassword}
                {...NO_AUTOFILL_PASSWORD_PROPS}
              />
            </FormRow>
            <N1Checklist items={rules} />
          </View>
        </FormScope>
      ) : (
        <N1TextInput
          label={P.current}
          value={hasPassword ? PASSWORD_MASK : ''}
          placeholder={P.noPassword}
          readOnly
          autoComplete="off"
          testID={`${TEST_ID}-current`}
        />
      )}
      {choosing && passwordError && (
        <N1Text variant="small" color="danger">
          {passwordError}
        </N1Text>
      )}
      <View style={styles.footer}>
        {choosing ? (
          <>
            <N1Button
              title={COMMON_STRINGS.cancel}
              variant="secondary"
              size="sm"
              disabled={changingPassword}
              onPress={cancel}
              testID={`${TEST_ID}-cancel`}
            />
            <N1Button
              title={P.save}
              size="sm"
              loading={changingPassword}
              onPress={form.submit(save)}
              testID={`${TEST_ID}-submit`}
            />
          </>
        ) : (
          <N1Button
            title={hasPassword ? P.update : P.set}
            size="sm"
            onPress={start}
            testID={`${TEST_ID}-start`}
          />
        )}
        {changed && (
          <N1Text variant="small" color="success" testID={`${TEST_ID}-changed`}>
            {P.updated}
          </N1Text>
        )}
      </View>
    </View>
  );
}
