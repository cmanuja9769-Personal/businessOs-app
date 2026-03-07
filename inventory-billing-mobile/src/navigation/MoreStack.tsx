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
import EInvoiceScreen from '@screens/ewaybills/EInvoiceScreen';
import PaymentsScreen from '@screens/payments/PaymentsScreen';
import RecordPaymentScreen from '@screens/payments/RecordPaymentScreen';
import ReportsScreen from '@screens/reports/ReportsScreen';
import ReportDetailScreen from '@screens/reports/ReportDetailScreen';
import PartyLedgerScreen from '@screens/reports/PartyLedgerScreen';
import OrganizationScreen from '@screens/organization/OrganizationScreen';
import UsersScreen from '@screens/users/UsersScreen';
import AccountingScreen from '@screens/accounting/AccountingScreen';
import ChartOfAccountsScreen from '@screens/accounting/ChartOfAccountsScreen';
import JournalEntriesScreen from '@screens/accounting/JournalEntriesScreen';
import JournalEntryDetailScreen from '@screens/accounting/JournalEntryDetailScreen';
import CreateJournalEntryScreen from '@screens/accounting/CreateJournalEntryScreen';
import TrialBalanceScreen from '@screens/accounting/TrialBalanceScreen';
import GodownsScreen from '@screens/godowns/GodownsScreen';
import GodownDetailScreen from '@screens/godowns/GodownDetailScreen';
import AddGodownScreen from '@screens/godowns/AddGodownScreen';
import StockTransferScreen from '@screens/inventory/StockTransferScreen';
import StockMovementScreen from '@screens/inventory/StockMovementScreen';
import BarcodeGeneratorScreen from '@screens/inventory/BarcodeGeneratorScreen';
import BarcodeLogsScreen from '@screens/inventory/BarcodeLogsScreen';

const Stack = createStackNavigator<MoreStackParamList>();

type ScreenConfig = {
  readonly name: keyof MoreStackParamList;
  readonly component: React.ComponentType;
  readonly title: string;
  readonly headerShown?: boolean;
};

const SCREENS: readonly ScreenConfig[] = [
  { name: 'Customers', component: CustomersScreen, title: 'Customers' },
  { name: 'CustomerDetail', component: CustomerDetailScreen, title: 'Customer Details' },
  { name: 'AddCustomer', component: AddCustomerScreen, title: 'Add Customer' },
  { name: 'Settings', component: SettingsScreen, title: 'Settings' },
  { name: 'Profile', component: ProfileScreen, title: 'Profile' },
  { name: 'Suppliers', component: SuppliersScreen, title: 'Suppliers' },
  { name: 'AddSupplier', component: AddSupplierScreen, title: 'Add Supplier' },
  { name: 'SupplierDetail', component: SupplierDetailScreen, title: 'Supplier Details', headerShown: false },
  { name: 'Purchases', component: PurchasesScreen, title: 'Purchases' },
  { name: 'CreatePurchase', component: CreatePurchaseScreen, title: 'New Purchase', headerShown: false },
  { name: 'PurchaseDetail', component: PurchaseDetailScreen, title: 'Purchase Details', headerShown: false },
  { name: 'Ewaybills', component: EwaybillsScreen, title: 'E-waybills', headerShown: false },
  { name: 'Payments', component: PaymentsScreen, title: 'Payments' },
  { name: 'RecordPayment', component: RecordPaymentScreen, title: 'Record Payment', headerShown: false },
  { name: 'Reports', component: ReportsScreen, title: 'Reports' },
  { name: 'ReportDetail', component: ReportDetailScreen, title: 'Report', headerShown: false },
  { name: 'PartyLedger', component: PartyLedgerScreen, title: 'Party Ledger', headerShown: false },
  { name: 'Organization', component: OrganizationScreen, title: 'Organization' },
  { name: 'Users', component: UsersScreen, title: 'Team Members' },
  { name: 'Accounting', component: AccountingScreen, title: 'Accounting', headerShown: false },
  { name: 'Godowns', component: GodownsScreen, title: 'Godowns' },
  { name: 'GodownDetail', component: GodownDetailScreen, title: 'Godown Details', headerShown: false },
  { name: 'AddGodown', component: AddGodownScreen, title: 'Add Godown' },
  { name: 'EInvoice', component: EInvoiceScreen, title: 'E-Invoice', headerShown: false },
  { name: 'ChartOfAccounts', component: ChartOfAccountsScreen, title: 'Chart of Accounts', headerShown: false },
  { name: 'JournalEntries', component: JournalEntriesScreen, title: 'Journal Entries', headerShown: false },
  { name: 'JournalEntryDetail', component: JournalEntryDetailScreen, title: 'Journal Entry', headerShown: false },
  { name: 'CreateJournalEntry', component: CreateJournalEntryScreen, title: 'New Journal Entry', headerShown: false },
  { name: 'TrialBalance', component: TrialBalanceScreen, title: 'Trial Balance', headerShown: false },
  { name: 'StockTransfer', component: StockTransferScreen, title: 'Stock Transfer' },
  { name: 'StockMovements', component: StockMovementScreen, title: 'Stock Movements', headerShown: false },
  { name: 'BarcodeGenerator', component: BarcodeGeneratorScreen, title: 'Barcode Generator', headerShown: false },
  { name: 'BarcodeLogs', component: BarcodeLogsScreen, title: 'Barcode Logs', headerShown: false },
] as const;

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
        options={{ title: 'More', headerShown: false }}
      />
      {SCREENS.map(({ name, component, title, headerShown }) => (
        <Stack.Screen
          key={name}
          name={name}
          component={component}
          options={headerShown === false ? { title, headerShown: false } : { title }}
        />
      ))}
    </Stack.Navigator>
  );
}
