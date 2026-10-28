import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useN1Breakpoint, useN1Styles } from '../../../shared/components';
import AuthLayout from '../components/AuthLayout';
import AuthPrompt from '../components/AuthPrompt';
import CreateOrganizationForm, {
  type CreateOrganizationValues,
} from '../components/CreateOrganizationForm';
import { makeAuthLayoutStyles } from '../styles';
import { authApi } from '../api/authApi';
import { useAuthSession } from '../hooks';

function CreateOrganizationScreen() {
  const styles = useN1Styles(makeAuthLayoutStyles);
  const { isCompact } = useN1Breakpoint();
  const navigation = useNavigation();
  const { signIn } = useAuthSession();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  // Opened straight from a link there is no Login behind this screen to go back to.
  const goToLogin = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Auth', { screen: 'Login' });
    }
  };

  const handleSubmit = async (values: CreateOrganizationValues) => {
    setSubmitting(true);
    setError(undefined);
    try {
      const { role } = await authApi.createOrganization(values);
      // Signed in as the new owner: the root navigator swaps in their area.
      signIn(role);
    } catch (e) {
      // The backend's own message: already registered, invalid GSTIN,
      // too many attempts, signup off.
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  };

  const loginPrompt = (
    <AuthPrompt
      question="Already have an account?"
      action="Log in"
      onPress={goToLogin}
    />
  );

  // Phones: the form pins its own header and button, so it skips the
  // scrolling auth layout.
  if (isCompact) {
    return (
      <SafeAreaView style={styles.compactSafeArea}>
        <CreateOrganizationForm
          compact
          footer={loginPrompt}
          errorText={error}
          submitting={submitting}
          onBack={goToLogin}
          onSubmit={handleSubmit}
        />
      </SafeAreaView>
    );
  }

  return (
    <AuthLayout wide fixed>
      <CreateOrganizationForm
        compact={false}
        footer={loginPrompt}
        errorText={error}
        submitting={submitting}
        onBack={goToLogin}
        onSubmit={handleSubmit}
      />
    </AuthLayout>
  );
}

export default React.memo(CreateOrganizationScreen);
