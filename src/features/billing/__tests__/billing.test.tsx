import { Alert } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {
  allText,
  byLabel,
  byTestId,
  byText,
  choose,
  hasTestId,
  press,
  renderAdmin,
  typeInto,
} from '../../../shared/testing/testUtils';
import { ApiError } from '../../../services/api';
import { invoicesApi } from '../api/mockBillingApi';
import { MOCK_INVOICES, MOCK_QUOTES } from '../api/mockData';
import { quoteActions } from '../store/billingSlices';
import { invoiceDocument, invoiceHtml } from '../invoiceDocument';
import type { Organization } from '../../profile/types';
import {
  calculateTotals,
  fromDraft,
  isEmptyDraft,
  isThisMonth,
  lineAmount,
  newDraft,
  rateLabel,
  toDraft,
} from '../utils';

let mockWidth = 1280;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 900, scale: 1, fontScale: 1 }),
}));

beforeEach(() => {
  mockWidth = 1280;
});
afterEach(() => jest.restoreAllMocks());

describe('totals', () => {
  // QT-2026-0042: the design's four shaft operations.
  const shaft = MOCK_QUOTES.find(q => q.id === 'QT-2026-0042')!;
  test('match the design: ₹40,000 + 5% GST = ₹42,000', () => {
    expect(shaft.lineItems.map(i => lineAmount(i, 150))).toEqual([
      9000, 15000, 8000, 8000,
    ]);
    expect(calculateTotals(shaft.lineItems, 150, 0, 5)).toMatchObject({
      subtotal: 40000,
      discount: 0,
      gst: 2000,
      total: 42000,
    });
  });
  test('discount comes off before GST and never exceeds the subtotal', () => {
    expect(calculateTotals(shaft.lineItems, 150, 10000, 5)).toMatchObject({
      subtotal: 40000,
      discount: 10000,
      taxable: 30000,
      gst: 1500,
      total: 31500,
    });
    expect(calculateTotals(shaft.lineItems, 150, 99999, 5).total).toBe(0);
    expect(calculateTotals(shaft.lineItems, 150, -5, 5).discount).toBe(0);
  });
  test('18% GST: CGST + SGST in the same state, IGST across states', () => {
    // ₹40,000 at 18%.
    expect(calculateTotals(shaft.lineItems, 150, 0, 18, 'intra')).toMatchObject(
      { cgst: 3600, sgst: 3600, igst: 0, gst: 7200, total: 47200 },
    );
    expect(calculateTotals(shaft.lineItems, 150, 0, 18, 'inter')).toMatchObject(
      { cgst: 0, sgst: 0, igst: 7200, gst: 7200, total: 47200 },
    );
    expect(calculateTotals(shaft.lineItems, 150, 0, 18, 'none')).toMatchObject({
      gstRate: 0,
      gst: 0,
      total: 40000,
    });
  });
  test('setup time is charged once per batch, not per piece', () => {
    const facing = { minutesPerPiece: 2, setupMinutes: 30, ratePerMinute: 30 };
    // (150 × 2 + 30) min × ₹30.
    expect(lineAmount(facing, 150)).toBe(9900);
    expect(lineAmount({ ...facing, setupMinutes: 0 }, 150)).toBe(9000);
  });
  test('drafts keep the exact rate until the rate text is edited', () => {
    const drilling = shaft.lineItems[2];
    const draft = toDraft(drilling);
    expect(draft.rate).toBe('26.67');
    expect(fromDraft(draft).ratePerMinute).toBe(drilling.ratePerMinute);
    expect(fromDraft({ ...draft, rate: '26.5' }).ratePerMinute).toBe(26.5);
    expect(rateLabel(drilling)).toBe('₹26.67/min');
    expect(isEmptyDraft(newDraft())).toBe(true);
    expect(newDraft().id).not.toBe(newDraft().id);
  });
  test('isThisMonth', () => {
    expect(isThisMonth('2026-09-03', new Date('2026-09-30'))).toBe(true);
    expect(isThisMonth('2026-08-30', new Date('2026-09-30'))).toBe(false);
  });
});

const filterStatuses = async (
  root: Parameters<typeof byTestId>[0],
  id: 'invoices-filter' | 'quotes-filter',
  statuses: string[],
) => {
  await press(byTestId(root, id));
  const panel = byTestId(root, `${id}-panel`);
  await press(byText(panel, 'Clear all'));
  for (const status of statuses) {
    await press(byLabel(byTestId(root, `${id}-panel`), status));
  }
  await press(byTestId(root, `${id}-apply`));
};

test('invoices tab: totals, table, filter and search', async () => {
  const { root } = await renderAdmin('Billing');
  // Wide screens: no stat tiles; the totals are in the pagination bar.
  expect(hasTestId(root, 'invoice-stats')).toBe(false);
  const text = allText(byTestId(root, 'invoices-table'));
  expect(text).toContain('INV-2026-0125');
  expect(text).toContain('₹67,200');
  expect(text).toContain('RC-2225');
  expect(text).toContain(
    'Showing 10 of 13 invoices · 3 new · 2 overdue · 8 paid',
  );
  await filterStatuses(root, 'invoices-filter', ['Overdue']);
  expect(allText(root)).toContain('Showing 2 of 2 invoices');
  await filterStatuses(root, 'invoices-filter', []);
  await typeInto(
    byLabel(root, 'Search by invoice, customer or WO #'),
    'meridian',
  );
  expect(allText(root)).toContain('Showing 2 of 2 invoices');
});

test('invoices: two statuses at once, and search by work ID', async () => {
  const { root } = await renderAdmin('Billing');
  await filterStatuses(root, 'invoices-filter', ['Overdue', 'New']);
  const text = allText(byTestId(root, 'invoices-table'));
  const overdue = MOCK_INVOICES.filter(i => i.status === 'overdue').length;
  const fresh = MOCK_INVOICES.filter(i => i.status === 'new').length;
  expect(text).toContain(`Showing ${overdue + fresh} of ${overdue + fresh}`);
  expect(byLabel(root, 'Filter (2)')).toBeTruthy();
  await filterStatuses(root, 'invoices-filter', []);

  const search = byLabel(root, 'Search by invoice, customer or WO #');
  for (const query of ['WO-00125', '125', 'wo125', 'WO #125']) {
    await typeInto(search, query);
    const rows = allText(byTestId(root, 'invoices-table'));
    expect(rows).toContain('INV-2026-0125');
    expect(rows).toContain('Showing 1 of 1');
  }
});

