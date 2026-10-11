import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QuoteDetailsScreen } from '../../billing/screens/QuoteDetailsScreen';
import { QuoteEditScreen } from '../../billing/screens/QuoteEditScreen';
import { QuoteOperationsScreen } from '../../billing/screens/QuoteOperationsScreen';
import { CustomerDetailsScreen } from '../../customers/screens/CustomerDetailsScreen';
import { JobCardDetailsScreen } from '../../jobCards/screens/JobCardDetailsScreen';
import { OrderDetailsScreen } from '../screens/OrderDetailsScreen';
import { OrderFormScreen } from '../screens/OrderFormScreen';
import { OrdersListScreen } from '../screens/OrdersListScreen';
import { SHEET_SCREEN_OPTIONS } from '../../../shared/constants';
import type { OrdersStackParamList } from '../types';

const Stack = createNativeStackNavigator<OrdersStackParamList>();

// Nested inside the admin drawer's "Orders" item, which already draws the
// top bar, so the stack hides its own header.
function OrdersNavigation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrdersList" component={OrdersListScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      {/* Create / Edit order slides up from the bottom over the list or
          the order, like the Edit machine sheet, and slides back down on
          Close, Cancel or save. */}
      <Stack.Screen
        name="OrderForm"
        component={OrderFormScreen}
        options={SHEET_SCREEN_OPTIONS}
      />
      {/* The same job card screen as in Job Cards, pushed here so Back
          returns to this stack's screen below it. */}
      <Stack.Screen
        name="JobCardDetails"
        component={JobCardDetailsScreen as React.ComponentType<any>}
      />
      {/* An order's customer slides in on this stack, so the move is one
          push (no jump to Customers) and Back returns to the order. Its
          orders and quotes open here too. */}
      <Stack.Screen
        name="CustomerDetails"
        component={CustomerDetailsScreen as React.ComponentType<any>}
      />
      <Stack.Screen
        name="QuoteDetails"
        component={QuoteDetailsScreen as React.ComponentType<any>}
      />
      <Stack.Screen
        name="QuoteEdit"
        component={QuoteEditScreen as React.ComponentType<any>}
        options={SHEET_SCREEN_OPTIONS}
      />
      <Stack.Screen
        name="QuoteOperations"
        component={QuoteOperationsScreen as React.ComponentType<any>}
      />
    </Stack.Navigator>
  );
}

export default React.memo(OrdersNavigation);
