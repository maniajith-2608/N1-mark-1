import {
  FilterMenu,
  HeaderSearchBar,
  N1IconButton,
  type FilterGroup,
  type FilterValues,
} from '../../../shared/components';
import { JOBS_STRINGS } from '../constants';

const S = JOBS_STRINGS.myJobs;

type Props = {
  query: string;
  onQueryChange: (text: string) => void;
  placeholder: string;
  filterGroups: FilterGroup[];
  filters: FilterValues;
  onApplyFilters: (value: FilterValues) => void;
  /** The QR scanner: imports a job. */
  onScan: () => void;
};

/**
 * The jobs home's search on the black header, with the filter and the QR
 * scanner (Import Order) beside it.
 */
export function JobsSearchRow({
  query,
  onQueryChange,
  placeholder,
  filterGroups,
  filters,
  onApplyFilters,
  onScan,
}: Props) {
  return (
    <HeaderSearchBar
      query={query}
      onQueryChange={onQueryChange}
      placeholder={placeholder}
      inputTestID="my-jobs-search"
      right={
        <>
          <FilterMenu
            variant="inverse"
            groups={filterGroups}
            value={filters}
            onApply={onApplyFilters}
            testID="my-jobs-filter"
          />
          <N1IconButton
            icon="scan"
            variant="tile"
            accessibilityLabel={S.importJob}
            onPress={onScan}
            testID="import-job"
          />
        </>
      }
    />
  );
}
