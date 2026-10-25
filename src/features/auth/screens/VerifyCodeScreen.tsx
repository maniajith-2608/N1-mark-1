import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { N1Button, N1Text, useN1Styles } from '../../../shared/components';
import { errorMessage } from '../../../shared/store';
import { authApi } from '../api/authApi';
import AuthLayout from '../components/AuthLayout';
import AuthPrompt from '../components/AuthPrompt';
import AuthStep from '../components/AuthStep';
import CodeInput from '../components/CodeInput';
import { VERIFICATION_CODE_LENGTH } from '../constants';
import { useForgotPassword } from '../context/ForgotPasswordContext';
import type { ForgotPasswordStackParamList } from '../types';
import { makeVerifyCodeScreenStyles } from '../styles';
import { isCompleteCode } from '../utils';

function VerifyCodeScreen() {
  const styles = useN1Styles(makeVerifyCodeScreenStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<ForgotPasswordStackParamList>>();
  const { email, setCode: saveCode } = useForgotPassword();
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resent, setResent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string>();
  const complete = isCompleteCode(code);

  // popTo also works when this screen was opened straight from a link.
  const backToEmail = () => navigation.popTo('ForgotPassword');

  // POST /auth/verify-code checks it; Reset password sends it again.
  const handleVerify = async () => {
    setSubmitted(true);
    if (!complete || verifying) {
      return;
    }
    setVerifying(true);
    setError(undefined);
    try {
      await authApi.verifyResetCode(email, code);
      saveCode(code);
      navigation.navigate('ResetPassword');
    } catch (e) {
      setError(errorMessage(e, 'Could not check the code. Try again.'));
    } finally {
      setVerifying(false);
    }
  };

  // Resend is POST /auth/forgot again: a new code replaces the old one.
  const handleResend = async () => {
    setCode('');
    setSubmitted(false);
    setResent(false);
    setError(undefined);
    try {
      await authApi.forgotPassword(email);
      setResent(true);
    } catch (e) {
      setError(errorMessage(e, 'Could not send a new code. Try again.'));
    }
  };

  return (
    <AuthLayout>
      <AuthStep
        icon="mail"
        title="Enter Code"
        subtitle={
          <>
            {`We sent a ${VERIFICATION_CODE_LENGTH}-digit code to `}
            <N1Text weight="bold">{email || 'your email'}</N1Text>.
          </>
        }
        backLabel="Back"
        onBack={backToEmail}
      >
        <CodeInput
          value={code}
          onChange={setCode}
          error={submitted && !complete}
          autoFocus
        />
        {submitted && !complete ? (
          <N1Text variant="small" color="danger">
            Enter the {VERIFICATION_CODE_LENGTH}-digit code
          </N1Text>
        ) : null}
        {error ? (
          <N1Text variant="small" color="danger">
            {error}
          </N1Text>
        ) : null}
        {resent ? (
          <N1Text variant="small" color="success">
            A new code is on its way.
          </N1Text>
        ) : null}
        <N1Button
          title="Verify code"
          size="lg"
          fullWidth
          loading={verifying}
          onPress={handleVerify}
        />
        <View style={styles.footer}>
          <AuthPrompt
            question="Didn't get it?"
            action="Resend code"
            onPress={handleResend}
          />
          <N1Button
            title="Use a different email"
            variant="link"
            size="sm"
            onPress={backToEmail}
            style={styles.centred}
          />
        </View>
      </AuthStep>
    </AuthLayout>
  );
}

export default React.memo(VerifyCodeScreen);
