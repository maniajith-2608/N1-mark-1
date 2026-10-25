import { CustomersCard } from '../components/CustomersCard';
import { PriorityJobsCard } from '../components/PriorityJobsCard';
import { PHONE, WIDE, allText, render } from '../../../shared/testing/render';

jest.mock('../../../shared/hooks/useN1Breakpoint', () => ({
  useN1Breakpoint: () => {
    const { width } = jest.requireActual(
      '../../../shared/testing/render',
    ).screenSize;
    return { width, isCompact: width < 768, isDesktop: width >= 1024 };
  },
}));

describe.each([
  ['wide', WIDE],
  ['phone', PHONE],
])('dashboard cards with nothing in the period (%s)', (_, width) => {
  test('Customers says "No data"', async () => {
    const root = await render(
      <CustomersCard
        customers={[]}
        onOpenCustomer={jest.fn()}
        onViewAll={jest.fn()}
        scrollable
      />,
      width,
    );
    expect(root.findByProps({ testID: 'customers-empty' })).toBeTruthy();
    expect(allText(root)).toContain('No data');
    expect(root.findAllByProps({ testID: 'customers-scroll' })).toHaveLength(0);
  });

  test('Priority jobs says "No jobs"', async () => {
    const root = await render(
      <PriorityJobsCard
        jobs={[]}
        total={0}
        onOpenJob={jest.fn()}
        onViewAll={jest.fn()}
        scrollable
      />,
      width,
    );
    expect(root.findByProps({ testID: 'priority-jobs-empty' })).toBeTruthy();
    expect(allText(root)).toContain('No jobs');
  });
});