test('wide screens: only the invoice rows scroll; totals stay in view', async () => {
  const { root } = await renderAdmin('Billing');
  const table = byTestId(root, 'invoices-table');
  const scroll = byTestId(table, 'invoices-table-scroll');
  expect(allText(scroll)).toContain('INV-2026-0125');
  expect(allText(scroll)).not.toContain('Showing 10 of 13 invoices');
  expect(allText(table)).toContain('Invoices');
  expect(allText(table)).toContain('Showing 10 of 13 invoices');
});

test('billing has no Export button', async () => {
  const { root } = await renderAdmin('Billing');
  expect(allText(root)).not.toContain('Export');
});

test('invoice details: operations, totals, send and mark as paid', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const h = await renderAdmin('Billing');
  await press(byText(h.root, 'INV-2026-0125'));
  const screen = byTestId(h.root, 'invoice-details-screen');
  const text = allText(screen);
  // Status is a badge beside the title.
  // Status badge by the title; the PO amount beside the title block.
  expect(text).toContain('Invoice|New|INV-2026-0125|PO amount|₹70,000');
  expect(text).toContain('Route card|RC-2225');
  // Running time only: no quantity in the operation rows.
  expect(text).toContain('Running time');
  expect(text).toContain('Running time|Setup time|Rate|Amount');
  expect(text).toContain('Turning|Turn to ⌀28 mm|5 min|0 min|₹20/min|₹15,000');
  expect(text).not.toContain('pcs ×');
  expect(text).toContain('₹20/min');
  // Nine operations: ₹64,000 + 5% GST.
  expect(allText(byTestId(screen, 'totals-total'))).toBe('₹67,200');

  // Sending emails the PDF; the bill stays New until it's paid.
  await press(byTestId(screen, 'send-invoice'));
  expect(Alert.alert).toHaveBeenCalledWith(
    'Invoice sent',
    'INV-2026-0125 was emailed to the customer.',
  );
  expect(
    h.store.getState().billing.invoices.entities['INV-2026-0125'].status,
  ).toBe('new');
  await press(byText(screen, 'Download PDF'));

  // Mark as Paid asks for the day and any TDS withheld.
  await press(byTestId(screen, 'mark-paid'));
  const dialog = byTestId(h.root, 'mark-paid-dialog');
  expect(allText(dialog)).toContain('INV-2026-0125 · ₹67,200');
  await typeInto(byTestId(dialog, 'tds-amount'), '1344');
  await press(byTestId(dialog, 'mark-paid-submit'));
  expect(allText(dialog)).toContain('Enter the TDS section');
  await typeInto(byTestId(dialog, 'tds-section'), '194C');
  await press(byTestId(dialog, 'mark-paid-submit'));
  const paid = h.store.getState().billing.invoices.entities['INV-2026-0125'];
  expect(paid.status).toBe('paid');
  expect(paid.payment).toMatchObject({
    receivedAmount: 65856,
    tdsAmount: 1344,
    tdsSection: '194C',
  });
  expect(hasTestId(h.root, 'mark-paid-dialog')).toBe(false);
  expect(allText(screen)).toContain('Received ₹65,856');
  expect(allText(screen)).toContain('TDS ₹1,344 (194C)');
  const { props } = byTestId(screen, 'mark-paid');
  expect(props['aria-disabled'] ?? props.accessibilityState?.disabled).toBe(
    true,
  );
  // Paid is final: no Edit.
  expect(hasTestId(screen, 'edit-invoice')).toBe(false);
});

test('send asks for an email when the customer has none on file', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const missing = Object.assign(new ApiError('No email on file', 422), {
    code: 'CUSTOMER_EMAIL_MISSING',
  });
  const send = jest
    .spyOn(invoicesApi, 'send')
    .mockRejectedValueOnce(missing)
    .mockResolvedValueOnce(undefined);
  const h = await renderAdmin('Billing');
  await h.navigate('InvoiceDetails', { invoiceId: 'INV-2026-0125' });
  await press(byTestId(h.root, 'send-invoice'));
  const dialog = byTestId(h.root, 'send-email-dialog');
  await typeInto(byTestId(dialog, 'send-email-to'), 'nope');
  await press(byTestId(dialog, 'send-email-submit'));
  expect(allText(dialog)).toContain('Enter a valid email');
  await typeInto(byTestId(dialog, 'send-email-to'), 'buyer@abc.example');
  await typeInto(byTestId(dialog, 'send-email-cc'), 'accounts@abc.example');
  await press(byTestId(dialog, 'send-email-submit'));
  expect(send).toHaveBeenLastCalledWith('INV-2026-0125', {
    to: 'buyer@abc.example',
    cc: ['accounts@abc.example'],
  });
  expect(hasTestId(h.root, 'send-email-dialog')).toBe(false);
  expect(Alert.alert).toHaveBeenCalledWith(
    'Invoice sent',
    'INV-2026-0125 was emailed to the customer.',
  );
});

test('only the owner and the accountant see Mark as Paid', async () => {
  jest.spyOn(invoicesApi, 'permissions').mockResolvedValue({ markPaid: false });
  const h = await renderAdmin('Billing');
  await h.navigate('InvoiceDetails', { invoiceId: 'INV-2026-0125' });
  expect(hasTestId(h.root, 'mark-paid')).toBe(false);
  expect(hasTestId(h.root, 'send-invoice')).toBe(true);
});

