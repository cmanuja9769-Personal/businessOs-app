import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import {
  getSyncQueue,
  removeSyncQueueItem,
  markAsSynced,
  getOfflineInvoices,
  getOfflineItems,
  getOfflineCustomers,
  saveOfflineInvoice,
  saveOfflineItem,
  saveOfflineCustomer,
  addToSyncQueue,
} from '../lib/offline-storage';

let isSyncing = false;

// Check network connectivity
export const isOnline = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable === true;
};

// Sync all offline data to server
export const syncOfflineData = async (organizationId: string): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}> => {
  if (isSyncing) {
    console.log('Sync already in progress');
    return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
  }

  const online = await isOnline();
  if (!online) {
    return { success: false, synced: 0, failed: 0, errors: ['No internet connection'] };
  }

  isSyncing = true;
  const errors: string[] = [];
  let synced = 0;
  let failed = 0;

  try {
    // Sync invoices
    const invoices = await getOfflineInvoices();
    const unsyncedInvoices = invoices.filter((inv: any) => inv.synced === 0);
    
    for (const invoice of unsyncedInvoices) {
      try {
        const { id, synced: _synced, created_at, updated_at, ...invoiceData } = invoice;
        
        if (id.startsWith('offline_')) {
          // New invoice - insert
          const { error } = await supabase
            .from('invoices')
            .insert({ ...invoiceData, organization_id: organizationId });
          
          if (error) throw error;
        } else {
          // Existing invoice - update
          const { error } = await supabase
            .from('invoices')
            .update(invoiceData)
            .eq('id', id);
          
          if (error) throw error;
        }
        
        await markAsSynced('offline_invoices', id);
        synced++;
      } catch (error: any) {
        console.error(`Error syncing invoice ${invoice.id}:`, error);
        errors.push(`Invoice ${invoice.invoice_number}: ${error.message}`);
        failed++;
      }
    }

    // Sync items
    const items = await getOfflineItems();
    const unsyncedItems = items.filter((item: any) => item.synced === 0);
    
    for (const item of unsyncedItems) {
      try {
        const { id, synced: _synced, created_at, updated_at, ...itemData } = item;
        
        if (id.startsWith('offline_')) {
          const { error } = await supabase
            .from('items')
            .insert({ ...itemData, organization_id: organizationId });
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('items')
            .update(itemData)
            .eq('id', id);
          
          if (error) throw error;
        }
        
        await markAsSynced('offline_items', id);
        synced++;
      } catch (error: any) {
        console.error(`Error syncing item ${item.id}:`, error);
        errors.push(`Item ${item.name}: ${error.message}`);
        failed++;
      }
    }

    // Sync customers
    const customers = await getOfflineCustomers();
    const unsyncedCustomers = customers.filter((cust: any) => cust.synced === 0);
    
    for (const customer of unsyncedCustomers) {
      try {
        const { id, synced: _synced, created_at, updated_at, ...customerData } = customer;
        
        if (id.startsWith('offline_')) {
          const { error } = await supabase
            .from('customers')
            .insert({ ...customerData, organization_id: organizationId });
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('customers')
            .update(customerData)
            .eq('id', id);
          
          if (error) throw error;
        }
        
        await markAsSynced('offline_customers', id);
        synced++;
      } catch (error: any) {
        console.error(`Error syncing customer ${customer.id}:`, error);
        errors.push(`Customer ${customer.name}: ${error.message}`);
        failed++;
      }
    }

    // Process sync queue
    const queue = await getSyncQueue();
    
    for (const queueItem of queue) {
      try {
        const { table_name, record_id, action, data } = queueItem;
        
        if (action === 'insert') {
          const { error } = await supabase
            .from(table_name.replace('offline_', ''))
            .insert({ ...data, organization_id: organizationId });
          
          if (error) throw error;
        } else if (action === 'update') {
          const { error } = await supabase
            .from(table_name.replace('offline_', ''))
            .update(data)
            .eq('id', record_id);
          
          if (error) throw error;
        } else if (action === 'delete') {
          const { error } = await supabase
            .from(table_name.replace('offline_', ''))
            .delete()
            .eq('id', record_id);
          
          if (error) throw error;
        }
        
        await removeSyncQueueItem(queueItem.id);
        synced++;
      } catch (error: any) {
        console.error(`Error processing queue item ${queueItem.id}:`, error);
        errors.push(`Queue item ${queueItem.id}: ${error.message}`);
        failed++;
      }
    }

    return {
      success: failed === 0,
      synced,
      failed,
      errors,
    };
  } catch (error: any) {
    console.error('Error during sync:', error);
    return {
      success: false,
      synced,
      failed,
      errors: [...errors, error.message],
    };
  } finally {
    isSyncing = false;
  }
};

// Download data from server to offline storage
export const downloadDataForOffline = async (organizationId: string): Promise<{
  success: boolean;
  downloaded: number;
  errors: string[];
}> => {
  const online = await isOnline();
  if (!online) {
    return { success: false, downloaded: 0, errors: ['No internet connection'] };
  }

  const errors: string[] = [];
  let downloaded = 0;

  try {
    // Download invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()); // Last 90 days
    
    if (invoicesError) throw invoicesError;
    
    if (invoices) {
      for (const invoice of invoices) {
        await saveOfflineInvoice({ ...invoice, synced: 1 });
        downloaded++;
      }
    }

    // Download items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (itemsError) throw itemsError;
    
    if (items) {
      for (const item of items) {
        await saveOfflineItem({ ...item, synced: 1 });
        downloaded++;
      }
    }

    // Download customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (customersError) throw customersError;
    
    if (customers) {
      for (const customer of customers) {
        await saveOfflineCustomer({ ...customer, synced: 1 });
        downloaded++;
      }
    }

    return {
      success: true,
      downloaded,
      errors,
    };
  } catch (error: any) {
    console.error('Error downloading data:', error);
    return {
      success: false,
      downloaded,
      errors: [error.message],
    };
  }
};

// Auto-sync on network change
let unsubscribe: (() => void) | null = null;

export const startAutoSync = (organizationId: string) => {
  unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      console.log('Network connected, starting sync...');
      syncOfflineData(organizationId)
        .then((result) => {
          console.log('Auto-sync completed:', result);
        })
        .catch((error) => {
          console.error('Auto-sync failed:', error);
        });
    }
  });
};

export const stopAutoSync = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
};
