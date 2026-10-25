import { graphqlRequest } from '../graphql';
import {
  definedOnly,
  fetchAllNodes,
  fromPaise,
  fromWireEnum,
  textOrNull,
  toPaise,
  toWireEnum,
} from '../wire';

jest.mock('../graphql', () => ({ graphqlRequest: jest.fn() }));
const request = graphqlRequest as jest.MockedFunction<typeof graphqlRequest>;

const page = (ids: string[], endCursor: string | null) => ({
  things: {
    edges: ids.map(id => ({ node: { id } })),
    pageInfo: { hasNextPage: endCursor !== null, endCursor },
  },
});

test('fetchAllNodes follows endCursor until the last page', async () => {
  request
    .mockResolvedValueOnce(page(['a', 'b'], 'c1'))
    .mockResolvedValueOnce(page(['c'], null));

  const nodes = await fetchAllNodes('query', 'things', { search: 'x' });

  expect(nodes).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  expect(request.mock.calls.map(call => call[1])).toEqual([
    { search: 'x', after: null },
    { search: 'x', after: 'c1' },
  ]);
});

test('wire shapes: null for blank text, paise, uppercase enums', () => {
  expect(textOrNull('  ')).toBeNull();
  expect(textOrNull(undefined)).toBeNull();
  expect(textOrNull(' Pune ')).toBe('Pune');
  expect(toPaise(1234.5)).toBe(123450);
  expect(fromPaise(123450)).toBe(1234.5);
  expect(toWireEnum('in_progress')).toBe('IN_PROGRESS');
  expect(fromWireEnum('IN_PROGRESS')).toBe('in_progress');
  expect(definedOnly({ a: 1, b: undefined, c: null })).toEqual({
    a: 1,
    c: null,
  });
});
