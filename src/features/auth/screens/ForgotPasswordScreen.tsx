import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { N1Button, N1Text, N1TextInput } from '../../../shared/components';
import { errorMessage } from '../../../shared/store';
import { authApi } from '../api/authApi';
import AuthLayout from '../components/AuthLayout';
import AuthStep from '../components/AuthStep';
import { useForgotPassword } from '../context/ForgotPasswordContext';
import type {
  AuthStackParamList,
  ForgotPasswordStackParamList,
} from '../types';
import { isValidEmail } from '../utils';

function ForgotPasswordScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ForgotPasswordStackParamList>>();
  const { email: savedEmail, setEmail: saveEmail } = useForgotPassword();
  // Pre-filled when the user comes back via "Use a different email".
  const [email, setEmail] = useState(savedEmail);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const valid = isValidEmail(email);

  // popTo also works when this screen was opened straight from a link.
  const backToLogin = () =>
    navigation
      .getParent<NativeStackNavigationProp<AuthStackParamList>>()
      ?.popTo('Login');

  // POST /auth/forgot. It answers the same for an unknown email, so the
  // next step never reveals whether an account exists.
  const handleSendCode = async () => {
    setSubmitted(true);
    if (!valid || sending) {
      return;
    }
    setSending(true);
    setError(undefined);
    try {
      await authApi.forgotPassword(email.trim());
      saveEmail(email.trim());
      navigation.navigate('VerifyCode');
    } catch (e) {
      setError(errorMessage(e, 'Could not send the code. Try again.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthLayout>
      <AuthStep
        icon="lock"
        title="Forgot Password?"
        subtitle="Enter the email you use to log in and we'll send a 6-digit code to verify it's you."
        backLabel="Back to log in"
        onBack={backToLogin}
      >
        <N1TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          errorText={submitted && !valid ? 'Enter a valid email' : undefined}
          onSubmitEditing={handleSendCode}
        />
        {error ? (
          <N1Text variant="small" color="danger">
            {error}
          </N1Text>
        ) : null}
        <N1Button
          title="Send code"
          size="lg"
          fullWidth
          loading={sending}
          onPress={handleSendCode}
        />
      </AuthStep>
    </AuthLayout>
  );
}

export default React.memo(ForgotPasswordScreen);
