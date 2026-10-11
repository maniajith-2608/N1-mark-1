import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BillingScreen } from '../screens/BillingScreen';
import { SHEET_SCREEN_OPTIONS } from '../../../shared/constants';
import { InvoiceDetailsScreen } from '../screens/InvoiceDetailsScreen';
import { InvoiceEditScreen } from '../screens/InvoiceEditScreen';
import { InvoiceOperationsScreen } from '../screens/InvoiceOperationsScreen';
import { QuoteDetailsScreen } from '../screens/QuoteDetailsScreen';
import { QuoteEditScreen } from '../screens/QuoteEditScreen';
import { QuoteOperationsScreen } from '../screens/QuoteOperationsScreen';
import { QuoteFormScreen } from '../screens/QuoteFormScreen';
import type { BillingStackParamList } from '../types';

const Stack = createNativeStackNavigator<BillingStackParamList>();

// Nested inside the admin drawer's "Billing" item, which already draws the
// top bar, so the stack hides its own header.
function BillingNavigation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BillingHome" component={BillingScreen} />
      <Stack.Screen name="InvoiceDetails" component={InvoiceDetailsScreen} />
      {/* Phones: Edit invoice slides up over the invoice. */}
      <Stack.Screen
        name="InvoiceEdit"
        component={InvoiceEditScreen}
        options={SHEET_SCREEN_OPTIONS}
      />
      <Stack.Screen
        name="InvoiceOperations"
        component={InvoiceOperationsScreen}
      />
      <Stack.Screen name="QuoteDetails" component={QuoteDetailsScreen} />
      {/* Phones: Edit quote slides up over the quote. */}
      <Stack.Screen
        name="QuoteEdit"
        component={QuoteEditScreen}
        options={SHEET_SCREEN_OPTIONS}
      />
      <Stack.Screen name="QuoteOperations" component={QuoteOperationsScreen} />
      <Stack.Screen name="QuoteForm" component={QuoteFormScreen} />
    </Stack.Navigator>
  );
}

export default React.memo(BillingNavigation);