test('edit invoice in place: change a rate, add and remove rows, discount', async () => {
  const h = await renderAdmin('Billing');
  await h.navigate('InvoiceDetails', { invoiceId: 'INV-2026-0125' });
  const screen = byTestId(h.root, 'invoice-details-screen');
  // Read-only until Edit; Edit stays on this screen.
  expect(hasTestId(screen, 'line-op1-rate')).toBe(false);
  await press(byTestId(screen, 'edit-invoice'));
  expect(h.currentRoute()).toBe('InvoiceDetails');
  expect(hasTestId(screen, 'edit-invoice')).toBe(false);
  expect(allText(byTestId(screen, 'line-op1-amount'))).toBe('₹9,000');

  await typeInto(byTestId(screen, 'line-op1-rate'), '40');
  expect(allText(byTestId(screen, 'line-op1-amount'))).toBe('₹12,000');
  // The amounts follow the inputs: ₹64,000 + ₹3,000 + 5% GST.
  expect(allText(byTestId(screen, 'totals-total'))).toBe('₹70,350');
  // Setup time adds once: (150 × 2 + 15) min × ₹40.
  await typeInto(byTestId(screen, 'line-op1-setup'), '15');
  expect(allText(byTestId(screen, 'line-op1-amount'))).toBe('₹12,600');
  await press(byLabel(screen, 'Remove Grinding'));
  expect(allText(screen)).not.toContain('Finish grind OD');
  await press(byTestId(screen, 'add-line-item'));
  await typeInto(byTestId(screen, 'invoice-discount'), '-1');
  await press(byTestId(screen, 'save-invoice'));
  expect(allText(screen)).toContain('Enter a number');

  await typeInto(byTestId(screen, 'invoice-discount'), '1000');
  // The status is the server's: no picker.
  expect(hasTestId(screen, 'invoice-status')).toBe(false);
  await press(byTestId(screen, 'save-invoice'));

  const saved = h.store.getState().billing.invoices.entities['INV-2026-0125'];
  expect(saved.status).toBe('new');
  expect(saved.discount).toBe(1000);
  // The blank added row is dropped; the untouched ₹80/3 rate stays exact.
  expect(saved.lineItems.map(i => i.operation)).toEqual([
    'Facing',
    'Turning',
    'Drilling',
    'Chamfering',
    'Threading',
    'Keyway milling',
    'Deburring',
    'Inspection',
  ]);
  expect(saved.lineItems[2].ratePerMinute).toBeCloseTo(80 / 3, 10);
  expect(saved.lineItems[0]).toMatchObject({
    minutesPerPiece: 2,
    setupMinutes: 15,
    ratePerMinute: 40,
  });
  // Saved: back to the read-only invoice, on the same screen.
  expect(h.currentRoute()).toBe('InvoiceDetails');
  expect(hasTestId(screen, 'edit-invoice')).toBe(true);
  expect(hasTestId(screen, 'line-op1-rate')).toBe(false);
  expect(allText(screen)).not.toContain('Finish grind OD');
});

test('add row scrolls the operations to the new row', async () => {
  const h = await renderAdmin('Billing');
  await h.navigate('InvoiceDetails', { invoiceId: 'INV-2026-0125' });
  await press(byTestId(h.root, 'edit-invoice'));
  const scroll = h.root.find(
    n =>
      typeof n.type !== 'string' &&
      n.props.testID === 'line-items-editor-scroll' &&
      n.instance?.scrollToEnd,
  );
  const scrollToEnd = jest.spyOn(scroll.instance, 'scrollToEnd');
  const grow = () =>
    ReactTestRenderer.act(async () =>
      scroll.props.onContentSizeChange(800, 1200),
    );

  // Typing doesn't scroll…
  await grow();
  expect(scrollToEnd).not.toHaveBeenCalled();
  // …adding a row does, once it's laid out.
  await press(byTestId(h.root, 'add-line-item'));
  await grow();
  expect(scrollToEnd).toHaveBeenCalledTimes(1);
  await grow();
  expect(scrollToEnd).toHaveBeenCalledTimes(1);
});

test('PO amount: shown under its label beside the title; fixed, not edited', async () => {
  const h = await renderAdmin('Billing');
  const saved = (id: string) =>
    h.store.getState().billing.invoices.entities[id]?.poAmount;
  // INV-2026-0125 came with a ₹70,000 PO; INV-2026-0121 has none yet.
  await h.navigate('InvoiceDetails', { invoiceId: 'INV-2026-0121' });
  expect(allText(byTestId(h.root, 'invoice-po-amount'))).toBe('PO amount|—');

  await h.navigate('InvoiceDetails', { invoiceId: 'INV-2026-0125' });
  const screens = h.root.findAll(
    n =>
      typeof n.type === 'string' && n.props.testID === 'invoice-details-screen',
  );
  const screen = screens[screens.length - 1];
  const po = () => allText(byTestId(screen, 'invoice-po-amount'));
  expect(po()).toBe('PO amount|₹70,000');

  // Editing the invoice leaves it as it is: no field for it.
  await press(byTestId(screen, 'edit-invoice'));
  expect(hasTestId(screen, 'invoice-po-amount-input')).toBe(false);
  expect(po()).toBe('PO amount|₹70,000');
  await press(byTestId(screen, 'save-invoice'));
  expect(saved('INV-2026-0125')).toBe(70000);
});

test('preview invoice: the invoice as an A4 page, with print', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const h = await renderAdmin('Billing');
  await h.navigate('InvoiceDetails', { invoiceId: 'INV-2026-0125' });
  expect(hasTestId(h.root, 'invoice-preview-sheet')).toBe(false);
  await press(byTestId(h.root, 'preview-invoice'));

  const sheet = allText(byTestId(h.root, 'invoice-preview-sheet'));
  // Seller from Organization details, then the invoice and its customer.
  expect(sheet).toContain('ABC Engineering Pvt Ltd');
  expect(sheet).toContain('GSTIN 33ABCDE1234F1Z5');
  expect(sheet).toContain('INVOICE');
  expect(sheet).toContain('INV-2026-0125|Invoice no. ');
  // No logo uploaded: the organization's initials stand in for it.
  expect(allText(byTestId(h.root, 'invoice-preview-mark'))).toBe('AE');
  expect(sheet).toContain('Job ID|WO-00125');
  expect(sheet).toContain('PO amount|₹70,000');
  // No operation rows and no customer block.
  expect(sheet).not.toContain('Facing');
  expect(sheet).not.toContain('Running time');
  expect(sheet).not.toContain('Bill to');
  expect(allText(byTestId(h.root, 'invoice-preview-total'))).toBe('₹67,200');
  expect(sheet).toContain('Thank you for your business.');

  // Phones have no print yet: it says so.
  await press(byTestId(h.root, 'invoice-preview-print'));
  expect(Alert.alert).toHaveBeenCalledWith(
    'Not available yet',
    'Printing invoices will work once the backend is connected.',
  );
});

test('the printed invoice is a full page with the same figures, escaped', () => {
  const invoice = {
    ...MOCK_INVOICES[0],
    notes: 'Deliver <before> Friday & call "Ravi"',
  };
  const totals = calculateTotals(
    invoice.lineItems,
    invoice.quantity,
    invoice.discount,
    invoice.gstRate,
  );
  const html = invoiceHtml(invoiceDocument(invoice, totals, null));
  expect(html).toMatch(/^<!doctype html>/);
  expect(html).toContain('@page { size: A4');
  expect(html).toContain('INV-2026-0125');
  expect(html).toContain('₹67,200');
  expect(html).toContain(
    'Deliver &lt;before&gt; Friday &amp; call &quot;Ravi&quot;',
  );
  expect(html).not.toContain('<before>');
  // No operation table or customer block; initials in place of a logo.
  expect(html).not.toContain('<table');
  expect(html).not.toContain('OD facing both ends');
  expect(html).not.toContain('Bill to');
  expect(html).toContain('<div class="mark"></div>');
});

