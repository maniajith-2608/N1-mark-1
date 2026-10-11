/* eslint-env jest */
// Test-only helpers for rendering admin screens against the real store and mock API.
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import ReactTestRenderer, {
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';
import { N1ThemeProvider } from '../components';
import AdminDashboardNavigation from '../../app/navigation/AdminDashboardNavigation';
import RootNavigator from '../../app/navigation/RootNavigator';
import type { AdminDrawerParamList } from '../../features/dashboard/types';
import { customersApi } from '../../features/customers/api/customersApi';
import { invoicesApi, quotesApi } from '../../features/billing/api/billingApi';
import { jobCardsApi } from '../../features/jobCards/api/jobCardsApi';
import { myJobsApi } from '../../features/jobs/api/myJobsApi';
import { machinesApi } from '../../features/machines/api/machinesApi';
import { ordersApi } from '../../features/orders/api/ordersApi';
import { profileApi } from '../../features/profile/api/profileApi';
import { employeeProfileApi } from '../../features/profile/api/employeeProfileApi';
import { userManagementApi } from '../../features/userManagement/api/userManagementApi';
import { createStore } from '../../app/store';

const SAFE_AREA = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** Puts every mock collection back to its seed data. */
export function resetMockApis() {
  [
    customersApi,
    invoicesApi,
    quotesApi,
    jobCardsApi,
    myJobsApi,
    machinesApi,
    ordersApi,
    profileApi,
    employeeProfileApi,
    userManagementApi,
  ].forEach(api => api.reset());
}

/** Lets pending mock requests and sagas finish. */
export async function flush(rounds = 5) {
  for (let i = 0; i < rounds; i += 1) {
    await ReactTestRenderer.act(async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    });
  }
}

export async function render(element: ReactElement): Promise<Renderer> {
  let renderer: Renderer | undefined;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(element);
  });
  await flush();
  return renderer as Renderer;
}

/**
 * The whole app (root navigator with deep linking) on the login screen, signed
 * in with these credentials. Unmount it after the test: only one linked
 * NavigationContainer may be mounted at a time.
 */
export async function renderAppAs(
  email: string,
  password: string,
  /** Extra mock data, added after the reset and before the app loads. */
  seed?: () => Promise<unknown>,
) {
  resetMockApis();
  await seed?.();
  const app = await render(
    <Provider store={createStore()}>
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <N1ThemeProvider>
          <RootNavigator />
        </N1ThemeProvider>
      </SafeAreaProvider>
    </Provider>,
  );
  await logIn(app.root, email, password);
  return app;
}

/** Fills the login form and presses Log in. */
export async function logIn(
  root: ReactTestInstance,
  email: string,
  password: string,
) {
  const [emailInput, passwordInput] = root.findAll(
    n => isHost(n) && n.props.placeholder !== undefined,
  );
  await typeInto(emailInput, email);
  await typeInto(passwordInput, password);
  await press(byLabel(root, 'Log in'));
}

type DrawerRoute = keyof AdminDrawerParamList;

/** Screens of each drawer item's stack; the first is the stack's initial screen. */
const DRAWER_STACKS: Record<DrawerRoute, string[]> = {
  Overview: ['DashboardHome'],
  Users: ['UsersList', 'UserDetails'],
  Customers: ['CustomersList', 'CustomerDetails'],
  Orders: ['OrdersList', 'OrderDetails', 'OrderForm'],
  JobCards: ['JobCardsList', 'JobCardDetails'],
  Machines: ['MachinesList', 'MachineDetails'],
  Profile: ['MyProfile'],
  Organization: ['Organization'],
  Billing: ['BillingHome', 'InvoiceDetails', 'QuoteDetails', 'QuoteForm'],
};

const ROUTE_ALIASES: Record<string, string> = { Dashboard: 'Overview' };

/** Each stack's first screen is reported by its drawer item ("Orders"). */
const STACK_HOME_NAMES: Record<string, string> = Object.fromEntries(
  (Object.keys(DRAWER_STACKS) as DrawerRoute[])
    .filter(drawer => drawer !== 'Profile')
    .map(drawer => [
      DRAWER_STACKS[drawer][0],
      drawer === 'Overview' ? 'Dashboard' : drawer,
    ]),
);

/**
 * Turns a drawer item ("Machines") or a nested screen ("OrderDetails") into
 * the drawer route plus nested screen React Navigation needs.
 */
function resolveRoute(name: string, params?: object) {
  const route = ROUTE_ALIASES[name] ?? name;
  if (route in DRAWER_STACKS) {
    const drawer = route as DrawerRoute;
    return { drawer, screen: DRAWER_STACKS[drawer][0], params };
  }
  const drawer = (Object.keys(DRAWER_STACKS) as DrawerRoute[]).find(d =>
    DRAWER_STACKS[d].includes(route),
  );
  if (!drawer) {
    throw new Error(`Unknown admin route "${name}"`);
  }
  return { drawer, screen: route, params };
}

