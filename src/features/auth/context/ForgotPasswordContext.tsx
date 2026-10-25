import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ForgotPasswordState = {
  /** Email the reset code was sent to. Empty when a step is opened directly. */
  email: string;
  setEmail: (email: string) => void;
  /** The verified code; POST /auth/reset needs it with the email. */
  code: string;
  setCode: (code: string) => void;
};

const ForgotPasswordContext = createContext<ForgotPasswordState | null>(null);

/**
 * Shares the email and code across the forgot password steps without putting them in
 * route params (which would show it in the web URL). Lives only as long as
 * the flow is mounted.
 */
export const ForgotPasswordProvider = React.memo(
  function ForgotPasswordProviderComponent({
    children,
  }: {
    children: ReactNode;
  }) {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const value = useMemo(
      () => ({ email, setEmail, code, setCode }),
      [email, code],
    );
    return (
      <ForgotPasswordContext.Provider value={value}>
        {children}
      </ForgotPasswordContext.Provider>
    );
  },
);
ForgotPasswordProvider.displayName = 'ForgotPasswordProvider';

export function useForgotPassword(): ForgotPasswordState {
  const state = useContext(ForgotPasswordContext);
  if (!state) {
    throw new Error(
      'useForgotPassword must be used inside ForgotPasswordProvider',
    );
  }
  return state;
}
