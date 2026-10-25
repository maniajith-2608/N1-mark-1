import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import {
  KeyboardScrollView,
  N1Badge,
  N1Button,
  N1Checklist,
  N1DropDown,
  N1Text,
  N1TextInput,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { isGstin, normalizeGstin } from '../../../shared/utils';
import { INDUSTRY_OPTIONS } from '../constants';
import { makeCreateOrganizationFormStyles } from '../styles';
import {
  checkPassword,
  generateOrganizationCode,
  isValidEmail,
  passwordChecklist,
} from '../utils';

export type CreateOrganizationValues = {
  name: string;
  code: string;
  industry: string;
  email: string;
  phone: string;
  /** GSTIN, upper-case; blank when the business isn't registered. */
  gstNumber: string;
  password: string;
};

type Props = {
  /**
   * Phone layout: one field per row, shorter intro copy, and the header and
   * submit button pinned while the fields scroll.
   */
  compact: boolean;
  /** Line under the fields on phones, e.g. "Already have an account? Log in". */
  footer?: ReactNode;
  onBack: () => void;
  onSubmit: (values: CreateOrganizationValues) => void;
};

function CreateOrganizationForm({ compact, footer, onBack, onSubmit }: Props) {
  const styles = useN1Styles(makeCreateOrganizationFormStyles);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Errors only show once the user has tried to submit.
  const [submitted, setSubmitted] = useState(false);

  const code = generateOrganizationCode(name);
  const rules = checkPassword(password, confirmPassword);
  const errors = {
    name: name.trim() ? undefined : 'Enter the organization name',
    industry: industry ? undefined : 'Select an industry',
    email: isValidEmail(email) ? undefined : 'Enter a valid email',
    phone: phone.trim() ? undefined : 'Enter a phone number',
    // Optional: not every business is GST-registered.
    gstNumber:
      !gstNumber.trim() || isGstin(gstNumber)
        ? undefined
        : COMMON_STRINGS.invalidGstin,
    password:
      rules.minLength && rules.lettersAndNumbers
        ? undefined
        : 'Password does not meet the rules below',
    confirmPassword: rules.matches ? undefined : 'Passwords do not match',
  };
  const shown = (error?: string) => (submitted ? error : undefined);

  const handleSubmit = () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || !industry) {
      return;
    }
    onSubmit({
      name: name.trim(),
      code,
      industry,
      email: email.trim(),
      phone: phone.trim(),
      gstNumber: normalizeGstin(gstNumber),
      password,
    });
  };

  // Two fields side by side on wide screens, stacked on phones.
  const rowStyle = compact ? styles.form : styles.row;
  const itemStyle = compact ? undefined : styles.rowItem;

  const header = (
    <View style={styles.header}>
      <N1Button
        title="Back to log in"
        variant="ghost"
        size="sm"
        leftIcon="chevron-left"
        onPress={onBack}
        style={styles.backButton}
      />
      <N1Text variant={compact ? 'h1' : 'display'}>Create Organization</N1Text>
      <N1Text color="secondary">
        {compact
          ? "You'll be the admin. "
          : "You'll be the admin of this organization. Fields marked "}
        <N1Text color="danger">*</N1Text>
        {compact ? ' required.' : ' are required.'}
      </N1Text>
    </View>
  );

  const fields = (
    <>
      <View style={rowStyle}>
        <N1TextInput
          label="Organization name"
          required
          value={name}
          onChangeText={setName}
          placeholder="ABC Engineering Pvt Ltd"
          autoCapitalize="words"
          errorText={shown(errors.name)}
          containerStyle={itemStyle}
        />
        <N1TextInput
          label="Organization code"
          readOnly
          value={code}
          placeholder="Generated from name"
          rightElement={<N1Badge label="Auto" tone="info" />}
          containerStyle={itemStyle}
        />
      </View>
      <View style={rowStyle}>
        <N1DropDown
          label="Industry"
          required
          options={INDUSTRY_OPTIONS}
          value={industry}
          onChange={setIndustry}
          placeholder="Select industry"
          errorText={shown(errors.industry)}
          containerStyle={itemStyle}
        />
        <N1TextInput
          label="Business email"
          required
          value={email}
          onChangeText={setEmail}
          placeholder="owner@abcengineering.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          errorText={shown(errors.email)}
          containerStyle={itemStyle}
        />
      </View>
      <View style={rowStyle}>
        <N1TextInput
          label="Phone number"
          required
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 98765 43210"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          errorText={shown(errors.phone)}
          containerStyle={itemStyle}
        />
        <N1TextInput
          label="GST number"
          value={gstNumber}
          onChangeText={setGstNumber}
          placeholder="e.g. 33ABCDE1234F1Z5"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={15}
          errorText={shown(errors.gstNumber)}
          containerStyle={itemStyle}
        />
      </View>
      <View style={rowStyle}>
        <N1TextInput
          label="Password"
          required
          secure
          value={password}
          onChangeText={setPassword}
          placeholder="Create a password"
          autoComplete="new-password"
          textContentType="newPassword"
          errorText={shown(errors.password)}
          containerStyle={itemStyle}
        />
        <N1TextInput
          label="Confirm password"
          required
          secure
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter password"
          autoComplete="new-password"
          textContentType="newPassword"
          errorText={shown(errors.confirmPassword)}
          containerStyle={itemStyle}
        />
      </View>
      <N1Checklist items={passwordChecklist(rules)} />
    </>
  );

  const submitButton = (
    <N1Button
      title="Create organization"
      size="lg"
      fullWidth
      onPress={handleSubmit}
    />
  );

  if (compact) {
    return (
      // The scroll view alone makes room for the keyboard (see
      // KeyboardScrollView); a KeyboardAvoidingView too would do it twice.
      <View style={styles.screen}>
        <View style={styles.stickyHeader}>{header}</View>
        <KeyboardScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {fields}
          {footer}
        </KeyboardScrollView>
        <View style={styles.stickyFooter}>{submitButton}</View>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      {header}
      {fields}
      {submitButton}
    </View>
  );
}

export default React.memo(CreateOrganizationForm);
