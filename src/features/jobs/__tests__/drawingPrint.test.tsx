import ReactTestRenderer from 'react-test-renderer';
import {
  byTestId,
  press,
  renderAppAs,
} from '../../../shared/testing/testUtils';

// Wide screens: the Drawing screen has Print drawing with QR (phones don't).
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 1280, height: 900, scale: 1, fontScale: 1 }),
}));

const mockPrintHtml = jest.fn((_html: string, _jobName: string) =>
  Promise.resolve(true),
);
jest.mock('../../../services/print/printHtml', () => ({
  printHtml: (html: string, jobName: string) => mockPrintHtml(html, jobName),
}));

// Native builds can't stamp drawings: stamping returns nothing here, so the
// stored file prints on its own sheet with the QR.
const mockStampDrawing = jest.fn();
jest.mock('../../orders/drawingStamp/stampDrawing', () => ({
  ...jest.requireActual('../../orders/drawingStamp/stampDrawing'),
  stampDrawing: (...args: unknown[]) => mockStampDrawing(...args),
  stampedPreview: () => Promise.resolve(null),
}));

let app: ReactTestRenderer.ReactTestRenderer | undefined;

beforeEach(() => {
  mockPrintHtml.mockClear();
  mockStampDrawing.mockReset();
  mockStampDrawing.mockResolvedValue(null);
});

// Only one linked NavigationContainer may be mounted at a time.
afterEach(async () => {
  await ReactTestRenderer.act(() => app?.unmount());
  app = undefined;
});

test('operator prints the stored drawing with the QR, not the placeholder sheet', async () => {
  app = await renderAppAs('operator@n1.com', 'Operator@123');
  const root = app.root;
  await press(byTestId(root, 'job-row-1037'));
  await press(byTestId(root, 'station-drawing'));

  await press(byTestId(root, 'drawing-print'));
  // The job's design file is stamped with the order's QR...
  expect(mockStampDrawing).toHaveBeenCalledTimes(1);
  expect(mockStampDrawing.mock.calls[0][0]).toMatchObject({
    id: 'design',
    name: 'drawing.pdf',
  });
  // ...and printed as that file, not the drawing-number placeholder.
  expect(mockPrintHtml).toHaveBeenCalledTimes(1);
  expect(mockPrintHtml.mock.calls[0][1]).toBe('drawing.pdf');
});
