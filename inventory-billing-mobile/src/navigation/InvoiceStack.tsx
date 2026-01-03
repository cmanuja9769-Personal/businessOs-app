import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { InvoiceStackParamList } from './types';
import { useTheme } from '@contexts/ThemeContext';
import InvoiceListScreen from '@screens/invoices/InvoiceListScreen';
import InvoiceDetailScreen from '@screens/invoices/InvoiceDetailScreen';
import CreateInvoiceScreen from '@screens/invoices/CreateInvoiceScreen';

const Stack = createStackNavigator<InvoiceStackParamList>();

export default function InvoiceStack() {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          color: colors.text,
        },
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen 
        name="InvoiceList" 
        component={InvoiceListScreen}
        options={{ 
          title: 'Invoices',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="InvoiceDetail" 
        component={InvoiceDetailScreen}
        options={{ 
          title: 'Invoice Details',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="CreateInvoice" 
        component={CreateInvoiceScreen}
        options={{ 
          title: 'Create Invoice',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
