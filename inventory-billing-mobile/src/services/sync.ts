import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { withRetry } from '../lib/retry';
import {
  getSyncQueue,
  removeSyncQueueItem,
  markAsSynced,
  getUnsyncedCount,
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
  id: number;
  table_name: string;
  record_id: string;
  action: string;
  data: Record<string, unknown>;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function getMissingSchemaColumn(table: string, err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;

  const message = 'message' in err && typeof err.message === 'string'
    ? err.message
    : null;

  if (!message) return null;

  const pattern = new RegExp(`Could not find the '([^']+)' column of '${table}' in the schema cache`);
  const match = message.match(pattern);
  return match?.[1] ?? null;
}

const META_KEYS = new Set(['id', 'synced', 'created_at', 'updated_at']);

const COLUMN_MAP: Record<string, Record<string, string | null>> = {
  items: {
    sku: 'item_code',
    barcode: 'barcode_no',
    selling_price: 'sale_price',
    gst_rate: 'tax_rate',
    hsn_code: 'hsn',
    image_url: null,
    max_stock: null,
  },
  invoices: {
    customer_email: null,
    customer_gstin: 'customer_gst',
    terms: null,
    items: null,
  },
};

// Maps Supabase column names back to local SQLite column names (used when downloading)
const REVERSE_COLUMN_MAP: Record<string, Record<string, string | null>> = {
  items: {
    item_code: 'sku',
    sale_price: 'selling_price',
    tax_rate: 'gst_rate',
    hsn: 'hsn_code',
    barcode_no: 'barcode',
  },
  invoices: {
    customer_gst: 'customer_gstin',
  },
};

function mapFieldsForTable(table: string, data: Record<string, unknown>): Record<string, unknown> {
  const mapping = COLUMN_MAP[table];
  if (!mapping) return data;

  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key in mapping) {
      const target = mapping[key];
      if (target !== null) {
        mapped[target] = value;
      }
    } else {
      mapped[key] = value;
    }
  }
  return mapped;
}

function reverseMapFieldsForTable(table: string, data: Record<string, unknown>): Record<string, unknown> {
  const mapping = REVERSE_COLUMN_MAP[table];
  if (!mapping) return data;

  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key in mapping) {
      const target = mapping[key];
      if (target !== null) {
        mapped[target] = value;
      }
    } else {
      mapped[key] = value;
    }
  }
  return mapped;
}

function sanitizeQueueData(table: string, data: Record<string, unknown>): Record<string, unknown> {
  return mapFieldsForTable(table, data);
}

async function runSchemaSafeMutation(
  table: string,
  data: Record<string, unknown>,
  mutation: (payload: Record<string, unknown>) => Promise<void>,
): Promise<void> {
  const payload = { ...data };

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      await mutation(payload);
      return;
    } catch (err: unknown) {
      const missingColumn = getMissingSchemaColumn(table, err);
      if (!missingColumn || !(missingColumn in payload)) {
        throw err;
      }

      delete payload[missingColumn];
    }
  }

  throw new Error(`Unable to sync ${table}: too many unsupported columns in payload`);
}

async function syncExistingRecords(
  existingRecords: SyncRecord[],
  table: string,
  offlineTable: string,
  labelFn: (r: SyncRecord) => string,
  counter: SyncCounter,
): Promise<void> {
  const chunkSize = 50;

  for (let index = 0; index < existingRecords.length; index += chunkSize) {
    const chunk = existingRecords.slice(index, index + chunkSize);
    const basePayload = chunk.map((record) => ({
      id: record.id,
      ...mapFieldsForTable(table, stripMetaFields(record)),
    }));

    try {
      await runSchemaSafeMutation(table, { __batch__: basePayload } as unknown as Record<string, unknown>, async (payload) => {
        const rows = payload.__batch__ as Record<string, unknown>[];
        const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      });

      for (const record of chunk) {
        await markAsSynced(offlineTable, record.id);
        counter.synced++;
      }
    } catch (err: unknown) {
      console.error(`Error batch syncing ${table}:`, err);
      for (const record of chunk) {
        counter.errors.push(`${labelFn(record)}: ${getErrorMessage(err)}`);
        counter.failed++;
      }
    }
  }
}

