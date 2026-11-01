import type { Attachment } from '../../../shared/types';
import { MOCK_ORDERS } from '../api/mockData';
import { openDrawingWithQr } from '../drawings';
import { orderQrValue } from '../utils';

// Jest runs the native build, which has no tabs: stand in for the web tab.
const mockTab = { open: jest.fn(), show: jest.fn(), close: jest.fn() };
let mockTabAvailable = true;
jest.mock('../../../services/files/viewDocument', () => ({
  openDocument: () => false,
  reserveTab: () => (mockTabAvailable ? mockTab : null),
}));

const mockStampedPreview = jest.fn();
const mockMaskedDrawing = jest.fn();
jest.mock('../drawingStamp', () => ({
  stampedPreview: (...args: unknown[]) => mockStampedPreview(...args),
  maskedDrawing: (...args: unknown[]) => mockMaskedDrawing(...args),
}));

const doc: Attachment = {
  id: 'design',
  name: 'bracket.png',
  kind: 'Design file',
  sizeBytes: 1024,
  uri: 'https://files.example/bracket.png',
};
const order = MOCK_ORDERS[0];

beforeEach(() => {
  mockTabAvailable = true;
  Object.values(mockTab).forEach(fn => fn.mockReset());
  mockTab.open.mockReturnValue(true);
  mockStampedPreview.mockReset();
  mockMaskedDrawing.mockReset();
});

test('opens the drawing with the order QR stamped on, as images', async () => {
  mockStampedPreview.mockResolvedValue({
    pages: [
      { uri: 'data:image/png;base64,PAGE1', aspectRatio: 1.4 },
      { uri: 'data:image/png;base64,PAGE2', aspectRatio: 1.4 },
    ],
    crowdedPages: [],
  });

  await expect(openDrawingWithQr(doc, order)).resolves.toBe(true);

  // Stamped as it prints: the order's QR, customer blanked, WO number label.
  expect(mockStampedPreview).toHaveBeenCalledWith(
    doc,
    orderQrValue(order),
    order.customerName,
    `WO #${order.number}`,
  );
  // The tab says it's working, then shows every page; no PDF link opened.
  expect(mockTab.show).toHaveBeenCalledTimes(2);
  expect(mockTab.show.mock.calls[0][1]).toContain('Preparing the drawing');
  const [title, body] = mockTab.show.mock.calls[1];
  expect(title).toBe(`WO #${order.number} · bracket.png`);
  expect(body).toContain('src="data:image/png;base64,PAGE1"');
  expect(body).toContain('src="data:image/png;base64,PAGE2"');
  expect(mockTab.open).not.toHaveBeenCalled();
});

test('a file that cannot be stamped (DWG) opens masked or as stored', async () => {
  mockStampedPreview.mockResolvedValue(null);
  mockMaskedDrawing.mockResolvedValue(null);

  await expect(openDrawingWithQr(doc, order)).resolves.toBe(true);
  expect(mockTab.open).toHaveBeenCalledWith(doc.uri);
});
