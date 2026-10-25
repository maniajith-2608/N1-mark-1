/* eslint-env jest */
import 'react-native-gesture-handler/jestSetup';

// The native drawer views depend on Reanimated, whose native module is
// unavailable under Jest. Use their plain-JS (web) implementations instead.
// The web drawer listens for DOM transition events on its View, which the test
// renderer can't provide, so use the same layout without those listeners.
jest.mock(
  './node_modules/react-native-drawer-layout/lib/module/views/Drawer',
  () => {
    const React = require('react');
    const { View } = require('react-native');
    const {
      DrawerProgressContext,
    } = require('./node_modules/react-native-drawer-layout/lib/module/utils/DrawerProgressContext.js');
    function Drawer({
      drawerType = 'front',
      drawerStyle,
      open,
      renderDrawerContent,
      children,
      style,
    }) {
      const visible = drawerType === 'permanent' || open;
      return React.createElement(
        DrawerProgressContext.Provider,
        { value: { value: visible ? 1 : 0 } },
        React.createElement(
          View,
          { style: [{ flex: 1, flexDirection: 'row' }, style] },
          React.createElement(
            View,
            { style: drawerStyle, 'aria-hidden': !visible },
            renderDrawerContent(),
          ),
          React.createElement(View, { style: { flex: 1 } }, children),
        ),
      );
    }
    return { Drawer };
  },
);
jest.mock(
  './node_modules/react-native-drawer-layout/lib/module/views/Overlay',
  () =>
    jest.requireActual(
      './node_modules/react-native-drawer-layout/lib/module/views/Overlay.js',
    ),
);

// VisionCamera is native-only. The mock Camera renders a View carrying its
// props, so tests can read `isActive` / `torchMode` and fire a scan through
// `outputs[0].onBarcodeScanned`. Set `__permission.status` to test prompts
// and `__device.current` to test a phone without a back camera.
jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  const permission = {
    status: 'authorized',
    request: jest.fn(async () => true),
  };
  const device = { current: { id: 'back', hasTorch: true } };
  return {
    __permission: permission,
    __device: device,
    useCameraPermission: () => ({
      status: permission.status,
      hasPermission: permission.status === 'authorized',
      canRequestPermission: permission.status === 'not-determined',
      requestPermission: permission.request,
    }),
    useCameraDevice: () => device.current,
    Camera: props =>
      React.createElement(View, { testID: 'qr-camera', ...props }),
  };
});
jest.mock('react-native-vision-camera-barcode-scanner', () => ({
  useBarcodeScannerOutput: options => options,
}));

// The native date picker: the mock renders a View carrying its props, so
// tests can turn the wheels with `onValueChange(event, date)`.
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  const DateTimePicker = props =>
    React.createElement(View, { ...props, testID: props.testID });
  return {
    __esModule: true,
    default: DateTimePicker,
    DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
  };
});

// Tests never reach the N1 Core API: these features run on in-memory stand-ins.
jest.mock('./src/features/auth/api/authApi', () =>
  jest.requireActual('./src/features/auth/api/mockAuthApi'),
);
jest.mock('./src/features/userManagement/api/userManagementApi', () =>
  jest.requireActual('./src/features/userManagement/api/mockUserManagementApi'),
);
jest.mock('./src/features/billing/api/billingApi', () =>
  jest.requireActual('./src/features/billing/api/mockBillingApi'),
);
jest.mock('./src/features/customers/api/customersApi', () =>
  jest.requireActual('./src/features/customers/api/mockCustomersApi'),
);
jest.mock('./src/features/jobCards/api/jobCardsApi', () =>
  jest.requireActual('./src/features/jobCards/api/mockJobCardsApi'),
);
jest.mock('./src/features/jobs/api/myJobsApi', () =>
  jest.requireActual('./src/features/jobs/api/mockMyJobsApi'),
);
jest.mock('./src/features/machines/api/machinesApi', () =>
  jest.requireActual('./src/features/machines/api/mockMachinesApi'),
);
jest.mock('./src/features/orders/api/ordersApi', () =>
  jest.requireActual('./src/features/orders/api/mockOrdersApi'),
);
jest.mock('./src/features/profile/api/profileApi', () =>
  jest.requireActual('./src/features/profile/api/mockProfileApi'),
);
jest.mock('./src/features/profile/api/employeeProfileApi', () =>
  jest.requireActual('./src/features/profile/api/mockEmployeeProfileApi'),
);
jest.mock('./src/features/dashboard/api/dashboardApi', () =>
  jest.requireActual('./src/features/dashboard/api/mockDashboardApi'),
);
