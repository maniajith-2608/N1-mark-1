import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useN1Breakpoint } from '../../../shared/components';
import AuthLayout from '../components/AuthLayout';
import AuthMobileShell from '../components/AuthMobileShell';
import LoginForm from '../components/LoginForm';
import { ApiError } from '../../../services/api';
import { authApi } from '../api/authApi';
import { INVALID_CREDENTIALS_MESSAGE } from '../constants';
import { useAuthSession } from '../hooks';

function LoginScreen() {
  const { isCompact } = useN1Breakpoint();
  const navigation = useNavigation();
  const { signIn } = useAuthSession();

  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (email: string, password: string) => {
    setSubmitting(true);
    setError(undefined);
    try {
      const { role } = await authApi.login(email, password);
      // The root navigator swaps the login screens for this role's area.
      signIn(role);
    } catch (e) {
      // 401 is a wrong login; anything else (offline, rate limited) says why.
      setError(
        e instanceof ApiError && e.status === 401
          ? INVALID_CREDENTIALS_MESSAGE
          : e instanceof Error
          ? e.message
          : INVALID_CREDENTIALS_MESSAGE,
      );
      setSubmitting(false);
    }
  };

  const goToForgotPassword = () =>
    navigation.navigate('Auth', {
      screen: 'ForgotPasswordFlow',
      params: { screen: 'ForgotPassword' },
    });

  if (isCompact) {
    return (
      <AuthMobileShell
        title="Welcome back"
        subtitle="Log in to manage your organization and team."
      >
        <LoginForm
          errorText={error}
          submitting={submitting}
          onSubmit={handleSubmit}
          onForgotPassword={goToForgotPassword}
        />
      </AuthMobileShell>
    );
  }

  return (
    // No "Create organization" footer: shops are onboarded by the N1 team
    // (guide section 6, Rule), so the app offers sign-in only.
    <AuthLayout>
      <LoginForm
        title="Get Started"
        subtitle="Log in as a user or admin to view your dashboard."
        showBrand
        showRememberMe
        errorText={error}
        submitting={submitting}
        onSubmit={handleSubmit}
        onForgotPassword={goToForgotPassword}
      />
    </AuthLayout>
  );
}

export default React.memo(LoginScreen);