export type AdminHarness = {
  renderer: Renderer;
  root: ReactTestInstance;
  store: ReturnType<typeof createStore>;
  /** A drawer item ("Machines") or a nested screen ("OrderDetails"). */
  navigate: (route: string, params?: object) => Promise<void>;
  /** The focused screen; a stack's first screen is named by its drawer item. */
  currentRoute: () => string | undefined;
  /** The drawer's navigation state, with each stack's routes nested. */
  navState: () => ReturnType<typeof navigationState>;
};

type NavState = {
  routes: { name: string; state?: NavState }[];
};
const navigationState = (ref: { getRootState: () => unknown }) =>
  ref.getRootState() as NavState;

/** Renders the whole admin module (drawer + feature stacks) with a fresh store. */
export async function renderAdmin(
  initialRoute: string = 'Overview',
): Promise<AdminHarness> {
  resetMockApis();
  const store = createStore();
  const navRef = createNavigationContainerRef<AdminDrawerParamList>();
  const initial = resolveRoute(initialRoute);
  const renderer = await render(
    <Provider store={store}>
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <N1ThemeProvider>
          <NavigationContainer ref={navRef}>
            <AdminDashboardNavigation initialRouteName={initial.drawer} />
          </NavigationContainer>
        </N1ThemeProvider>
      </SafeAreaProvider>
    </Provider>,
  );
  const navigate = async (route: string, params?: object) => {
    const target = resolveRoute(route, params);
    await ReactTestRenderer.act(() => {
      // Nested params are typed per drawer item; the harness takes any route.
      (navRef.navigate as (r: string, p: object) => void)(target.drawer, {
        screen: target.screen,
        params: target.params,
      });
    });
    await flush();
  };
  if (initial.screen !== DRAWER_STACKS[initial.drawer][0]) {
    await navigate(initialRoute);
  }
  return {
    renderer,
    root: renderer.root,
    store,
    navigate,
    navState: () => navigationState(navRef),
    currentRoute: () => {
      const name = navRef.getCurrentRoute()?.name;
      return name ? STACK_HOME_NAMES[name] ?? name : name;
    },
  };
}

const isHost = (n: ReactTestInstance) => typeof n.type === 'string';

/** Every string rendered in a Text, joined with "|". */
export function allText(root: ReactTestInstance): string {
  return root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => n.children.filter(c => typeof c === 'string').join(''))
    .join('|');
}

export function byTestId(
  root: ReactTestInstance,
  testID: string,
): ReactTestInstance {
  const [node] = root.findAll(n => isHost(n) && n.props.testID === testID);
  if (!node) {
    throw new Error(`No element with testID "${testID}"`);
  }
  return node;
}

export const hasTestId = (root: ReactTestInstance, testID: string) =>
  root.findAll(n => isHost(n) && n.props.testID === testID).length > 0;

export function byLabel(
  root: ReactTestInstance,
  label: string,
): ReactTestInstance {
  const [node] = root.findAll(
    n => isHost(n) && n.props.accessibilityLabel === label,
  );
  if (!node) {
    throw new Error(`No element labelled "${label}"`);
  }
  return node;
}

/** The nearest host element with this exact text. */
export function byText(
  root: ReactTestInstance,
  text: string,
): ReactTestInstance {
  const [node] = root.findAll(
    n =>
      (n.type as unknown) === 'Text' &&
      n.children.filter(c => typeof c === 'string').join('') === text,
  );
  if (!node) {
    throw new Error(`No text "${text}"`);
  }
  return node;
}

/** Presses the nearest pressable ancestor of `node`, then lets sagas run. */
export async function press(node: ReactTestInstance) {
  let target: ReactTestInstance | null = node;
  while (target && typeof target.props.onPress !== 'function') {
    target = target.parent;
  }
  if (!target) {
    throw new Error('Nothing pressable here');
  }
  const pressable = target;
  await ReactTestRenderer.act(() => {
    pressable.props.onPress();
  });
  await flush();
}

/** Types into the TextInput inside `node` (a testID'd input or its container). */
export async function typeInto(node: ReactTestInstance, text: string) {
  const input =
    typeof node.props.onChangeText === 'function'
      ? node
      : node.find(n => isHost(n) && typeof n.props.onChangeText === 'function');
  await ReactTestRenderer.act(() => {
    input.props.onChangeText(text);
  });
  await flush();
}

/** Picks an option from an N1DropDown by its label. */
export async function choose(
  root: ReactTestInstance,
  dropdownTestId: string,
  optionLabel: string,
) {
  await press(byTestId(root, dropdownTestId));
  const options = root.findAll(
    n =>
      isHost(n) &&
      n.props.accessibilityRole === 'menuitem' &&
      allText(n) === optionLabel,
  );
  if (!options.length) {
    throw new Error(`No option "${optionLabel}"`);
  }
  await press(options[options.length - 1]);
}
