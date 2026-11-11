import fs from 'fs';
import path from 'path';

// Production runs only GraphQL documents whose exact text is registered
// (backend N1C-031): the backend hashes the text we send and looks it up. A
// document built at runtime (its operation name, arguments or fields made
// from variables) has a text nobody registered, so it fails in production
// with UNKNOWN_DOCUMENT while working in dev and staging. These checks keep
// every document fixed at build time.

const SRC = path.resolve(__dirname, '../../..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return /^(__tests__|__mocks__|node_modules)$/.test(entry.name)
        ? []
        : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) && !/\.d\.ts$|mock/i.test(entry.name)
      ? [full]
      : [];
  });
}

type Doc = { file: string; line: number; text: string };

function graphqlDocuments(): Doc[] {
  return sourceFiles(SRC).flatMap(file => {
    const source = fs.readFileSync(file, 'utf8');
    return [
      ...source.matchAll(/`\s*(query|mutation|subscription)\b[^`]*\{[^`]*`/g),
    ].map(m => ({
      file: path.relative(SRC, file),
      line: source.slice(0, m.index).split('\n').length,
      text: m[0],
    }));
  });
}

const where = (d: Doc) => `${d.file}:${d.line}`;

describe('GraphQL documents are fixed at build time', () => {
  const docs = graphqlDocuments();

  it('finds the app documents', () => {
    expect(docs.length).toBeGreaterThan(50);
  });

  it('names every operation with literal text', () => {
    const dynamic = docs.filter(
      d => !/^`\s*(query|mutation|subscription)\s+[A-Z]\w*\s*[({]/.test(d.text),
    );
    expect(dynamic.map(where)).toEqual([]);
  });

  it('interpolates only module constants (fragments, page sizes)', () => {
    const dynamic = docs.flatMap(d =>
      [...d.text.matchAll(/\$\{\s*([^}]*?)\s*\}/g)]
        .filter(m => !/^[A-Z][A-Z0-9_]*$/.test(m[1]))
        .map(m => `${where(d)} \${${m[1]}}`),
    );
    expect(dynamic).toEqual([]);
  });
});
