import apiClient, { toApiError } from './apiClient';

type GraphQLResponse<T> = { data?: T | null; errors?: unknown[] };

/** A random UUID v4; Hermes has no crypto.randomUUID. */
function newIdempotencyKey(): string {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) {
    return random;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const n = Math.floor(Math.random() * 16);
    // "y" is the variant digit: 8, 9, a or b.
    return (c === 'x' ? n : 8 + (n % 4)).toString(16);
  });
}

/**
 * Runs one operation on POST /graphql and returns its data. Every mutation
 * gets a fresh Idempotency-Key; the token-refresh retry resends the same one,
 * so a retried save is never applied twice.
 */
export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<T> {
  const isMutation = /^\s*mutation\b/.test(query);
  const { status, data } = await apiClient.post<GraphQLResponse<T>>(
    '/graphql',
    { query, variables },
    {
      headers: {
        ...(isMutation ? { 'Idempotency-Key': newIdempotencyKey() } : {}),
        ...headers,
      },
    },
  );
  if (data.errors?.length || !data.data) {
    throw toApiError(status, data);
  }
  return data.data;
}
