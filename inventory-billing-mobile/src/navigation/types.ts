import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';

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
  InvoicesTab: undefined;
  CustomersTab: undefined;
  InventoryTab: undefined;
  MoreTab: undefined;
};

// Customers Stack (dedicated tab)
export type CustomersStackParamList = {
  Customers: undefined;
  CustomerDetail: { customerId: string };
  AddCustomer: { customerId?: string };
};

// Dashboard Stack
export type DashboardStackParamList = {
  Dashboard: undefined;
};

// Invoice Stack
export type InvoiceStackParamList = {
  InvoiceList: undefined;
  InvoiceDetail: { invoiceId: string };
  CreateInvoice: { invoiceId?: string; customerId?: string };
};

// Inventory Stack
export type InventoryStackParamList = {
  ItemList: undefined;
  ItemDetail: { itemId: string };
  AddItem: { itemId?: string; barcode?: string };
  StockAdjustment: { itemId?: string };
};

// More Stack
export type MoreStackParamList = {
  More: undefined;
  Customers: undefined;
  CustomerDetail: { customerId: string };
  AddCustomer: { customerId?: string };
  Suppliers: undefined;
  SupplierDetail: { supplierId: string };
  AddSupplier: { supplierId?: string };
  Purchases: undefined;
  PurchaseDetail: { purchaseId: string };
  CreatePurchase: { purchaseId?: string };
  Ewaybills: undefined;
  EwaybillDetail: { ewaybillId: string };
  CreateEwaybill: { ewaybillId?: string };
  Payments: undefined;
  RecordPayment: { invoiceId?: string };
  Reports: undefined;
  Settings: undefined;
  Profile: undefined;
  Organization: undefined;
  Users: undefined;
  Accounting: undefined;
  Godowns: undefined;
  AddGodown: { godownId?: string };
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