async function syncOfflineCreatedRecords(
  offlineRecords: SyncRecord[],
  table: string,
  offlineTable: string,
  organizationId: string,
  labelFn: (r: SyncRecord) => string,
  counter: SyncCounter,
): Promise<void> {
  for (const record of offlineRecords) {
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
  const data = mapFieldsForTable(table, stripMetaFields(record));

  await withRetry(async () => {
    if (record.id.startsWith('offline_')) {
      await runSchemaSafeMutation(table, { ...data, organization_id: organizationId }, async (payload) => {
        const { error } = await supabase
          .from(table)
          .insert(payload);
        if (error) throw error;
      });
      return;
    }

    await runSchemaSafeMutation(table, data, async (payload) => {
      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', record.id);
      if (error) throw error;
    });
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
  const unsynced = records.filter((r) => Number(r.synced ?? 0) === 0);
  if (unsynced.length === 0) return;

  const offlineRecords = unsynced.filter((r) => r.id.startsWith('offline_'));
  const existingRecords = unsynced.filter((r) => !r.id.startsWith('offline_'));

  await syncExistingRecords(existingRecords, table, offlineTable, labelFn, counter);
  await syncOfflineCreatedRecords(offlineRecords, table, offlineTable, organizationId, labelFn, counter);
}

function logAutoSyncResult(result: { success: boolean; synced: number; failed: number; errors: string[] }) {
  if (result.synced > 0 || result.failed > 0) {
    console.warn('[SYNC] Auto-sync result:', JSON.stringify(result));
  }
}

async function runAutoSyncIfNeeded(organizationId: string): Promise<void> {
  const unsyncedCount = await getUnsyncedCount();
  const queue = await getSyncQueue();
  const pendingQueueCount = queue.length;

  if (unsyncedCount === 0 && pendingQueueCount === 0) {
    return;
  }

  console.warn(`[SYNC] Network connected, starting auto-sync... pending=${unsyncedCount + pendingQueueCount}`);

  try {
    const result = await syncOfflineData(organizationId);
    logAutoSyncResult(result);
  } catch (error: unknown) {
    console.error('[SYNC] Auto-sync failed:', error);
  }
}

async function processQueueItem(
  queueItem: QueueItem,
  organizationId: string,
): Promise<void> {
  const { table_name, record_id, action, data } = queueItem;
  const table = table_name.replace('offline_', '');
  const sanitizedData = sanitizeQueueData(table, data);

  await withRetry(async () => {
    if (action === 'insert') {
      await runSchemaSafeMutation(table, { ...sanitizedData, organization_id: organizationId }, async (payload) => {
        const { error } = await supabase
          .from(table)
          .insert(payload);
        if (error) throw error;
      });
      return;
    }

    if (action === 'update') {
      await runSchemaSafeMutation(table, sanitizedData, async (payload) => {
        const { error } = await supabase.from(table).update(payload).eq('id', record_id);
        if (error) throw error;
      });
      return;
    }

    if (action === 'delete') {
      const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', record_id);
      if (error) throw error;
    }
  }, { maxRetries: 2, baseDelay: 500 });
}

let isSyncing = false;
let currentSyncPromise: Promise<{ success: boolean; synced: number; failed: number; errors: string[] }> | null = null;

export const getIsSyncing = (): boolean => isSyncing;

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
  // If a sync is already running, wait for it and return its result
  if (isSyncing && currentSyncPromise) {
    console.warn('Sync already in progress — awaiting existing sync');
    return currentSyncPromise;
  }

  const online = await isOnline();
  if (!online) {
    return { success: false, synced: 0, failed: 0, errors: ['No internet connection'] };
  }

  isSyncing = true;
  const counter: SyncCounter = { synced: 0, failed: 0, errors: [] };

  const runSync = async () => {
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
      for (const queueItem of (queue as unknown as QueueItem[])) {
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
      currentSyncPromise = null;
    }
  };

  currentSyncPromise = runSync();
  return currentSyncPromise;
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
      const localInvoice = reverseMapFieldsForTable('invoices', invoice as Record<string, unknown>);
      await saveOfflineInvoice({ ...localInvoice, synced: 1 } as Parameters<typeof saveOfflineInvoice>[0]);
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
      const localItem = reverseMapFieldsForTable('items', item as Record<string, unknown>);
      await saveOfflineItem({ ...localItem, synced: 1 } as Parameters<typeof saveOfflineItem>[0]);
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
        void runAutoSyncIfNeeded(organizationId);
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
