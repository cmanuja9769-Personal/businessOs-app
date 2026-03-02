import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { withRetry } from '../lib/retry';
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
} from '../lib/offline-storage';

interface SyncCounter {
  synced: number;
  failed: number;
  errors: string[];
}

interface SyncRecord {
  id: string;
  synced?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface QueueItem {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  data: Record<string, unknown>;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

const META_KEYS = new Set(['id', 'synced', 'created_at', 'updated_at']);

function stripMetaFields(record: SyncRecord): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !META_KEYS.has(key)),
  );
}

async function upsertRecord(
  table: string,
  record: SyncRecord,
  organizationId: string,
): Promise<void> {
  const data = stripMetaFields(record);

  await withRetry(async () => {
    if (record.id.startsWith('offline_')) {
      const { error } = await supabase
        .from(table)
        .insert({ ...data, organization_id: organizationId });
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from(table)
      .update(data)
      .eq('id', record.id);
    if (error) throw error;
  }, { maxRetries: 2, baseDelay: 500 });
}

async function syncEntityBatch(
  records: SyncRecord[],
  table: string,
  offlineTable: string,
  organizationId: string,
  labelFn: (r: SyncRecord) => string,
  counter: SyncCounter,
): Promise<void> {
  const unsynced = records.filter((r) => r.synced === 0);

  for (const record of unsynced) {
    try {
      await upsertRecord(table, record, organizationId);
      await markAsSynced(offlineTable, record.id);
      counter.synced++;
    } catch (err: unknown) {
      console.error(`Error syncing ${table} ${record.id}:`, err);
      counter.errors.push(`${labelFn(record)}: ${getErrorMessage(err)}`);
      counter.failed++;
    }
  }
}

async function processQueueItem(
  queueItem: QueueItem,
  organizationId: string,
): Promise<void> {
  const { table_name, record_id, action, data } = queueItem;
  const table = table_name.replace('offline_', '');

  await withRetry(async () => {
    if (action === 'insert') {
      const { error } = await supabase
        .from(table)
        .insert({ ...data, organization_id: organizationId });
      if (error) throw error;
      return;
    }

    if (action === 'update') {
      const { error } = await supabase.from(table).update(data).eq('id', record_id);
      if (error) throw error;
      return;
    }

    if (action === 'delete') {
      const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', record_id);
      if (error) throw error;
    }
  }, { maxRetries: 2, baseDelay: 500 });
}

let isSyncing = false;

export const isOnline = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable === true;
};

export const syncOfflineData = async (organizationId: string): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}> => {
  if (isSyncing) {
    console.warn('Sync already in progress');
    return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
  }

  const online = await isOnline();
  if (!online) {
    return { success: false, synced: 0, failed: 0, errors: ['No internet connection'] };
  }

  isSyncing = true;
  const counter: SyncCounter = { synced: 0, failed: 0, errors: [] };

  try {
    const invoices = await getOfflineInvoices();
    await syncEntityBatch(
      invoices as SyncRecord[],
      'invoices',
      'offline_invoices',
      organizationId,
      (r) => `Invoice ${String(r.invoice_number ?? r.id)}`,
      counter,
    );

    const items = await getOfflineItems();
    await syncEntityBatch(
      items as SyncRecord[],
      'items',
      'offline_items',
      organizationId,
      (r) => `Item ${String(r.name ?? r.id)}`,
      counter,
    );

    const customers = await getOfflineCustomers();
    await syncEntityBatch(
      customers as SyncRecord[],
      'customers',
      'offline_customers',
      organizationId,
      (r) => `Customer ${String(r.name ?? r.id)}`,
      counter,
    );

    const queue = await getSyncQueue();
    for (const queueItem of queue as QueueItem[]) {
      try {
        await processQueueItem(queueItem, organizationId);
        await removeSyncQueueItem(queueItem.id);
        counter.synced++;
      } catch (err: unknown) {
        console.error(`Error processing queue item ${queueItem.id}:`, err);
        counter.errors.push(`Queue item ${queueItem.id}: ${getErrorMessage(err)}`);
        counter.failed++;
      }
    }

    return {
      success: counter.failed === 0,
      synced: counter.synced,
      failed: counter.failed,
      errors: counter.errors,
    };
  } catch (err: unknown) {
    console.error('Error during sync:', err);
    return {
      success: false,
      synced: counter.synced,
      failed: counter.failed,
      errors: [...counter.errors, getErrorMessage(err)],
    };
  } finally {
    isSyncing = false;
  }
};

export const downloadDataForOffline = async (organizationId: string): Promise<{
  success: boolean;
  downloaded: number;
  errors: string[];
}> => {
  const online = await isOnline();
  if (!online) {
    return { success: false, downloaded: 0, errors: ['No internet connection'] };
  }

  let downloaded = 0;

  try {
    const { data: invoices, error: invoicesError } = await withRetry(async () =>
      await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    );

    if (invoicesError) throw invoicesError;

    for (const invoice of invoices ?? []) {
      await saveOfflineInvoice({ ...invoice, synced: 1 });
      downloaded++;
    }

    const { data: items, error: itemsError } = await withRetry(async () =>
      await supabase
        .from('items')
        .select('*')
        .eq('organization_id', organizationId)
    );

    if (itemsError) throw itemsError;

    for (const item of items ?? []) {
      await saveOfflineItem({ ...item, synced: 1 });
      downloaded++;
    }

    const { data: customers, error: customersError } = await withRetry(async () =>
      await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', organizationId)
    );

    if (customersError) throw customersError;

    for (const customer of customers ?? []) {
      await saveOfflineCustomer({ ...customer, synced: 1 });
      downloaded++;
    }

    return { success: true, downloaded, errors: [] };
  } catch (err: unknown) {
    console.error('Error downloading data:', err);
    return { success: false, downloaded, errors: [getErrorMessage(err)] };
  }
};

let unsubscribe: (() => void) | null = null;
let autoSyncTimer: NodeJS.Timeout | null = null;
const AUTO_SYNC_DEBOUNCE_MS = 5000;

export const startAutoSync = (organizationId: string) => {
  stopAutoSync();

  unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      if (autoSyncTimer) clearTimeout(autoSyncTimer);
      autoSyncTimer = setTimeout(() => {
        console.warn('[SYNC] Network connected, starting auto-sync...');
        syncOfflineData(organizationId)
          .then((result) => {
            if (result.synced > 0 || result.failed > 0) {
              console.warn('[SYNC] Auto-sync result:', JSON.stringify(result));
            }
          })
          .catch((error: unknown) => {
            console.error('[SYNC] Auto-sync failed:', error);
          });
      }, AUTO_SYNC_DEBOUNCE_MS);
    }
  });
};

export const stopAutoSync = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (autoSyncTimer) {
    clearTimeout(autoSyncTimer);
    autoSyncTimer = null;
  }
};