test('the printed invoice shows the organization’s invoice logo', () => {
  const uri = 'data:image/png;base64,iVBORw0KGgo=';
  const organization = {
    name: 'ABC Engineering Pvt Ltd',
    invoiceLogo: { id: 'logo', name: 'logo.png', sizeBytes: 10, uri },
    logo: null,
  } as unknown as Organization;
  const invoice = MOCK_INVOICES[0];
  const totals = calculateTotals(
    invoice.lineItems,
    invoice.quantity,
    invoice.discount,
    invoice.gstRate,
  );
  const doc = invoiceDocument(invoice, totals, organization);
  expect(doc.seller).toMatchObject({ logoUri: uri, initials: 'AE' });
  expect(invoiceHtml(doc)).toContain(`<img class="logo" src="${uri}"`);
});

test('cancel discards the edits', async () => {
  const h = await renderAdmin('Billing');
  await h.navigate('InvoiceDetails', { invoiceId: 'INV-2026-0125' });
  const screen = byTestId(h.root, 'invoice-details-screen');
  await press(byTestId(screen, 'edit-invoice'));
  await typeInto(byTestId(screen, 'line-op1-rate'), '40');
  await press(byLabel(screen, 'Remove Grinding'));
  await press(byText(screen, 'Cancel'));
  expect(hasTestId(screen, 'edit-invoice')).toBe(true);
  expect(allText(screen)).toContain('Finish grind OD');
  expect(allText(byTestId(screen, 'totals-total'))).toBe('₹67,200');
  // Editing again starts from the saved invoice.
  await press(byTestId(screen, 'edit-invoice'));
  expect(allText(byTestId(screen, 'line-op1-amount'))).toBe('₹9,000');
});

test('edit invoice needs at least one operation', async () => {
  const h = await renderAdmin('Billing');
  await h.navigate('InvoiceDetails', { invoiceId: 'INV-2026-0122' });
  const screen = byTestId(h.root, 'invoice-details-screen');
  await press(byTestId(screen, 'edit-invoice'));
  await press(byLabel(screen, 'Remove Turning'));
  await press(byLabel(screen, 'Remove Drilling'));
  await press(byTestId(screen, 'save-invoice'));
  expect(allText(screen)).toContain('Add at least one operation');
});

test('quotes tab, quote details, convert and revise', async () => {
  const h = await renderAdmin('Billing');
  await press(byText(h.root, 'Quotes'));
  const quotes = byTestId(h.root, 'quotes-table');
  expect(allText(quotes)).toContain('Showing 8 of 8 quotes · 1 draft · 7 sent');
  // Quoted amount with GST: the design's ₹40,000 + 5%.
  expect(allText(quotes)).toMatch(/Quote ID\|Customer\|Amount\|Status/);
  expect(allText(byTestId(quotes, 'quote-amount-QT-2026-0042'))).toBe(
    '₹42,000',
  );
  // Wide screens: Create quote sits in the Quotes toolbar.
  expect(hasTestId(quotes, 'create-quote')).toBe(true);
  await filterStatuses(h.root, 'quotes-filter', ['Draft']);
  expect(allText(byTestId(h.root, 'quotes-table'))).toContain('QT-2026-0038');
  await filterStatuses(h.root, 'quotes-filter', []);

  await press(byText(h.root, 'QT-2026-0042'));
  const screen = byTestId(h.root, 'quote-details-screen');
  // Laid out like the invoice: no stat tiles; the status sits by the title.
  expect(hasTestId(screen, 'quote-summary')).toBe(false);
  expect(allText(screen)).toContain('Quote|Sent|QT-2026-0042');
  expect(allText(byTestId(screen, 'totals-total'))).toBe('₹42,000');
  // No material. Sent: no Edit or Send (it stays sent); it can be
  // converted to an order.
  expect(allText(screen)).not.toContain('Material');
  expect(hasTestId(screen, 'edit-quote')).toBe(false);
  expect(hasTestId(screen, 'send-quote')).toBe(false);
  expect(allText(screen)).toContain('Download PDF');

  // Convert to Order asks for the customer's PO and the due date.
  await press(byTestId(screen, 'convert-quote'));
  const dialog = byTestId(h.root, 'convert-quote-dialog');
  await press(byTestId(dialog, 'convert-quote-submit'));
  expect(allText(dialog)).toContain('Enter the PO number');
  expect(allText(dialog)).toContain('Pick the due date');
  await typeInto(byTestId(dialog, 'convert-po-number'), 'PO-7788');
  // The native wheels: pick a day and tap Done.
  await press(byTestId(dialog, 'convert-due-date'));
  await ReactTestRenderer.act(() =>
    byTestId(h.root, 'convert-due-date-wheels').props.onValueChange(
      {},
      new Date(2026, 10, 30),
    ),
  );
  await press(byTestId(h.root, 'convert-due-date-done'));
  await press(byTestId(dialog, 'convert-quote-submit'));
  const converted = h.store.getState().billing.quotes.entities['QT-2026-0042'];
  expect(converted.orderId).toBeTruthy();
  expect(h.currentRoute()).toBe('OrderDetails');
});

test('a draft is edited in place and sent; a sent quote stays sent', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const h = await renderAdmin('Billing');
  await h.navigate('QuoteDetails', { quoteId: 'QT-2026-0038' });
  const screen = byTestId(h.root, 'quote-details-screen');
  expect(allText(screen)).toContain('Quote|Draft|QT-2026-0038');
  expect(hasTestId(screen, 'convert-quote')).toBe(false);

  // Edit in place: the fields and operations become inputs on this screen.
  expect(hasTestId(screen, 'quote-customer')).toBe(false);
  await press(byTestId(screen, 'edit-quote'));
  expect(h.currentRoute()).toBe('QuoteDetails');
  // A quote keeps its customer.
  const customer = byTestId(screen, 'quote-customer');
  expect(customer.props.value).toBe('Nova Fabrication');
  expect(customer.props.editable).toBe(false);
  // No status picker: Send makes it Sent.
  expect(hasTestId(screen, 'quote-status')).toBe(false);
  expect(hasTestId(screen, 'line-op1-rate')).toBe(true);
  // Double the pieces, double the amount (a preview until it's saved).
  expect(allText(byTestId(screen, 'totals-total'))).toBe('₹15,750');
  await typeInto(byTestId(screen, 'quote-quantity'), '120');
  expect(allText(byTestId(screen, 'totals-total'))).toBe('₹31,500');
  await press(byTestId(screen, 'save-quote'));
  const saved = h.store.getState().billing.quotes.entities['QT-2026-0038'];
  expect(saved.quantity).toBe(120);
  expect(saved.totals.total).toBe(31500);
  expect(hasTestId(screen, 'edit-quote')).toBe(true);
  expect(allText(screen)).toContain('120 pcs');

  await press(byTestId(screen, 'send-quote'));
  expect(Alert.alert).toHaveBeenCalledWith(
    'Quote sent',
    'QT-2026-0038 was emailed to the customer and is now Sent.',
  );
  expect(
    h.store.getState().billing.quotes.entities['QT-2026-0038'].status,
  ).toBe('sent');
  expect(hasTestId(screen, 'edit-quote')).toBe(false);
  expect(hasTestId(screen, 'send-quote')).toBe(false);
  expect(hasTestId(screen, 'convert-quote')).toBe(true);
});

