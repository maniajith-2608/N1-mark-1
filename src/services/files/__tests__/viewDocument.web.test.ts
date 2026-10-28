import { openDocument, printDocument, reserveTab } from '../viewDocument.web';

type FakePopup = {
  html: string;
  printed: boolean;
  onLoad?: () => void;
  document: { write: (html: string) => void; close: () => void };
  focus: () => void;
  print: () => void;
  addEventListener: (event: string, cb: () => void) => void;
  location: { href: string };
  close: jest.Mock;
};

const g = globalThis as unknown as { open?: jest.Mock };
const original = g.open;
let popup: FakePopup;

beforeEach(() => {
  popup = {
    html: '',
    printed: false,
    document: {
      write: html => {
        popup.html += html;
      },
      close: () => {},
    },
    focus: () => {},
    print: () => {
      popup.printed = true;
    },
    addEventListener: (_event, cb) => {
      popup.onLoad = cb;
    },
    location: { href: '' },
    close: jest.fn(),
  };
  g.open = jest.fn(() => popup);
});

afterEach(() => {
  g.open = original;
});

const pdf = {
  id: 'po',
  name: 'po.pdf',
  sizeBytes: 10,
  uri: 'blob:http://localhost/123',
};

test('files with nothing to show can be neither opened nor printed', () => {
  const doc = { id: 'x', name: 'x.pdf', sizeBytes: 1 };
  expect(openDocument(doc)).toBe(false);
  expect(printDocument(doc)).toBe(false);
  expect(g.open).not.toHaveBeenCalled();
});

test('a PDF opens in a new tab, and prints once it has loaded', () => {
  expect(openDocument(pdf)).toBe(true);
  expect(g.open).toHaveBeenCalledWith(pdf.uri, '_blank');
  expect(printDocument(pdf)).toBe(true);
  expect(popup.printed).toBe(false);
  popup.onLoad?.();
  expect(popup.printed).toBe(true);
});

test('an image prints from a page of its own', () => {
  const image = {
    id: 'img',
    name: 'part <1>.png',
    sizeBytes: 10,
    uri: 'data:image/png;base64,AAAA',
  };
  expect(printDocument(image)).toBe(true);
  expect(g.open).toHaveBeenCalledWith('', '_blank');
  expect(popup.html).toContain('<title>part &lt;1&gt;.png</title>');
  expect(popup.html).toContain(`<img src="${image.uri}"`);
  expect(popup.html).toContain('window.print()');
});

test('a reserved tab opens on the tap and takes the link later', () => {
  const tab = reserveTab();
  expect(g.open).toHaveBeenCalledWith('', '_blank');
  expect(tab?.open('https://files.example/a.pdf')).toBe(true);
  expect(popup.location.href).toBe('https://files.example/a.pdf');
  tab?.close();
  expect(popup.close).toHaveBeenCalled();
});

test('no reserved tab when pop-ups are blocked', () => {
  g.open = jest.fn(() => null);
  expect(reserveTab()).toBeNull();
});
