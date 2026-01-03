import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { CustomersStackParamList } from './types';
import { useTheme } from '@contexts/ThemeContext';
import CustomersScreen from '@screens/customers/CustomersScreen';
import CustomerDetailScreen from '@screens/customers/CustomerDetailScreen';
import AddCustomerScreen from '@screens/customers/AddCustomerScreen';

const Stack = createStackNavigator<CustomersStackParamList>();

export default function CustomersStack() {
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
        name="Customers"
        component={CustomersScreen}
        options={{ 
          title: 'Customers',
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
        options={{ title: 'Customer Details' }}
      />
      <Stack.Screen
        name="AddCustomer"
        component={AddCustomerScreen}
        options={{ title: 'Add Customer' }}
      />
    </Stack.Navigator>
  );
}