test('a converted quote links to its order', async () => {
  const h = await renderAdmin('Billing');
  await h.navigate('Billing', { tab: 'quotes' });
  const linked = h.store.getState().billing.quotes.entities['QT-2026-0041']!;
  await ReactTestRenderer.act(async () => {
    h.store.dispatch(quoteActions.saveSuccess({ ...linked, orderId: '1042' }));
  });
  await h.navigate('QuoteDetails', { quoteId: 'QT-2026-0041' });
  const details = byTestId(h.root, 'quote-details-screen');
  expect(hasTestId(details, 'convert-quote')).toBe(false);
  expect(allText(byTestId(details, 'quote-order'))).toBe('View order');
  await press(byTestId(details, 'quote-order'));
  expect(h.currentRoute()).toBe('OrderDetails');
});

test('preview quote: a quotation page in the same viewer, with print', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const h = await renderAdmin('Billing');
  await h.navigate('QuoteDetails', { quoteId: 'QT-2026-0042' });
  await press(byTestId(h.root, 'preview-quote'));

  const viewer = allText(byTestId(h.root, 'invoice-preview'));
  expect(viewer).toContain('Quote preview');
  const sheet = allText(byTestId(h.root, 'invoice-preview-sheet'));
  expect(sheet).toContain('ABC Engineering Pvt Ltd');
  expect(sheet).toContain('QUOTATION');
  expect(sheet).toContain('QT-2026-0042|Quote no. ');
  expect(sheet).toContain('Part name|Machined Shaft');
  expect(sheet).toContain('Quantity|150 pcs');
  expect(sheet).not.toContain('Facing');
  expect(allText(byTestId(h.root, 'invoice-preview-total'))).toBe('₹42,000');

  await press(byTestId(h.root, 'invoice-preview-print'));
  expect(Alert.alert).toHaveBeenCalledWith(
    'Not available yet',
    'Printing quotes will work once the backend is connected.',
  );
});

test('quote edit: cancel discards, blank fields are required', async () => {
  const h = await renderAdmin('Billing');
  await h.navigate('QuoteDetails', { quoteId: 'QT-2026-0038' });
  const screen = byTestId(h.root, 'quote-details-screen');
  await press(byTestId(screen, 'edit-quote'));
  await typeInto(byTestId(screen, 'quote-part'), '');
  await press(byLabel(screen, 'Remove Welding'));
  await press(byTestId(screen, 'save-quote'));
  expect(allText(screen)).toContain('This field is required');
  await press(byText(screen, 'Cancel'));
  expect(allText(screen)).toContain('Bracket');
  expect(allText(screen)).toContain('Tack and full weld');
  expect(
    h.store.getState().billing.quotes.entities['QT-2026-0038'].partName,
  ).toBe('Bracket');
});

test('back on a quote returns to where it was opened from', async () => {
  const h = await renderAdmin('Billing');
  // From the Quotes list: back to the list.
  await h.navigate('Billing', { tab: 'quotes' });
  await press(byText(byTestId(h.root, 'quotes-table'), 'QT-2026-0042'));
  const back = () => {
    const links = h.root.findAll(
      n => typeof n.type === 'string' && n.props.testID === 'quote-back',
    );
    return links[links.length - 1];
  };
  expect(allText(back())).toBe('Back to quotes');
  await press(back());
  expect(h.currentRoute()).toBe('Billing');
  // …on its Quotes tab.
  expect(hasTestId(h.root, 'quotes-table')).toBe(true);
});

test('quotes list: edit opens a draft in edit mode; delete asks first', async () => {
  const h = await renderAdmin('Billing');
  await h.navigate('Billing', { tab: 'quotes' });
  // Just Edit and Delete in the row: no view or convert icons.
  expect(() => byLabel(h.root, 'View QT-2026-0038')).toThrow();
  expect(() => byLabel(h.root, 'Convert QT-2026-0038 to order')).toThrow();
  // Sent quotes are neither edited nor deleted.
  expect(() => byLabel(h.root, 'Edit QT-2026-0040')).toThrow();
  expect(() => byLabel(h.root, 'Delete QT-2026-0040')).toThrow();

  await press(byLabel(h.root, 'Edit QT-2026-0038'));
  expect(h.currentRoute()).toBe('QuoteDetails');
  expect(hasTestId(h.root, 'save-quote')).toBe(true);
  expect(hasTestId(h.root, 'quote-customer')).toBe(true);

  // Delete asks first; Cancel keeps the quote.
  await h.navigate('Billing', { tab: 'quotes' });
  await press(byLabel(h.root, 'Delete QT-2026-0038'));
  const dialog = byTestId(h.root, 'delete-quote-dialog');
  expect(allText(dialog)).toContain('Delete quote?');
  expect(allText(dialog)).toContain('QT-2026-0038');
  await press(byText(dialog, 'Cancel'));
  expect(
    h.store.getState().billing.quotes.entities['QT-2026-0038'],
  ).toBeTruthy();

  await press(byLabel(h.root, 'Delete QT-2026-0038'));
  await press(byText(byTestId(h.root, 'delete-quote-dialog'), 'Delete quote'));
  expect(
    h.store.getState().billing.quotes.entities['QT-2026-0038'],
  ).toBeUndefined();
  expect(allText(byTestId(h.root, 'quotes-table'))).not.toContain(
    'QT-2026-0038',
  );
});

