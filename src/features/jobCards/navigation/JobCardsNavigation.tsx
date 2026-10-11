import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QuoteDetailsScreen } from '../../billing/screens/QuoteDetailsScreen';
import { QuoteEditScreen } from '../../billing/screens/QuoteEditScreen';
import { QuoteOperationsScreen } from '../../billing/screens/QuoteOperationsScreen';
import { CustomerDetailsScreen } from '../../customers/screens/CustomerDetailsScreen';
import { SHEET_SCREEN_OPTIONS } from '../../../shared/constants';
import { OrderDetailsScreen } from '../../orders/screens/OrderDetailsScreen';
import { OrderFormScreen } from '../../orders/screens/OrderFormScreen';
import { JobCardDetailsScreen } from '../screens/JobCardDetailsScreen';
import { JobCardsListScreen } from '../screens/JobCardsListScreen';
import type { JobCardsStackParamList } from '../types';

const Stack = createNativeStackNavigator<JobCardsStackParamList>();
/** Screens typed for another stack; this one carries the same params. */
type Any = React.ComponentType<any>;

// Nested inside the admin drawer's "Job Cards" item, which already draws the
// top bar, so the stack hides its own header.
function JobCardsNavigation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="JobCardsList" component={JobCardsListScreen} />
      <Stack.Screen name="JobCardDetails" component={JobCardDetailsScreen} />
      {/* A job card's work order slides in on this stack (no jump to
          Orders), and Back returns to the job card. Its Edit, customer and
          that customer's quotes open here too. Same screens as in Orders. */}
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen as Any} />
      <Stack.Screen
        name="OrderForm"
        component={OrderFormScreen as Any}
        options={SHEET_SCREEN_OPTIONS}
      />
      <Stack.Screen
        name="CustomerDetails"
        component={CustomerDetailsScreen as Any}
      />
      <Stack.Screen name="QuoteDetails" component={QuoteDetailsScreen as Any} />
      <Stack.Screen
        name="QuoteEdit"
        component={QuoteEditScreen as Any}
        options={SHEET_SCREEN_OPTIONS}
      />
      <Stack.Screen
        name="QuoteOperations"
        component={QuoteOperationsScreen as Any}
      />
    </Stack.Navigator>
  );
}

export default React.memo(JobCardsNavigation);
