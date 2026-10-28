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
import { isGstin, isPinCode, normalizeGstin } from '../../../shared/utils';
import {
  DEFAULT_INDUSTRY,
  INDUSTRY_OPTIONS,
  STATE_OPTIONS,
} from '../constants';
import { makeCreateOrganizationFormStyles } from '../styles';
import type { CreateOrganizationValues } from '../types';
import {
  checkPassword,
  generateOrganizationCode,
  isValidEmail,
  passwordChecklist,
  randomCodeSuffix,
} from '../utils';

export type { CreateOrganizationValues };

type Props = {
  /**
   * Phone layout: one field per row, shorter intro copy, and the header and
   * submit button pinned while the fields scroll.
   */
  compact: boolean;
  /**
   * "Already have an account? Log in": under the fields on phones, under the
   * pinned button on wider screens.
   */
  footer?: ReactNode;
  /** Why the server refused the last submit, shown above the button. */
  errorText?: string;
  submitting?: boolean;
  onBack: () => void;
  onSubmit: (values: CreateOrganizationValues) => void;
};

function CreateOrganizationForm({
  compact,
  footer,
  errorText,
  submitting = false,
  onBack,
  onSubmit,
}: Props) {
  const styles = useN1Styles(makeCreateOrganizationFormStyles);
  const [yourName, setYourName] = useState('');
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState<string | null>(DEFAULT_INDUSTRY);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState<string | null>(null);
  const [pinCode, setPinCode] = useState('');
  // Errors only show once the user has tried to submit.
  const [submitted, setSubmitted] = useState(false);

  // Picked once, so the code doesn't change with every letter typed.
  const [codeSuffix] = useState(randomCodeSuffix);
  const code = generateOrganizationCode(name, codeSuffix);
  const rules = checkPassword(password, confirmPassword);
  const errors = {
    yourName: yourName.trim() ? undefined : 'Enter your name',
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
    addressLine1: addressLine1.trim() ? undefined : 'Enter the address',
    city: city.trim() ? undefined : 'Enter the city',
    state: state ? undefined : 'Select a state',
    pinCode: isPinCode(pinCode) ? undefined : 'Enter a 6-digit PIN code',
  };
  const shown = (error?: string) => (submitted ? error : undefined);

  const handleSubmit = () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || !industry || !state) {
      return;
    }
    onSubmit({
      yourName: yourName.trim(),
      name: name.trim(),
      code,
      industry,
      email: email.trim(),
      phone: phone.trim(),
      gstNumber: normalizeGstin(gstNumber),
      password,
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city: city.trim(),
      state,
      pinCode: pinCode.trim(),
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
          label="Your name"
          required
          value={yourName}
          onChangeText={setYourName}
          placeholder="Your full name"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          errorText={shown(errors.yourName)}
          containerStyle={itemStyle}
        />
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
      </View>
      <View style={rowStyle}>
        <N1TextInput
          label="Organization code"
          readOnly
          value={code}
          placeholder="Generated from name"
          rightElement={<N1Badge label="Auto" tone="info" />}
          containerStyle={itemStyle}
        />
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
      </View>
      <View style={rowStyle}>
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
      </View>
      <View style={rowStyle}>
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
        <N1TextInput
          label="Address line 1"
          required
          value={addressLine1}
          onChangeText={setAddressLine1}
          placeholder="Building, street"
          autoComplete="address-line1"
          textContentType="streetAddressLine1"
          errorText={shown(errors.addressLine1)}
          containerStyle={itemStyle}
        />
      </View>
      <View style={rowStyle}>
        <N1TextInput
          label="Address line 2"
          value={addressLine2}
          onChangeText={setAddressLine2}
          placeholder="Area, landmark"
          autoComplete="address-line2"
          textContentType="streetAddressLine2"
          containerStyle={itemStyle}
        />
        <N1TextInput
          label="City"
          required
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Chennai"
          autoCapitalize="words"
          textContentType="addressCity"
          errorText={shown(errors.city)}
          containerStyle={itemStyle}
        />
      </View>
      <View style={rowStyle}>
        <N1DropDown
          label="State"
          required
          options={STATE_OPTIONS}
          value={state}
          onChange={setState}
          placeholder="Select state"
          errorText={shown(errors.state)}
          containerStyle={itemStyle}
        />
        <N1TextInput
          label="PIN code"
          required
          value={pinCode}
          onChangeText={setPinCode}
          placeholder="e.g. 600001"
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="postal-code"
          textContentType="postalCode"
          errorText={shown(errors.pinCode)}
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
      {errorText ? (
        <N1Text variant="small" color="danger">
          {errorText}
        </N1Text>
      ) : null}
    </>
  );

  const submitButton = (
    <N1Button
      title="Create organization"
      size="lg"
      fullWidth
      loading={submitting}
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

  // Tablet / desktop: header and button stay put while the fields scroll.
  return (
    <View style={styles.wideScreen}>
      {header}
      <KeyboardScrollView
        style={styles.wideScroll}
        contentContainerStyle={styles.wideScrollContent}
      >
        {fields}
      </KeyboardScrollView>
      {submitButton}
      {footer}
    </View>
  );
}

export default React.memo(CreateOrganizationForm);