test('invoices do not link to quotes', async () => {
  const h = await renderAdmin('Billing');
  // The list row has View and Edit only, even for INV-2026-0125.
  const row = allText(byTestId(h.root, 'invoices-table'));
  expect(row).toContain('INV-2026-0125');
  expect(() => byLabel(h.root, 'View quote QT-2026-0042')).toThrow();
  expect(hasTestId(h.root, 'view-quote-INV-2026-0125')).toBe(false);
  // …and the invoice page has no View Quote button.
  await h.navigate('InvoiceDetails', { invoiceId: 'INV-2026-0125' });
  const screen = byTestId(h.root, 'invoice-details-screen');
  expect(hasTestId(screen, 'view-quote')).toBe(false);
  expect(allText(screen)).not.toContain('QT-2026-0042');
});

test('back on an invoice returns to the Billing list', async () => {
  const h = await renderAdmin('Billing');
  await press(byLabel(h.root, 'View INV-2026-0125'));
  expect(h.currentRoute()).toBe('InvoiceDetails');
  const back = byTestId(h.root, 'invoice-back');
  expect(allText(back)).toBe('Back to billing');
  await press(back);
  expect(h.currentRoute()).toBe('Billing');

  // Opened directly (e.g. a link) with nothing underneath: still Billing.
  await h.navigate('InvoiceDetails', { invoiceId: 'INV-2026-0124' });
  await press(byTestId(h.root, 'invoice-back'));
  expect(h.currentRoute()).toBe('Billing');
});

test('the job ID opens its order; back on the order returns here', async () => {
  const h = await renderAdmin('Billing');
  await h.navigate('InvoiceDetails', { invoiceId: 'INV-2026-0125' });
  await press(byLabel(h.root, 'Open order WO-00125'));
  expect(h.currentRoute()).toBe('OrderDetails');
  const order = byTestId(h.root, 'order-details-screen');
  expect(allText(order)).toContain('ABC Engineering');
  await press(byText(order, 'Back to invoice'));
  expect(h.currentRoute()).toBe('InvoiceDetails');

  // No work order behind WO-00118: the job ID is plain text.
  await h.navigate('InvoiceDetails', { invoiceId: 'INV-2026-0124' });
  expect(() => byLabel(h.root, 'Open order WO-00118')).toThrow();
});

test('creates a quote', async () => {
  const h = await renderAdmin('Billing');
  await h.navigate('Billing', { tab: 'quotes' });
  await press(byTestId(h.root, 'create-quote'));
  const form = byTestId(h.root, 'quote-form-screen');
  await press(byTestId(form, 'save-quote'));
  expect(allText(form)).toContain('This field is required');
  // A quote is for a saved customer.
  await typeInto(byTestId(form, 'quote-customer'), 'Kaveri Tools');
  await typeInto(byTestId(form, 'quote-part'), 'Pin');
  await typeInto(byTestId(form, 'quote-quantity'), '100');
  await typeInto(byTestId(form, 'line-new-1-minutes'), '1');
  await typeInto(byTestId(form, 'line-new-1-rate'), '10');
  // New quotes use the organization's default GST rate (18%).
  expect(allText(byTestId(form, 'totals-total'))).toBe('₹1,180');
  await choose(form, 'quote-gst-rate', '5%');
  expect(allText(byTestId(form, 'totals-total'))).toBe('₹1,050');
  await press(byTestId(form, 'save-quote'));
  expect(allText(form)).toContain('Pick a saved customer');
  await typeInto(byTestId(form, 'quote-customer'), 'kaveri hydraulics');
  await press(byTestId(form, 'save-quote'));
  const created =
    h.store.getState().billing.quotes.entities[
      `QT-${new Date().getFullYear()}-0043`
    ];
  expect(created).toMatchObject({
    customerName: 'Kaveri Hydraulics',
    quantity: 100,
    status: 'draft',
    gstRate: 5,
  });
});

test('invoice GST: CGST + SGST in state, IGST for another state', async () => {
  const h = await renderAdmin('Billing');
  // ABC Engineering isn't a known customer: treated as the same state.
  await h.navigate('InvoiceDetails', { invoiceId: 'INV-2026-0125' });
  let text = allText(h.root);
  expect(text).toContain('CGST 2.5%');
  expect(text).toContain('SGST 2.5%');
  expect(text).toContain('₹1,600');
  expect(text).toContain('₹67,200');

  // Saved amounts are the server's. While editing, the preview splits GST
  // by state: Nova Fabrication is in Karnataka, the organization in Tamil
  // Nadu.
  await h.navigate('QuoteDetails', { quoteId: 'QT-2026-0038' });
  await press(byTestId(h.root, 'edit-quote'));
  text = allText(byTestId(h.root, 'quote-details-screen'));
  expect(text).toContain('IGST 5%');
  expect(text).not.toContain('CGST');
});

test('invoice edit picks the GST rate from the configured rates', async () => {
  const h = await renderAdmin('Billing');
  await h.navigate('InvoiceDetails', { invoiceId: 'INV-2026-0125' });
  await press(byTestId(h.root, 'edit-invoice'));
  await choose(h.root, 'invoice-gst-rate', '18%');
  // ₹64,000 + 18%.
  expect(allText(byTestId(h.root, 'totals-total'))).toBe('₹75,520');
  expect(allText(h.root)).toContain('CGST 9%');
  await press(byTestId(h.root, 'save-invoice'));
  expect(
    h.store.getState().billing.invoices.entities['INV-2026-0125']?.gstRate,
  ).toBe(18);
});

test('unknown invoice / quote ids', async () => {
  const h = await renderAdmin('Billing');
  await h.navigate('InvoiceDetails', { invoiceId: 'X' });
  expect(allText(h.root)).toContain('This invoice no longer exists.');
  await h.navigate('QuoteDetails', { quoteId: 'X' });
  await h.navigate('QuoteForm', { quoteId: 'X' });
  expect(allText(h.root)).toContain('This quote no longer exists.');
});

