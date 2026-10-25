import { useAppSelector } from '../../../app/store/hooks';
import { selectHasPermission } from '../store/selectors';

/**
 * Whether the signed-in person holds a permission code from me.permissions,
 * e.g. usePermission('customers.delete'). False until their profile loads.
 */
export function usePermission(code: string): boolean {
  return useAppSelector(state => selectHasPermission(state, code));
}
