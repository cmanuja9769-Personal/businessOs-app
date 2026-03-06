import { StackNavigationProp } from '@react-navigation/stack';
import { NavigatorScreenParams, RouteProp } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  Onboarding: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  DashboardTab: undefined;
  InvoicesTab: NavigatorScreenParams<InvoiceStackParamList> | undefined;
  CustomersTab: NavigatorScreenParams<CustomersStackParamList> | undefined;
  InventoryTab: NavigatorScreenParams<InventoryStackParamList> | undefined;
  MoreTab: NavigatorScreenParams<MoreStackParamList> | undefined;
};

// Customers Stack (dedicated tab)
export type CustomersStackParamList = {
  Customers: undefined;
  CustomerDetail: { customerId: string };
  AddCustomer: { customerId?: string } | undefined;
};

// Dashboard Stack
export type DashboardStackParamList = {
  Dashboard: undefined;
};

// Invoice Stack
export type InvoiceStackParamList = {
  InvoiceList: undefined;
  InvoiceDetail: { invoiceId: string };
  CreateInvoice: { invoiceId?: string; customerId?: string } | undefined;
};

// Inventory Stack
export type InventoryStackParamList = {
  ItemList: undefined;
  ItemDetail: { itemId: string };
  AddItem: { itemId?: string; barcode?: string } | undefined;
  StockAdjustment: { itemId?: string } | undefined;
};

// More Stack
export type MoreStackParamList = {
  More: undefined;
  Customers: undefined;
  CustomerDetail: { customerId: string };
  AddCustomer: { customerId?: string } | undefined;
  Suppliers: undefined;
  SupplierDetail: { supplierId: string };
  AddSupplier: { supplierId?: string } | undefined;
  Purchases: undefined;
  PurchaseDetail: { purchaseId: string };
  CreatePurchase: { purchaseId?: string } | undefined;
  Ewaybills: undefined;
  EwaybillDetail: { ewaybillId: string };
  CreateEwaybill: { ewaybillId?: string } | undefined;
  Payments: undefined;
  RecordPayment: { invoiceId?: string; purchaseId?: string } | undefined;
  Reports: undefined;
  ReportDetail: { reportKey: string };
  PartyLedger: undefined;
  Settings: undefined;
  Profile: undefined;
  Organization: undefined;
  Users: undefined;
  Accounting: undefined;
  Godowns: undefined;
  GodownDetail: { godownId: string };
  AddGodown: { godownId?: string } | undefined;
};

// Root Stack
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

// Navigation Props
export type AuthStackNavigationProp = StackNavigationProp<AuthStackParamList>;
export type InvoiceStackNavigationProp = StackNavigationProp<InvoiceStackParamList>;
export type InventoryStackNavigationProp = StackNavigationProp<InventoryStackParamList>;
export type MoreStackNavigationProp = StackNavigationProp<MoreStackParamList>;

// Route Props
export type InvoiceDetailRouteProp = RouteProp<InvoiceStackParamList, 'InvoiceDetail'>;
export type ItemDetailRouteProp = RouteProp<InventoryStackParamList, 'ItemDetail'>;
export type CustomerDetailRouteProp = RouteProp<MoreStackParamList, 'CustomerDetail'>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList
      extends MainTabParamList,
        MoreStackParamList,
        InvoiceStackParamList,
        InventoryStackParamList,
        CustomersStackParamList,
        DashboardStackParamList {}
  }
}