test('phone: invoice cards, editor cards and pinned actions', async () => {
  mockWidth = 390;
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const h = await renderAdmin('Billing');
  // Invoices / Quotes: the detail screens' tab bar, under the search.
  expect(hasTestId(h.root, 'billing-tabs-invoices')).toBe(true);
  // No stat tiles on phones.
  expect(hasTestId(h.root, 'invoice-stats')).toBe(false);
  // Cards: the invoice with its status, amount, job and
  // route card, then View invoice and Edit.
  const card = byTestId(h.root, 'invoice-card-INV-2026-0125');
  expect(allText(card)).toBe(
    'INV-2026-0125|ABC Engineering|New|Amount|₹67,200|Job|WO-00125|Route card|RC-2225|View invoice',
  );
  expect(byLabel(card, 'Edit INV-2026-0125')).toBeTruthy();
  // Download opens the server's PDF (the mock backend has none).
  await press(byLabel(card, 'Download INV-2026-0125'));
  await press(byLabel(card, 'View INV-2026-0125'));
  let details = byTestId(h.root, 'invoice-details-screen');
  // At a glance: number, status, total and PO amount, then the cards.
  expect(allText(byTestId(details, 'invoice-overview'))).toMatch(
    /^INV-2026-0125\|New\|₹67,200\|PO amount\|₹70,000\|Billed to\|.*ABC Engineering\|Send Invoice\|Job details\|.*Process operations\|9 operations · ₹64,000\|Amount details\|/,
  );
  // Preview Invoice, Download PDF and Mark as Paid pinned to the bottom.
  expect(allText(details)).toMatch(
    /Preview Invoice\|Download PDF\|Mark as Paid$/,
  );
  await press(byTestId(details, 'preview-invoice'));
  expect(hasTestId(h.root, 'invoice-preview-sheet')).toBe(true);
  await press(byLabel(byTestId(h.root, 'invoice-preview'), 'Back'));
  expect(hasTestId(h.root, 'invoice-preview-sheet')).toBe(false);
  // The operations aren't listed here; their own screen has them.
  expect(allText(details)).not.toContain('Facing');
  await press(byTestId(details, 'invoice-open-operations'));
  expect(h.currentRoute()).toBe('InvoiceOperations');
  expect(allText(byTestId(h.root, 'invoice-operations-screen'))).toContain(
    'Facing',
  );
  await press(byLabel(byTestId(h.root, 'invoice-operations-screen'), 'Back'));
  expect(h.currentRoute()).toBe('InvoiceDetails');
  details = byTestId(h.root, 'invoice-details-screen');
  await press(byText(details, 'Download PDF'));
  // Edit (in the header) slides up Edit invoice: only discount, GST and
  // notes (no status: it's the server's), with Cancel / Save pinned; the
  // operations are a row to their own screen.
  await press(byLabel(details, 'Edit'));
  expect(h.currentRoute()).toBe('InvoiceEdit');
  const form = () => byTestId(h.root, 'invoice-edit-form');
  expect(allText(byTestId(h.root, 'invoice-edit-screen'))).toMatch(
    /^Edit invoice\|INV-2026-0125\|/,
  );
  expect(hasTestId(form(), 'invoice-status')).toBe(false);
  expect(hasTestId(form(), 'invoice-discount')).toBe(true);
  expect(hasTestId(form(), 'invoice-notes')).toBe(true);
  expect(hasTestId(form(), 'line-op1-minutes')).toBe(false);
  expect(hasTestId(h.root, 'save-invoice')).toBe(true);
  const saved = () =>
    h.store.getState().billing.invoices.entities['INV-2026-0125']!;

  // No operations here: they're edited from their own screen.
  expect(hasTestId(form(), 'invoice-edit-operations')).toBe(false);
  expect(allText(form())).not.toContain('Process operations');
  await typeInto(byTestId(form(), 'invoice-discount'), '500');
  await press(byTestId(h.root, 'save-invoice'));
  expect(saved().discount).toBe(500);
  // Saved: it slides back down to the invoice.
  expect(h.currentRoute()).toBe('InvoiceDetails');

  // Process operations: a bill of numbered lines and the subtotal.
  await press(byTestId(h.root, 'invoice-open-operations'));
  const ops = () => byTestId(h.root, 'invoice-operations-screen');
  expect(allText(byTestId(ops(), 'operation-op1'))).toMatch(
    /^1\.\|Facing\|₹9,000\|/,
  );
  expect(allText(byTestId(ops(), 'operations-subtotal'))).toBe('₹64,000');
  expect(hasTestId(ops(), 'edit-operation-op1')).toBe(false);
  expect(hasTestId(ops(), 'add-operation')).toBe(false);
  // The header's Edit: each line gets Edit, and Add operation shows.
  await press(byTestId(ops(), 'edit-operations'));
  expect(allText(ops())).toContain('Edit process operations');
  // Add operation sits above the lines.
  expect(allText(byTestId(ops(), 'operations-bill'))).toMatch(
    /^Add operation\|Operation\|Amount\|1\./,
  );
  // The sheet's X closes it without saving.
  await press(byTestId(ops(), 'edit-operation-op2'));
  await press(byTestId(h.root, 'operation-sheet-close'));
  await ReactTestRenderer.act(() => new Promise(done => setTimeout(done, 400)));
  expect(hasTestId(h.root, 'operation-sheet')).toBe(false);
  // One operation in a sheet, saved on its own.
  await press(byTestId(ops(), 'edit-operation-op1'));
  const sheet = () => byTestId(h.root, 'operation-sheet');
  await typeInto(byTestId(sheet(), 'operation-minutes'), '3');
  expect(allText(byTestId(sheet(), 'operation-amount'))).toBe('₹13,500');
  await press(byTestId(sheet(), 'save-operation'));
  expect(saved().lineItems[0].minutesPerPiece).toBe(3);
  expect(saved().discount).toBe(500);
  // A new one is added at the end; a name is required.
  await press(byTestId(ops(), 'add-operation'));
  await press(byTestId(sheet(), 'save-operation'));
  expect(allText(sheet())).toContain('Enter the operation name');
  await typeInto(byTestId(sheet(), 'operation-name'), 'Polishing');
  await typeInto(byTestId(sheet(), 'operation-minutes'), '1');
  await typeInto(byTestId(sheet(), 'operation-rate'), '10');
  await press(byTestId(sheet(), 'save-operation'));
  expect(saved().lineItems).toHaveLength(10);
  expect(saved().lineItems[9].operation).toBe('Polishing');
  // Delete is on the line itself, and asks first.
  const added = saved().lineItems[9].id;
  expect(hasTestId(sheet(), 'delete-operation')).toBe(false);
  await press(byTestId(ops(), `delete-operation-${added}`));
  const dialog = byTestId(h.root, 'delete-operation-dialog');
  expect(allText(dialog)).toContain('Polishing will be removed');
  await press(byText(dialog, 'Delete'));
  expect(saved().lineItems).toHaveLength(9);
  // Done: back to reading.
  await press(byTestId(ops(), 'done-operations'));
  expect(h.currentRoute()).toBe('InvoiceOperations');
  expect(hasTestId(ops(), 'edit-operation-op1')).toBe(false);
  await h.navigate('Billing', { tab: 'invoices' });
  // Swipeable pages; the header's search follows the open one.
  expect(hasTestId(h.root, 'billing-tab-page-invoices')).toBe(true);
  expect(byLabel(h.root, 'Search by invoice, customer or WO #')).toBeTruthy();
  await press(byTestId(h.root, 'billing-tabs-quotes'));
  expect(h.currentRoute()).toBe('quotes');
  expect(byLabel(h.root, 'Search by quote, customer or part')).toBeTruthy();
  expect(() =>
    byLabel(h.root, 'Search by invoice, customer or WO #'),
  ).toThrow();
  expect(hasTestId(h.root, 'quote-stats')).toBe(false);
  const quote = byTestId(h.root, 'quote-card-QT-2026-0042');
  expect(allText(quote)).toContain('Part name|Machined Shaft|Quantity|150 pcs');
  expect(allText(quote)).toContain('View quote');
  expect(allText(quote)).not.toContain('Created on');
  // Sent: neither edited nor deleted. A draft has both.
  expect(() => byLabel(quote, 'Edit QT-2026-0042')).toThrow();
  expect(hasTestId(quote, 'delete-QT-2026-0042')).toBe(false);
  const draft = byTestId(h.root, 'quote-card-QT-2026-0038');
  expect(byLabel(draft, 'Edit QT-2026-0038')).toBeTruthy();
  expect(hasTestId(draft, 'delete-QT-2026-0038')).toBe(true);
  // Back from a quote returns to the Quotes tab.
  await press(quote);
  expect(h.currentRoute()).toBe('QuoteDetails');
  await press(byLabel(h.root, 'Back'));
  expect(h.currentRoute()).toBe('quotes');
  // On Quotes, the top bar's + creates a quote; Invoices has none.
  await press(byTestId(h.root, 'create-quote'));
  expect(h.currentRoute()).toBe('QuoteForm');
  await h.navigate('Billing');
  await press(byTestId(h.root, 'billing-tabs-invoices'));
  expect(hasTestId(h.root, 'create-quote')).toBe(false);
});

