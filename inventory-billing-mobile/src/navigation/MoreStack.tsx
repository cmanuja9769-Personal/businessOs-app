import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { MoreStackParamList } from './types';
import { useTheme } from '@contexts/ThemeContext';
import MoreScreen from '@screens/more/MoreScreen';
import CustomersScreen from '@screens/customers/CustomersScreen';
import CustomerDetailScreen from '@screens/customers/CustomerDetailScreen';
import AddCustomerScreen from '@screens/customers/AddCustomerScreen';
import SettingsScreen from '@screens/settings/SettingsScreen';
import ProfileScreen from '@screens/profile/ProfileScreen';
import SuppliersScreen from '@screens/suppliers/SuppliersScreen';
import SupplierDetailScreen from '@screens/suppliers/SupplierDetailScreen';
import AddSupplierScreen from '@screens/suppliers/AddSupplierScreen';
import PurchasesScreen from '@screens/purchases/PurchasesScreen';
import CreatePurchaseScreen from '@screens/purchases/CreatePurchaseScreen';
import PurchaseDetailScreen from '@screens/purchases/PurchaseDetailScreen';
import EwaybillsScreen from '@screens/ewaybills/EwaybillsScreen';
import PaymentsScreen from '@screens/payments/PaymentsScreen';
import RecordPaymentScreen from '@screens/payments/RecordPaymentScreen';
import ReportsScreen from '@screens/reports/ReportsScreen';
import ReportDetailScreen from '@screens/reports/ReportDetailScreen';
import OrganizationScreen from '@screens/organization/OrganizationScreen';
import UsersScreen from '@screens/users/UsersScreen';
import AccountingScreen from '@screens/accounting/AccountingScreen';
import GodownsScreen from '@screens/godowns/GodownsScreen';
import GodownDetailScreen from '@screens/godowns/GodownDetailScreen';
import AddGodownScreen from '@screens/godowns/AddGodownScreen';

const Stack = createStackNavigator<MoreStackParamList>();

export default function MoreStack() {
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
        name="More" 
        component={MoreScreen}
        options={{ 
          title: 'More',
          headerLeft: () => null,
        }}
      />
      <Stack.Screen 
        name="Customers" 
        component={CustomersScreen}
        options={{ title: 'Customers' }}
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
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="Suppliers" 
        component={SuppliersScreen}
        options={{ title: 'Suppliers' }}
      />
      <Stack.Screen 
        name="AddSupplier" 
        component={AddSupplierScreen}
        options={{ title: 'Add Supplier' }}
      />
      <Stack.Screen 
        name="SupplierDetail" 
        component={SupplierDetailScreen}
        options={{ title: 'Supplier Details', headerShown: false }}
      />
      <Stack.Screen 
        name="Purchases" 
        component={PurchasesScreen}
        options={{ title: 'Purchases', headerShown: false }}
      />
      <Stack.Screen 
        name="CreatePurchase" 
        component={CreatePurchaseScreen}
        options={{ title: 'New Purchase', headerShown: false }}
      />
      <Stack.Screen 
        name="PurchaseDetail" 
        component={PurchaseDetailScreen}
        options={{ title: 'Purchase Details', headerShown: false }}
      />
      <Stack.Screen 
        name="Ewaybills" 
        component={EwaybillsScreen}
        options={{ title: 'E-waybills', headerShown: false }}
      />
      <Stack.Screen 
        name="Payments" 
        component={PaymentsScreen}
        options={{ title: 'Payments' }}
      />
      <Stack.Screen 
        name="RecordPayment" 
        component={RecordPaymentScreen}
        options={{ title: 'Record Payment', headerShown: false }}
      />
      <Stack.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{ title: 'Reports', headerShown: false }}
      />
      <Stack.Screen 
        name="ReportDetail" 
        component={ReportDetailScreen}
        options={{ title: 'Report', headerShown: false }}
      />
      <Stack.Screen 
        name="Organization" 
        component={OrganizationScreen}
        options={{ title: 'Organization' }}
      />
      <Stack.Screen 
        name="Users" 
        component={UsersScreen}
        options={{ title: 'Users', headerShown: false }}
      />
      <Stack.Screen 
        name="Accounting" 
        component={AccountingScreen}
        options={{ title: 'Accounting', headerShown: false }}
      />
      <Stack.Screen 
        name="Godowns" 
        component={GodownsScreen}
        options={{ title: 'Godowns' }}
      />
      <Stack.Screen 
        name="GodownDetail" 
        component={GodownDetailScreen}
        options={{ title: 'Godown Details', headerShown: false }}
      />
      <Stack.Screen 
        name="AddGodown" 
        component={AddGodownScreen}
        options={{ title: 'Add Godown' }}
      />
    </Stack.Navigator>
  );
}
