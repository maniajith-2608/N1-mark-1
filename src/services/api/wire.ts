import { graphqlRequest } from './graphql';

// Shapes the N1 Core API uses on the wire (guide section 8, rule 11): enums
// are UPPERCASE, empty text is null, money is integer paise, lists are
// connections.

export type Connection<N> = {
  edges: { node: N }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  totalCount?: number;
};

/**
 * Every node of a connection, page by page. `query` must declare
 * `$after: String` and pass it to the list field; `field` names that field
 * in the result. Keep the page size a literal in the query: the cost check
 * counts a size passed as a variable as 100.
 */
export async function fetchAllNodes<N>(
  query: string,
  field: string,
  variables: Record<string, unknown> = {},
): Promise<N[]> {
  const nodes: N[] = [];
  let after: string | null = null;
  do {
    const data: Record<string, Connection<N>> = await graphqlRequest(query, {
      ...variables,
      after,
    });
    const page = data[field];
    nodes.push(...page.edges.map(edge => edge.node));
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return nodes;
}

/** Empty text is null on the wire. */
export const textOrNull = (value: string | null | undefined) =>
  value === undefined || value === null || value.trim() === ''
    ? null
    : value.trim();

/** null from the wire as the app's empty text. */
export const textOrEmpty = (value: string | null | undefined) => value ?? '';

/** Rupees (the app's unit) as whole paise. */
export const toPaise = (rupees: number) => Math.round(rupees * 100);

/** Paise from the wire as rupees. */
export const fromPaise = (paise: number) => paise / 100;

/** An app enum ("in_progress") as the wire's ("IN_PROGRESS"). */
export const toWireEnum = <T extends string>(value: T) =>
  value.toUpperCase() as Uppercase<T>;

/** A wire enum ("IN_PROGRESS") as the app's ("in_progress"). */
export const fromWireEnum = <T extends string>(value: string) =>
  value.toLowerCase() as T;

/** Only the keys that were given: an update never clears what it didn't send. */
export function definedOnly<T extends Record<string, unknown>>(
  fields: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
