import { type ReactTestInstance } from 'react-test-renderer';
import {
  allText,
  byTestId,
  byText,
  choose,
  hasTestId,
  press,
  renderAdmin,
  typeInto,
} from '../../../shared/testing/testUtils';
import { MOCK_SESSION } from '../api/mockData';
import { profileApi } from '../api/mockProfileApi';
import { organizationCompletion } from '../organization';

// The organization name sits in the wide top bar.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 1280, height: 900, scale: 1, fontScale: 1 }),
}));

const SECTION_KEYS = [
  'general',
  'business',
  'address',
  'gst',
  'invoice',
  'documents',
];

/** Opens a section's tab, then its edit form. */
const editSection = async (root: ReactTestInstance, key: string) => {
  await press(byTestId(root, `organization-tab-${key}`));
  await press(byTestId(root, `edit-organization-${key}`));
};

/** The screen's text plus what its (locked) fields hold. */
const screenText = (root: ReactTestInstance) => {
  const screen = byTestId(root, 'organization-screen');
  const values = screen
    .findAll(n => typeof n.type === 'string' && n.props.value !== undefined)
    .map(n => String(n.props.value));
  return [allText(screen), ...values].join('|');
};

/** The screen's text across every tab, one tab at a time. */
const allTabsText = async (root: ReactTestInstance) => {
  let text = '';
  for (const key of SECTION_KEYS) {
    await press(byTestId(root, `organization-tab-${key}`));
    text += screenText(root);
  }
  return text;
};

test('the organization name opens the organization details', async () => {
  const h = await renderAdmin('Overview');
  await press(byTestId(h.root, 'open-organization'));

  expect(h.currentRoute()).toBe('Organization');
  const text = await allTabsText(h.root);
  for (const value of [
    'ABC Engineering Pvt Ltd',
    'ABC001',
    'Manufacturing',
    'admin@abcengineering.com',
    '+91 44 4000 1000',
    '33ABCDE1234F1Z5',
    'Sep 12, 2026',
  ]) {
    expect(text).toContain(value);
  }
});

test('while the session loads (or fails) the card and menu stay; only the form area shows it', async () => {
  const fetchSession = jest
    .spyOn(profileApi, 'fetchSession')
    .mockRejectedValue(new Error('Network down'));
  let h: Awaited<ReturnType<typeof renderAdmin>>;
  try {
    h = await renderAdmin('Organization');
    const screen = byTestId(h.root, 'organization-screen');
    expect(hasTestId(screen, 'organization-tab-general')).toBe(true);
    const form = byTestId(h.root, 'organization-general');
    expect(hasTestId(form, 'async-error')).toBe(true);
    expect(allText(form)).toContain('Network down');
  } finally {
    fetchSession.mockRestore();
  }

  await press(byText(byTestId(h.root, 'organization-general'), 'Try again'));
  expect(byTestId(h.root, 'organization-form-name').props.value).toBe(
    'ABC Engineering Pvt Ltd',
  );
});

