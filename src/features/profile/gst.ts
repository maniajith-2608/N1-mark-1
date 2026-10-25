import { COMMON_STRINGS, stateForGstin } from '../../shared/constants';
import type { FormErrors } from '../../shared/hooks';
import { isBlank, isGstin, normalizeGstin } from '../../shared/utils';
import type { Organization, TaxRate } from './types';

export const GST_STRINGS = {
  registration: 'GST registration',
  registered: 'GST registered',
  yes: 'Yes',
  no: 'No',
  gstin: 'GSTIN',
  gstinPlaceholder: 'e.g. 33ABCDE1234F1Z5',
  notApplied: 'GST will not be applied to invoices.',
  defaultRate: 'Default GST rate',
  defaultRatePlaceholder: 'Select default rate',
  defaultRateHelp:
    'This rate will be selected automatically when creating invoices.',
  configured: 'Configured tax rates',
  columns: {
    rate: 'Tax rate',
    cgst: 'CGST',
    sgst: 'SGST',
    igst: 'IGST',
    status: 'Status',
    action: 'Action',
  },
  active: 'Active',
  inactive: 'Inactive',
  addRate: 'Add Tax Rate',
  editRate: 'Edit Tax Rate',
  editRateA11y: (rate: string) => `Edit ${rate} tax rate`,
  rateField: 'GST rate',
  ratePlaceholder: 'e.g. 18',
  rateActive: 'Active',
  rateActiveHelp: 'Inactive rates can’t be picked on new invoices.',
  calculated: 'Calculated automatically from the GST rate.',
  saveRate: 'Save Tax Rate',
  howTitle: 'How GST is applied',
  howIntro:
    'Chosen automatically on each invoice from your state and the customer’s state.',
  intra: 'Intra-state customer (same state)',
  inter: 'Inter-state customer (different state)',
  example: (rate: string) => `Example: GST ${rate}`,
  errors: {
    gstState: 'The first two digits aren’t a valid state code',
    noActiveRate: 'Keep at least one active tax rate',
    defaultRate: 'Pick the default GST rate',
    rate: 'Enter a rate between 0 and 100, up to 2 decimals',
    duplicateRate: 'This rate is already configured',
  },
} as const;

const S = GST_STRINGS;

/** What the GST & Tax Settings modal edits. */
export type GstSettings = Pick<
  Organization,
  'gstRegistered' | 'gstNumber' | 'gstState' | 'taxRates' | 'defaultTaxRate'
>;

export const toGstSettings = (o: Organization): GstSettings => ({
  gstRegistered: o.gstRegistered,
  gstNumber: o.gstNumber,
  gstState: o.gstState,
  taxRates: o.taxRates,
  defaultTaxRate: o.defaultTaxRate,
});

/** Active rates, lowest first. */
export const activeTaxRates = (rates: readonly TaxRate[]) =>
  rates
    .filter(r => r.active)
    .map(r => r.rate)
    .sort((a, b) => a - b);

export function validateGstSettings(v: GstSettings): FormErrors<GstSettings> {
  const errors: FormErrors<GstSettings> = {};
  if (!v.gstRegistered) {
    return errors;
  }
  if (isBlank(v.gstNumber)) {
    errors.gstNumber = COMMON_STRINGS.required;
  } else if (!isGstin(v.gstNumber)) {
    errors.gstNumber = COMMON_STRINGS.invalidGstin;
  } else if (!stateForGstin(normalizeGstin(v.gstNumber))) {
    errors.gstNumber = S.errors.gstState;
  }
  const active = activeTaxRates(v.taxRates);
  if (!active.length) {
    errors.taxRates = S.errors.noActiveRate;
  } else if (v.defaultTaxRate === null || !active.includes(v.defaultTaxRate)) {
    errors.defaultTaxRate = S.errors.defaultRate;
  }
  return errors;
}

/**
 * The settings as saved. The GST state comes from the GSTIN's first two
 * digits. Not registered: the GSTIN and its state are cleared (the configured
 * rates are kept for when GST is switched on again).
 */
export function gstSettingsChanges(v: GstSettings): GstSettings {
  const taxRates = [...v.taxRates].sort((a, b) => a.rate - b.rate);
  return v.gstRegistered
    ? {
        gstRegistered: true,
        gstNumber: normalizeGstin(v.gstNumber),
        gstState: stateForGstin(normalizeGstin(v.gstNumber)),
        taxRates,
        defaultTaxRate: v.defaultTaxRate,
      }
    : {
        gstRegistered: false,
        gstNumber: '',
        gstState: '',
        taxRates,
        defaultTaxRate: v.defaultTaxRate,
      };
}

const RATE_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

/** The error for a typed GST rate, if any. */
export function validateTaxRate(
  text: string,
  rates: readonly TaxRate[],
  editingId?: string,
): string | undefined {
  const value = text.trim();
  const rate = Number(value);
  if (!RATE_PATTERN.test(value) || rate > 100) {
    return S.errors.rate;
  }
  if (rates.some(r => r.rate === rate && r.id !== editingId)) {
    return S.errors.duplicateRate;
  }
  return undefined;
}

/** A new rate's id: the backend keeps rate ids as UUIDs (v4 here). */
export const newTaxRateId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const n = Math.floor(Math.random() * 16);
    // "y" is the variant digit: 8, 9, a or b.
    return (c === 'x' ? n : 8 + (n % 4)).toString(16);
  });
