import { ALL, MENU_ITEMS, SAMPLE_USERS } from '../constants';
import type { Invoice } from '../../billing';
import { invoiceTotal } from '../../billing';
import type { WorkOrder } from '../../orders';
import type { JobCard } from '../../jobCards';
import type { CustomerShare } from '../../customers';
import {
  byDueDate,
  customerRows,
  withRouteCards,
  filterUsers,
  isDueSoon,
  periodStart,
  summarizePeriod,
  visibleMenuItems,
} from '../utils';

const labels = (items: { label: string }[]) => items.map(i => i.label);

describe('visibleMenuItems', () => {
  test('wide screens show every section', () => {
    expect(
      labels(visibleMenuItems(MENU_ITEMS, { compact: false, query: '' })),
    ).toEqual([
      'Dashboard',
      'Employees',
      'Customers',
      'Orders',
      'Job Cards',
      'Machines',
      'Billing',
    ]);
  });

  test('phones show every module too', () => {
    expect(
      labels(visibleMenuItems(MENU_ITEMS, { compact: true, query: '' })),
    ).toEqual([
      'Dashboard',
      'Employees',
      'Customers',
      'Orders',
      'Job Cards',
      'Machines',
      'Billing',
    ]);
  });

  test('search matches labels case-insensitively', () => {
    expect(
      labels(visibleMenuItems(MENU_ITEMS, { compact: false, query: ' CARD ' })),
    ).toEqual(['Job Cards']);
  });
});

describe('filterUsers', () => {
  const run = (query = '', role = ALL, status = ALL) =>
    filterUsers(SAMPLE_USERS, { query, role, status }).map(u => u.name);

  test('no filters returns everyone', () => {
    expect(run()).toHaveLength(SAMPLE_USERS.length);
  });

  test('search matches name or email', () => {
    expect(run('priya')).toEqual(['Priya Sharma']);
    expect(run('KARTHIK.IYER@')).toEqual(['Karthik Iyer']);
  });

  test('role and status filters combine', () => {
    expect(run('', 'admin')).toEqual(['Koushik Dasarathan']);
    expect(run('', 'user', 'active')).toEqual(['Priya Sharma', 'Divya Rao']);
    expect(run('', ALL, 'suspended')).toEqual(['Karthik Iyer']);
  });

  test('no match returns an empty list', () => {
    expect(run('nobody')).toEqual([]);
  });
});

// Sunday 18 Oct 2026, mid-afternoon (local time).
const NOW = new Date(2026, 9, 18, 15, 0);

describe('periodStart', () => {
  test('Sunday still belongs to the week that began on Monday', () => {
    expect(periodStart('week', NOW)).toEqual(new Date(2026, 9, 12));
  });
  test('a Monday starts a new week', () => {
    expect(periodStart('week', new Date(2026, 9, 19, 9))).toEqual(
      new Date(2026, 9, 19),
    );
  });
  test('month and year start on the 1st', () => {
    expect(periodStart('month', NOW)).toEqual(new Date(2026, 9, 1));
    expect(periodStart('year', NOW)).toEqual(new Date(2026, 0, 1));
  });
});

