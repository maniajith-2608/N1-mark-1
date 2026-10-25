import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  N1Button,
  N1Checklist,
  N1Text,
  N1TextInput,
} from '../../../shared/components';
import { errorMessage } from '../../../shared/store';
import { authApi } from '../api/authApi';
import { useForgotPassword } from '../context/ForgotPasswordContext';
import AuthLayout from '../components/AuthLayout';
import AuthStep from '../components/AuthStep';
import type {
  AuthStackParamList,
  ForgotPasswordStackParamList,
} from '../types';
import { checkPassword, isPasswordValid, passwordChecklist } from '../utils';

function ResetPasswordScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ForgotPasswordStackParamList>>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const { email, code } = useForgotPassword();
  const rules = checkPassword(password, confirmPassword);

  // Leaves the whole forgot-password flow for Login in the auth stack.
  const backToLogin = () =>
    navigation
      .getParent<NativeStackNavigationProp<AuthStackParamList>>()
      ?.popTo('Login');

  // POST /auth/reset with the email and the verified code, then Login.
  const handleConfirm = async () => {
    setSubmitted(true);
    if (!isPasswordValid(rules) || saving) {
      return;
    }
    // Opened straight from a link: there is no code to reset with yet.
    if (!email || !code) {
      navigation.popTo('ForgotPassword');
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await authApi.resetPassword(email, code, password);
      backToLogin();
    } catch (e) {
      setError(errorMessage(e, 'Could not set the new password. Try again.'));
      setSaving(false);
    }
  };

  return (
    <AuthLayout>
      <AuthStep
        icon="lock-open"
        iconTone="success"
        title="Set New Password"
        subtitle="Code verified. Choose a new password for your account."
        backLabel="Back to log in"
        onBack={backToLogin}
      >
        <N1TextInput
          label="New password"
          secure
          value={password}
          onChangeText={setPassword}
          placeholder="Create a new password"
          autoComplete="new-password"
          textContentType="newPassword"
          errorText={
            submitted && !(rules.minLength && rules.lettersAndNumbers)
              ? 'Password does not meet the rules below'
              : undefined
          }
        />
        <N1TextInput
          label="Confirm password"
          secure
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
          autoComplete="new-password"
          textContentType="newPassword"
          errorText={
            submitted && !rules.matches ? 'Passwords do not match' : undefined
          }
        />
        <N1Checklist items={passwordChecklist(rules)} />
        {error ? (
          <N1Text variant="small" color="danger">
            {error}
          </N1Text>
        ) : null}
        <N1Button
          title="Confirm new password"
          size="lg"
          fullWidth
          loading={saving}
          onPress={handleConfirm}
        />
      </AuthStep>
    </AuthLayout>
  );
}

export default React.memo(ResetPasswordScreen);