describe('organization sections', () => {
  const openOrganization = async () => {
    const h = await renderAdmin('Overview');
    await press(byTestId(h.root, 'open-organization'));
    return h;
  };
  const org = (h: Awaited<ReturnType<typeof renderAdmin>>) =>
    h.store.getState().profile.organization!;

  test('one tab at a time, General first', async () => {
    const h = await openOrganization();
    const screen = () => screenText(h.root);
    expect(screen()).toContain('www.abcengineering.com');
    expect(screen()).not.toContain('600098');
    expect(() => byTestId(h.root, 'organization-address')).toThrow();

    await press(byTestId(h.root, 'organization-tab-address'));
    expect(screen()).toContain('600098');
    expect(screen()).not.toContain('www.abcengineering.com');
    expect(() => byTestId(h.root, 'organization-general')).toThrow();
  });

  test('shows all six sections', async () => {
    const h = await openOrganization();
    const text = await allTabsText(h.root);
    for (const value of [
      'General',
      'Business details',
      'Address',
      'GST & tax',
      'Invoice settings',
      'Document settings',
      'www.abcengineering.com',
      'Private Limited',
      'CIN U28910TN2018PTC123456',
      'Chennai',
      '600098',
      '33ABCDE1234F1Z5',
      '18%',
      'INV-2026-',
      'Thank you for your business.',
    ]) {
      expect(text).toContain(value);
    }
  });

  test('general: saves name, phone, email and website', async () => {
    const h = await openOrganization();
    // Locked until Edit; Edit swaps in Cancel / Save.
    expect(byTestId(h.root, 'organization-form-name').props.editable).toBe(
      false,
    );
    expect(hasTestId(h.root, 'organization-form-submit')).toBe(false);
    await editSection(h.root, 'general');
    expect(byTestId(h.root, 'organization-form-name').props.editable).toBe(
      true,
    );

    await typeInto(
      byTestId(h.root, 'organization-form-name'),
      'ABC Precision Ltd',
    );
    // The logo isn't part of the form any more.
    expect(hasTestId(h.root, 'organization-form-logo')).toBe(false);
    await typeInto(byTestId(h.root, 'organization-form-website'), 'abc.in');
    await press(byTestId(h.root, 'organization-form-submit'));

    expect(org(h)).toMatchObject({
      name: 'ABC Precision Ltd',
      shortName: 'ABC Precision',
      website: 'abc.in',
      // Untouched sections keep their values.
      city: 'Chennai',
    });
    expect(allText(byTestId(h.root, 'open-organization'))).toBe(
      'ABC Precision Ltd',
    );
  });

  test('pressing the avatar picks a logo and saves it straight away', async () => {
    const h = await openOrganization();
    expect(org(h).logo).toBeNull();
    await press(byTestId(h.root, 'organization-hero-avatar'));
    expect(org(h).logo).toEqual(expect.objectContaining({ name: 'logo.png' }));
    // No Edit needed, and the fields stay locked.
    expect(byTestId(h.root, 'organization-form-name').props.editable).toBe(
      false,
    );
  });

  test('profile completion: percentage, details left and per-section counts', async () => {
    const h = await openOrganization();
    const completion = () =>
      allText(byTestId(h.root, 'organization-completion'));
    const badge = (key: string) =>
      allText(byTestId(h.root, `organization-tab-${key}`));
    // Logo, invoice logo and signature are missing: 17 of 20.
    expect(completion()).toContain('85%');
    expect(completion()).toContain('3 details to add');
    expect(badge('general')).toBe('General|1');
    expect(badge('documents')).toBe('Document settings|2');
    expect(badge('address')).toBe('Address');

    // Adding the logo updates it straight away.
    await press(byTestId(h.root, 'organization-hero-avatar'));
    expect(completion()).toContain('90%');
    expect(completion()).toContain('2 details to add');
    expect(badge('general')).toBe('General');
  });

  test('profile completion rules', () => {
    const base = MOCK_SESSION.organization;
    const file = { id: 'f', name: 'f.png', sizeBytes: 1 };
    const full = {
      ...base,
      logo: file,
      invoiceLogo: file,
      signature: file,
    };
    expect(organizationCompletion(full)).toMatchObject({
      percent: 100,
      missing: 0,
    });
    // Not GST registered: nothing to add for GST.
    expect(
      organizationCompletion({
        ...full,
        gstRegistered: false,
        gstNumber: '',
        defaultTaxRate: null,
      }).missingBySection.gst,
    ).toBe(0);
    // Registered without a GSTIN; blank text counts as missing.
    const gaps = organizationCompletion({
      ...full,
      gstNumber: '',
      city: '  ',
    });
    expect(gaps.missingBySection).toMatchObject({ gst: 1, address: 1 });
    expect(gaps.missing).toBe(2);
    expect(gaps.percent).toBe(90);
  });

  test('Cancel or another tab drops unsaved edits and locks again', async () => {
    const h = await openOrganization();
    const name = () => byTestId(h.root, 'organization-form-name');
    await editSection(h.root, 'general');
    await typeInto(name(), 'Draft name');
    await press(byText(h.root, 'Cancel'));
    expect(name().props.value).toBe('ABC Engineering Pvt Ltd');
    expect(name().props.editable).toBe(false);

    await editSection(h.root, 'general');
    await typeInto(name(), 'Draft name');
    await press(byTestId(h.root, 'organization-tab-address'));
    await press(byTestId(h.root, 'organization-tab-general'));
    expect(name().props.value).toBe('ABC Engineering Pvt Ltd');
    expect(name().props.editable).toBe(false);
    expect(org(h).name).toBe('ABC Engineering Pvt Ltd');
  });

  test('general: name and a valid email and website are required', async () => {
    const h = await openOrganization();
    await editSection(h.root, 'general');
    await typeInto(byTestId(h.root, 'organization-form-name'), ' ');
    await typeInto(byTestId(h.root, 'organization-form-email'), 'nope');
    await typeInto(byTestId(h.root, 'organization-form-website'), 'not a site');
    await press(byTestId(h.root, 'organization-form-submit'));

    const text = allText(h.root);
    expect(text).toContain('This field is required');
    expect(text).toContain('Enter a valid email address');
    expect(text).toContain('Enter a valid website, e.g. www.company.com');
    expect(org(h).name).toBe('ABC Engineering Pvt Ltd');
  });

  test('business and address', async () => {
    const h = await openOrganization();
    await editSection(h.root, 'business');
    await choose(h.root, 'organization-form-businessType', 'LLP');
    await press(byTestId(h.root, 'organization-form-submit'));
    expect(org(h).businessType).toBe('llp');

    await editSection(h.root, 'address');
    await typeInto(byTestId(h.root, 'organization-form-pinCode'), '123');
    await press(byTestId(h.root, 'organization-form-submit'));
    expect(allText(h.root)).toContain('Enter a 6-digit PIN code');

    await typeInto(byTestId(h.root, 'organization-form-pinCode'), '560001');
    await typeInto(byTestId(h.root, 'organization-form-city'), 'Bengaluru');
    await choose(h.root, 'organization-form-state', 'Karnataka');
    await press(byTestId(h.root, 'organization-form-submit'));
    expect(org(h)).toMatchObject({
      pinCode: '560001',
      city: 'Bengaluru',
      state: 'Karnataka',
    });
  });

  const openGst = async () => {
    const h = await openOrganization();
    await editSection(h.root, 'gst');
    return h;
  };
  const settings = (h: Awaited<ReturnType<typeof renderAdmin>>) =>
    allText(byTestId(h.root, 'gst-settings'));

  test('GST settings: registration, default rate, rates and how it applies', async () => {
    const h = await openGst();
    const text = settings(h);
    for (const value of [
      'GST & tax',
      'This rate will be selected automatically when creating invoices.',
      'Configured tax rates',
      'How GST is applied',
      'CGST 9% + SGST 9%',
      'IGST 18%',
    ]) {
      expect(text).toContain(value);
    }
    // 18% splits into 9 + 9, IGST 18; 28% is listed as inactive.
    const table = allText(byTestId(h.root, 'tax-rates-table'));
    expect(table).toContain('Inactive');
    expect(table).toContain('9%');
    expect(table).toContain('2.5%');
  });

  test('GST settings: GSTIN and default rate side by side; the state comes from the GSTIN', async () => {
    const h = await openGst();
    // No state picker here; it's in Address.
    expect(hasTestId(h.root, 'gst-settings-state')).toBe(false);
    expect(hasTestId(h.root, 'gst-settings-default')).toBe(true);

    await typeInto(byTestId(h.root, 'gst-settings-gstin'), '12345');
    await press(byTestId(h.root, 'gst-settings-submit'));
    expect(settings(h)).toContain('Enter a valid 15-character GST number');

    // 99 isn't a state code.
    await typeInto(byTestId(h.root, 'gst-settings-gstin'), '99aaaaa0000a1z5');
    await press(byTestId(h.root, 'gst-settings-submit'));
    expect(settings(h)).toContain(
      'The first two digits aren’t a valid state code',
    );

    // 29 = Karnataka.
    await typeInto(byTestId(h.root, 'gst-settings-gstin'), '29aaaaa0000a1z5');
    await press(byTestId(h.root, 'gst-settings-submit'));
    expect(org(h)).toMatchObject({
      gstNumber: '29AAAAA0000A1Z5',
      gstState: 'Karnataka',
    });
    // Saved: locked again.
    expect(hasTestId(h.root, 'gst-settings-submit')).toBe(false);
    expect(hasTestId(h.root, 'add-tax-rate')).toBe(false);
  });

  test('GST settings: No hides the GSTIN and rates and clears them on save', async () => {
    const h = await openGst();
    await press(byText(h.root, 'No'));
    expect(settings(h)).toContain('GST will not be applied to invoices.');
    expect(() => byTestId(h.root, 'gst-settings-gstin')).toThrow();
    expect(() => byTestId(h.root, 'tax-rates-table')).toThrow();
    await press(byTestId(h.root, 'gst-settings-submit'));

    expect(org(h)).toMatchObject({
      gstRegistered: false,
      gstNumber: '',
      gstState: '',
    });
  });

  test('add a tax rate: CGST / SGST / IGST are calculated', async () => {
    const h = await openGst();
    await press(byTestId(h.root, 'add-tax-rate'));
    await typeInto(byTestId(h.root, 'tax-rate-value'), '3');
    expect(byTestId(h.root, 'tax-rate-cgst').props.value).toBe('1.5');
    expect(byTestId(h.root, 'tax-rate-sgst').props.value).toBe('1.5');
    expect(byTestId(h.root, 'tax-rate-igst').props.value).toBe('3');

    // Duplicates and nonsense are refused.
    await typeInto(byTestId(h.root, 'tax-rate-value'), '18');
    await press(byTestId(h.root, 'tax-rate-submit'));
    expect(allText(h.root)).toContain('This rate is already configured');
    await typeInto(byTestId(h.root, 'tax-rate-value'), '150');
    await press(byTestId(h.root, 'tax-rate-submit'));
    expect(allText(h.root)).toContain('Enter a rate between 0 and 100');

    await typeInto(byTestId(h.root, 'tax-rate-value'), '3');
    await press(byTestId(h.root, 'tax-rate-submit'));
    // Back on the settings, then saved with the organization.
    await choose(h.root, 'gst-settings-default', '3%');
    await press(byTestId(h.root, 'gst-settings-submit'));
    expect(org(h).defaultTaxRate).toBe(3);
    expect(org(h).taxRates.map(r => r.rate)).toEqual([3, 5, 12, 18, 28]);
    expect(allText(byTestId(h.root, 'tax-rates-table'))).toContain('1.5%');
  });

  test('edit a tax rate: switching off the default asks for a new one', async () => {
    const h = await openGst();
    await press(byTestId(h.root, 'edit-rate-18'));
    expect(allText(h.root)).toContain('Edit Tax Rate');
    await press(byTestId(h.root, 'tax-rate-active'));
    await press(byTestId(h.root, 'tax-rate-submit'));

    await press(byTestId(h.root, 'gst-settings-submit'));
    expect(settings(h)).toContain('Pick the default GST rate');
    await choose(h.root, 'gst-settings-default', '12%');
    await press(byTestId(h.root, 'gst-settings-submit'));
    expect(org(h)).toMatchObject({ defaultTaxRate: 12 });
    expect(org(h).taxRates.find(r => r.rate === 18)?.active).toBe(false);
  });

  test('invoice and document settings', async () => {
    const h = await openOrganization();
    await editSection(h.root, 'invoice');
    await typeInto(
      byTestId(h.root, 'organization-form-invoiceStartNumber'),
      '0',
    );
    await press(byTestId(h.root, 'organization-form-submit'));
    expect(allText(h.root)).toContain('Enter a whole number, 1 or more');

    await typeInto(
      byTestId(h.root, 'organization-form-invoiceStartNumber'),
      '250',
    );
    await press(byTestId(h.root, 'organization-form-submit'));
    expect(org(h)).toMatchObject({ invoiceStartNumber: 250 });
    expect(org(h)).not.toHaveProperty('paymentTerms');

    await editSection(h.root, 'documents');
    await press(byTestId(h.root, 'organization-form-signature'));
    await press(byTestId(h.root, 'organization-form-submit'));
    expect(org(h).signature).toEqual(
      expect.objectContaining({ name: 'signature.png' }),
    );
  });
});
