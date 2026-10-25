import type { N1DropDownOption, N1IconName } from '../../shared/components';
import { COMMON_STRINGS, INDIAN_STATES } from '../../shared/constants';
import type { FormErrors } from '../../shared/hooks';
import { isBlank, isEmail, isPhone, isPinCode } from '../../shared/utils';
import { INDUSTRY_OPTIONS } from '../auth/constants';
import type { Organization } from './types';

export const ORGANIZATION_STRINGS = {
  title: 'Organization details',
  code: 'Organization code',
  createdAt: 'Created on',
  open: (name: string) => `Open ${name} details`,
  edit: (section: string) => `Edit ${section.toLowerCase()}`,
  notSet: 'Not set',
  attached: 'Attached',
  upload: 'Upload',
  uploadHint: 'PNG or JPG, up to 2 MB',
  changeLogo: 'Change logo',
  completion: 'Profile completion',
  /** Phones: beside the organization code. */
  completionShort: (percent: number) => `${percent}% complete`,
  completionDone: 'All details added',
  completionLeft: 'Still to add',
  completionMissing: (count: number) =>
    `${count} ${count === 1 ? 'detail' : 'details'} to add`,
  yes: 'Yes',
  no: 'No',
  fields: {
    name: 'Organization name',
    logo: 'Logo',
    phone: 'Phone',
    email: 'Email',
    website: 'Website',
    businessType: 'Business type',
    industry: 'Industry',
    registrationDetails: 'Registration details',
    address: 'Address',
    city: 'City',
    state: 'State',
    pinCode: 'PIN code',
    country: 'Country',
    gstRegistered: 'GST registered',
    gstNumber: 'GSTIN',
    gstState: 'State',
    taxRates: 'Tax rates',
    invoicePrefix: 'Invoice prefix',
    invoiceStartNumber: 'Starting number',
    invoiceFooter: 'Invoice footer',
    invoiceLogo: 'Invoice logo',
    termsAndConditions: 'Terms & conditions',
    signature: 'Signature',
  },
  placeholders: {
    name: 'e.g. ABC Engineering Pvt Ltd',
    phone: 'e.g. +91 98765 43210',
    email: 'e.g. admin@company.com',
    website: 'e.g. www.company.com',
    businessType: 'Select business type',
    industry: 'Select industry',
    registrationDetails: 'e.g. CIN or Udyam registration number',
    address: 'Building, street, area',
    city: 'e.g. Chennai',
    state: 'Select state',
    pinCode: 'e.g. 600098',
    country: 'Select country',
    gstNumber: 'e.g. 33ABCDE1234F1Z5',
    invoicePrefix: 'e.g. INV-2026-',
    invoiceStartNumber: 'e.g. 1',
    invoiceFooter: 'e.g. Thank you for your business.',
    termsAndConditions: 'Payment terms, returns, warranty…',
  },
  help: {
    invoiceStartNumber: 'The next invoice will use this number.',
  },
  errors: {
    website: 'Enter a valid website, e.g. www.company.com',
    pinCode: 'Enter a 6-digit PIN code',
    invoiceStartNumber: 'Enter a whole number, 1 or more',
  },
} as const;

const F = ORGANIZATION_STRINGS.fields;

export const BUSINESS_TYPE_OPTIONS: N1DropDownOption<string>[] = [
  { label: 'Sole proprietorship', value: 'proprietorship' },
  { label: 'Partnership', value: 'partnership' },
  { label: 'LLP', value: 'llp' },
  { label: 'Private Limited', value: 'private-limited' },
  { label: 'Public Limited', value: 'public-limited' },
  { label: 'Other', value: 'other' },
];

export const STATE_OPTIONS: N1DropDownOption<string>[] = INDIAN_STATES.map(
  s => ({ label: s.name, value: s.name }),
);

/** Label for a dropdown value; the value itself when it isn't listed. */
export const optionLabel = (
  options: N1DropDownOption<string>[],
  value: string,
) => options.find(o => o.value === value)?.label ?? value;

export { INDUSTRY_OPTIONS };

/** The six groups on Organization details, each edited on its own. */
export type OrganizationSection =
  | 'general'
  | 'business'
  | 'address'
  | 'gst'
  | 'invoice'
  | 'documents';

export const ORGANIZATION_SECTIONS: {
  key: OrganizationSection;
  title: string;
  icon: N1IconName;
}[] = [
  { key: 'general', title: 'General', icon: 'building' },
  { key: 'business', title: 'Business details', icon: 'package' },
  { key: 'address', title: 'Address', icon: 'mail' },
  { key: 'gst', title: 'GST & tax', icon: 'receipt' },
  { key: 'invoice', title: 'Invoice settings', icon: 'file' },
  { key: 'documents', title: 'Document settings', icon: 'clipboard' },
];

// ---- Form ----

/**
 * Every editable field as the forms hold it: text stays text while typing
 * (the starting number too).
 */
export type OrganizationFormValues = Omit<
  Organization,
  'id' | 'code' | 'createdAt' | 'shortName' | 'invoiceStartNumber'
> & { invoiceStartNumber: string };

export const toFormValues = ({
  id: _id,
  code: _code,
  createdAt: _createdAt,
  shortName: _shortName,
  invoiceStartNumber,
  ...rest
}: Organization): OrganizationFormValues => ({
  ...rest,
  invoiceStartNumber: String(invoiceStartNumber),
});

/** The fields each section's form shows and saves. */
export const SECTION_FIELDS: Record<
  Exclude<OrganizationSection, 'gst'>,
  (keyof OrganizationFormValues)[]