test('phone: quote at a glance, Edit quote sheet and operations bill', async () => {
  mockWidth = 390;
  const h = await renderAdmin('Billing');
  await press(byTestId(h.root, 'billing-tabs-quotes'));
  await press(byLabel(h.root, 'View QT-2026-0042'));
  const details = () => byTestId(h.root, 'quote-details-screen');
  // Like the invoice: number, status and total, then small cards.
  expect(allText(byTestId(details(), 'quote-overview'))).toMatch(
    /^QT-2026-0042\|Sent\|₹42,000\|Customer\|.*ABC Engineering\|Convert to Order\|Part details\|Part name\|Machined Shaft\|Quantity\|150 pcs\|Process operations\|4 operations · ₹40,000\|Amount details\|/,
  );
  expect(allText(details())).toMatch(/Preview Quote\|Download PDF$/);
  // Sent: no Edit.
  expect(hasTestId(details(), 'edit-quote')).toBe(false);

  // A draft: the header's Edit slides up Edit quote, without the
  // operations or a status.
  await h.navigate('QuoteDetails', { quoteId: 'QT-2026-0038' });
  expect(allText(byTestId(details(), 'quote-overview'))).toContain(
    'Send Quote',
  );
  const saved = () =>
    h.store.getState().billing.quotes.entities['QT-2026-0038']!;
  await press(byTestId(details(), 'edit-quote'));
  expect(h.currentRoute()).toBe('QuoteEdit');
  const form = () => byTestId(h.root, 'quote-edit-form');
  expect(hasTestId(form(), 'line-op1-minutes')).toBe(false);
  expect(hasTestId(form(), 'quote-status')).toBe(false);
  await typeInto(byTestId(form(), 'quote-part'), 'Long Bracket');
  await press(byTestId(h.root, 'save-quote'));
  expect(saved().partName).toBe('Long Bracket');
  expect(saved().lineItems).toHaveLength(3);
  expect(h.currentRoute()).toBe('QuoteDetails');

  // Process operations: the same bill, edited one at a time.
  await press(byTestId(details(), 'quote-open-operations'));
  expect(h.currentRoute()).toBe('QuoteOperations');
  const ops = () => byTestId(h.root, 'quote-operations-screen');
  expect(allText(byTestId(ops(), 'operations-subtotal'))).toBe('₹15,000');
  await press(byTestId(ops(), 'edit-operations'));
  await press(byTestId(ops(), 'edit-operation-op1'));
  const sheet = () => byTestId(h.root, 'operation-sheet');
  await typeInto(byTestId(sheet(), 'operation-minutes'), '3');
  await press(byTestId(sheet(), 'save-operation'));
  expect(saved().lineItems[0].minutesPerPiece).toBe(3);
  await press(byTestId(ops(), 'delete-operation-op3'));
  const dialog = byTestId(h.root, 'delete-operation-dialog');
  expect(allText(dialog)).toContain('removed from this quote');
  await press(byText(dialog, 'Delete'));
  expect(saved().lineItems).toHaveLength(2);
  await press(byLabel(ops(), 'Back'));
  expect(h.currentRoute()).toBe('QuoteDetails');
});

test('table rows use icon buttons for view and edit', async () => {
  const h = await renderAdmin('Billing');
  expect(() => byText(h.root, 'View')).toThrow();
  expect(() => byText(h.root, 'Edit')).toThrow();

  await press(byLabel(h.root, 'View INV-2026-0125'));
  expect(h.currentRoute()).toBe('InvoiceDetails');

  await h.navigate('Billing');
  // Edit opens the invoice already in edit mode.
  await press(byLabel(h.root, 'Edit INV-2026-0125'));
  expect(h.currentRoute()).toBe('InvoiceDetails');
  expect(hasTestId(h.root, 'save-invoice')).toBe(true);
  expect(hasTestId(h.root, 'line-op1-rate')).toBe(true);

  await h.navigate('Billing');
  await press(byText(h.root, 'Quotes'));
  await press(byLabel(h.root, 'Edit QT-2026-0038'));
  expect(h.currentRoute()).toBe('QuoteDetails');
});

test('wide screens: the Invoices / Quotes tabs sit in the table toolbar', async () => {
  const { root } = await renderAdmin('Billing');
  const tabsIn = (tableId: string) =>
    byTestId(root, tableId)
      .findAll(n => n.props.accessibilityRole === 'tab' && n.props.onPress)
      .map(t => allText(t));

  expect(tabsIn('invoices-table')).toEqual(['Invoices', 'Quotes']);
  const quotesTab = byTestId(root, 'invoices-table').find(
    n =>
      n.props.accessibilityRole === 'tab' &&
      n.props.onPress &&
      allText(n) === 'Quotes',
  );
  await press(quotesTab);
  expect(tabsIn('quotes-table')).toEqual(['Invoices', 'Quotes']);
});