describe('summarizePeriod', () => {
  const invoice = (
    id: string,
    issuedAt: Date,
    status: Invoice['status'],
    rate: number,
  ) =>
    ({
      id,
      status,
      issuedAt: issuedAt.toISOString(),
      quantity: 1,
      discount: 0,
      gstRate: 0,
      // Invoices carry the server's totals.
      totals: { total: rate },
      lineItems: [
        {
          id: `${id}-1`,
          operation: 'Turning',
          description: '',
          minutesPerPiece: 1,
          setupMinutes: 0,
          ratePerMinute: rate,
        },
      ],
    } as unknown as Invoice);
  const order = (id: string, createdAt: Date) =>
    ({ id, createdAt: createdAt.toISOString() } as unknown as WorkOrder);

  const thisWeekPaid = invoice('a', new Date(2026, 9, 14), 'paid', 100);
  const thisMonthUnpaid = invoice('b', new Date(2026, 9, 3), 'new', 200);
  const thisYearUnpaid = invoice('c', new Date(2026, 2, 10), 'overdue', 400);
  const thisWeekNew = invoice('d', new Date(2026, 9, 15), 'new', 800);
  const lastYear = invoice('e', new Date(2025, 11, 30), 'new', 1600);
  const invoices = [
    thisWeekPaid,
    thisMonthUnpaid,
    thisYearUnpaid,
    thisWeekNew,
    lastYear,
  ];
  const total = (...list: Invoice[]) =>
    list.reduce((s, i) => s + invoiceTotal(i), 0);

  const orders = [
    order('1', new Date(2026, 9, 17)),
    order('2', new Date(2026, 9, 2)),
    order('3', new Date(2026, 4, 1)),
    order('4', new Date(2025, 5, 1)),
  ];

  test('week: only what happened since Monday; new bills count as billed', () => {
    expect(summarizePeriod(invoices, orders, 'week', NOW)).toEqual({
      billed: total(thisWeekPaid, thisWeekNew),
      outstanding: total(thisWeekNew),
      orders: 1,
    });
  });
  test('month widens to the 1st; outstanding is the unpaid part', () => {
    expect(summarizePeriod(invoices, orders, 'month', NOW)).toEqual({
      billed: total(thisWeekPaid, thisMonthUnpaid, thisWeekNew),
      outstanding: total(thisMonthUnpaid, thisWeekNew),
      orders: 2,
    });
  });
  test('year covers since 1 January, never last year', () => {
    expect(summarizePeriod(invoices, orders, 'year', NOW)).toEqual({
      billed: total(thisWeekPaid, thisMonthUnpaid, thisYearUnpaid, thisWeekNew),
      outstanding: total(thisMonthUnpaid, thisYearUnpaid, thisWeekNew),
      orders: 3,
    });
  });
});

describe('priority jobs', () => {
  test('isDueSoon: overdue or within 3 days is soon; later is not', () => {
    expect(isDueSoon(new Date(2026, 9, 10).toISOString(), NOW)).toBe(true);
    expect(isDueSoon(new Date(2026, 9, 18).toISOString(), NOW)).toBe(true);
    expect(isDueSoon(new Date(2026, 9, 21, 23).toISOString(), NOW)).toBe(true);
    expect(isDueSoon(new Date(2026, 9, 22).toISOString(), NOW)).toBe(false);
    expect(isDueSoon('', NOW)).toBe(false);
  });

  test('byDueDate: earliest first, missing dates last, input untouched', () => {
    const card = (id: string, dueDate: string) =>
      ({ id, dueDate } as unknown as JobCard);
    const cards = [
      card('b', '2026-10-12'),
      card('none', ''),
      card('a', '2026-10-02'),
    ];
    expect(byDueDate(cards).map(c => c.id)).toEqual(['a', 'b', 'none']);
    expect(cards.map(c => c.id)).toEqual(['b', 'none', 'a']);
  });
});

describe('customerRows', () => {
  const share = (id: string, percent: number) =>
    ({ id, name: id, percent } as unknown as CustomerShare);
  const order = (customerId: string, status: WorkOrder['status']) =>
    ({ id: `${customerId}-${status}`, customerId, status } as WorkOrder);

  test('biggest share first; pending delivery counts unfinished orders', () => {
    const rows = customerRows(
      [share('small', 10), share('big', 60)],
      [
        order('big', 'new'),
        order('big', 'in_progress'),
        order('big', 'completed'),
        order('small', 'paused'),
      ],
    );
    expect(rows.map(r => [r.id, r.pendingDelivery])).toEqual([
      ['big', 2],
      ['small', 1],
    ]);
  });

  test('a customer with no open orders has 0 pending', () => {
    expect(customerRows([share('a', 50)], [])[0].pendingDelivery).toBe(0);
  });
});

describe('withRouteCards', () => {
  test('takes the RC number from the matching order, else the WO number', () => {
    const card = (orderId: string, number: string) =>
      ({ id: `jc-${orderId}`, orderId, number } as unknown as JobCard);
    const orders = [{ id: 'o1', routeCardNo: 'RC-2210' }] as WorkOrder[];
    expect(
      withRouteCards(
        [card('o1', 'WO-1042'), card('o2', 'WO-1099')],
        orders,
      ).map(c => [c.routeCardNo, c.workOrderNumber]),
    ).toEqual([
      ['RC-2210', 'WO-1042'],
      ['WO #1099', 'WO-1099'],
    ]);
  });
});