> = {
  general: ['name', 'phone', 'email', 'website'],
  business: ['businessType', 'industry', 'registrationDetails'],
  address: ['address', 'city', 'state', 'pinCode', 'country'],
  invoice: ['invoicePrefix', 'invoiceStartNumber', 'invoiceFooter'],
  documents: ['invoiceLogo', 'termsAndConditions', 'signature'],
};

const WEBSITE_PATTERN = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i;

/** Errors for one section only, so other sections never block a save. */
export function validateSection(
  section: Exclude<OrganizationSection, 'gst'>,
  v: OrganizationFormValues,
): FormErrors<OrganizationFormValues> {
  const errors: FormErrors<OrganizationFormValues> = {};
  const R = COMMON_STRINGS.required;
  const E = ORGANIZATION_STRINGS.errors;
  if (section === 'general') {
    if (isBlank(v.name)) {
      errors.name = R;
    }
    if (isBlank(v.email)) {
      errors.email = R;
    } else if (!isEmail(v.email)) {
      errors.email = COMMON_STRINGS.invalidEmail;
    }
    if (!isBlank(v.phone) && !isPhone(v.phone)) {
      errors.phone = COMMON_STRINGS.invalidPhone;
    }
    if (!isBlank(v.website) && !WEBSITE_PATTERN.test(v.website.trim())) {
      errors.website = E.website;
    }
  }
  if (section === 'address') {
    // The backend saves the address whole: street, city, state and PIN.
    (['address', 'city', 'state'] as const).forEach(key => {
      if (isBlank(v[key])) {
        errors[key] = R;
      }
    });
    if (isBlank(v.pinCode)) {
      errors.pinCode = R;
    } else if (!isPinCode(v.pinCode)) {
      errors.pinCode = E.pinCode;
    }
  }
  if (section === 'invoice') {
    const n = Number(v.invoiceStartNumber);
    if (!Number.isInteger(n) || n < 1) {
      errors.invoiceStartNumber = E.invoiceStartNumber;
    }
  }
  return errors;
}

const trimmed = (value: string) => value.trim();

/** One section's changes, cleaned up for saving. */
export function sectionChanges(
  section: Exclude<OrganizationSection, 'gst'>,
  v: OrganizationFormValues,
): Partial<Organization> {
  switch (section) {
    case 'general':
      return {
        name: trimmed(v.name),
        phone: trimmed(v.phone),
        email: trimmed(v.email),
        website: trimmed(v.website),
      };
    case 'business':
      return {
        businessType: v.businessType,
        industry: v.industry,
        registrationDetails: trimmed(v.registrationDetails),
      };
    case 'address':
      return {
        address: trimmed(v.address),
        city: trimmed(v.city),
        state: v.state,
        pinCode: trimmed(v.pinCode),
        country: trimmed(v.country),
      };
    case 'invoice':
      return {
        invoicePrefix: trimmed(v.invoicePrefix),
        invoiceStartNumber: Number(v.invoiceStartNumber),
        invoiceFooter: trimmed(v.invoiceFooter),
      };
    case 'documents':
      return {
        invoiceLogo: v.invoiceLogo,
        termsAndConditions: trimmed(v.termsAndConditions),
        signature: v.signature,
      };
  }
}

/** "ABC Engineering Pvt Ltd" → "ABC Engineering" (for tight spaces). */
export const shortNameOf = (name: string) =>
  name
    .replace(/\s+(private limited|pvt\.? ltd\.?|ltd\.?|llp|inc\.?)$/i, '')
    .trim() || name;

export const fieldLabel = (key: keyof typeof F) => F[key];

// ---- Completion ----

const filled = (value: string) => !isBlank(value);

/**
 * What counts towards "Profile completion", per section. GST counts as done
 * when the organization isn't registered.
 */
const COMPLETION_CHECKS: Record<
  OrganizationSection,
  ((o: Organization) => boolean)[]
> = {
  general: [
    o => filled(o.name),
    o => o.logo !== null,
    o => filled(o.phone),
    o => filled(o.email),
    o => filled(o.website),
  ],
  business: [
    o => filled(o.businessType),
    o => filled(o.industry),
    o => filled(o.registrationDetails),
  ],
  address: [
    o => filled(o.address),
    o => filled(o.city),
    o => filled(o.state),
    o => filled(o.pinCode),
    o => filled(o.country),
  ],
  gst: [
    o => !o.gstRegistered || filled(o.gstNumber),
    o => !o.gstRegistered || o.defaultTaxRate !== null,
  ],
  invoice: [o => filled(o.invoicePrefix), o => filled(o.invoiceFooter)],
  documents: [
    o => o.invoiceLogo !== null,
    o => filled(o.termsAndConditions),
    o => o.signature !== null,
  ],
};

export type OrganizationCompletion = {
  /** 0–100, rounded. */
  percent: number;
  /** Details still to add, overall and per section. */
  missing: number;
  missingBySection: Record<OrganizationSection, number>;
};

export function organizationCompletion(
  o: Organization,
): OrganizationCompletion {
  let total = 0;
  let done = 0;
  const missingBySection = {} as Record<OrganizationSection, number>;
  for (const [section, checks] of Object.entries(COMPLETION_CHECKS)) {
    const passed = checks.filter(check => check(o)).length;
    total += checks.length;
    done += passed;
    missingBySection[section as OrganizationSection] = checks.length - passed;
  }
  return {
    percent: Math.round((done / total) * 100),
    missing: total - done,
    missingBySection,
  };
}
