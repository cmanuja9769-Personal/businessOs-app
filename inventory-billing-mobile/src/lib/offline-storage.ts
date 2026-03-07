import * as SQLite from 'expo-sqlite'
import { Platform } from 'react-native'

type SqlPrimitive = string | number | null
type SqlParams = SqlPrimitive[]

type SqlRow = Record<string, unknown>

interface SqlRows {
  length: number
  item: (index: number) => SqlRow
}

interface SqlResultSet {
  rows: SqlRows
}

interface SqlTransaction {
  executeSql: (
    sqlStatement: string,
    args?: SqlParams,
    callback?: (transaction: unknown, resultSet: SqlResultSet) => void,
    errorCallback?: (transaction: unknown, error: unknown) => boolean
  ) => void
}

interface SqlDatabase {
  transaction: (
    callback: (transaction: SqlTransaction) => void,
    errorCallback?: (error: unknown) => void,
    successCallback?: () => void
  ) => void
}

type OfflineInvoiceInput = {
  id?: string
  invoice_number?: string
  customer_id?: string
  customer_name?: string
  customer_email?: string
  customer_gstin?: string
  invoice_date?: string
  due_date?: string
  subtotal?: number
  cgst?: number
  sgst?: number
  igst?: number
  total?: number
  status?: string
  notes?: string
  terms?: string
  items?: unknown[]
  synced?: number
}

type OfflineItemInput = {
  id?: string
  name?: string
  sku?: string
  barcode?: string
  category?: string
  unit?: string
  purchase_price?: number
  selling_price?: number
  gst_rate?: number
  hsn_code?: string
  current_stock?: number
  min_stock?: number
  max_stock?: number
  description?: string
  image_url?: string
  synced?: number
}

type OfflineCustomerInput = {
  id?: string
  name?: string
  email?: string
  phone?: string
  gstin?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  synced?: number
}

type SyncQueueInput = Record<string, unknown>

const emptyRows: SqlRows = {
  length: 0,
  item: () => ({}),
}

const webDb: SqlDatabase = {
  transaction: (_callback, _errorCallback, successCallback) => {
    console.warn('SQLite transaction skipped on web')
    successCallback?.()
  },
}

const db: SqlDatabase = Platform.OS === 'web' ? webDb : (SQLite.openDatabase('inventory_billing_offline.db') as unknown as SqlDatabase)

function nowIso(): string {
  return new Date().toISOString()
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function rowsToArray(rows: SqlRows): SqlRow[] {
  const result: SqlRow[] = []
  for (let index = 0; index < rows.length; index++) {
    result.push(rows.item(index))
  }
  return result
}

function runTransaction(callback: (transaction: SqlTransaction) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction(callback, reject, resolve)
  })
}

function queryRows(sqlStatement: string, args: SqlParams = []): Promise<SqlRow[]> {
  if (Platform.OS === 'web') {
    return Promise.resolve([])
  }

  return new Promise((resolve, reject) => {
    db.transaction((transaction) => {
      transaction.executeSql(
        sqlStatement,
        args,
        (_tx, resultSet) => {
          resolve(rowsToArray(resultSet?.rows || emptyRows))
        },
        (_tx, error) => {
          reject(error)
          return false
        }
      )
    })
  })
}

export const initDatabase = (): Promise<void> => {
  if (Platform.OS === 'web') {
    console.warn('Offline storage is not supported on web')
    return Promise.resolve()
  }

  return runTransaction((transaction) => {
    transaction.executeSql(
      `CREATE TABLE IF NOT EXISTS offline_invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT NOT NULL,
        customer_id TEXT,
        customer_name TEXT NOT NULL,
        customer_email TEXT,
        customer_gstin TEXT,
        invoice_date TEXT NOT NULL,
        due_date TEXT,
        subtotal REAL NOT NULL,
        cgst REAL DEFAULT 0,
        sgst REAL DEFAULT 0,
        igst REAL DEFAULT 0,
        total REAL NOT NULL,
        status TEXT DEFAULT 'draft',
        notes TEXT,
        terms TEXT,
        items TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`
    )

    transaction.executeSql(
      `CREATE TABLE IF NOT EXISTS offline_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT NOT NULL,
        barcode TEXT,
        category TEXT,
        unit TEXT NOT NULL,
        purchase_price REAL NOT NULL,
        selling_price REAL NOT NULL,
        gst_rate REAL DEFAULT 0,
        hsn_code TEXT,
        current_stock INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 0,
        max_stock INTEGER DEFAULT 0,
        description TEXT,
        image_url TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`
    )

    transaction.executeSql(
      `CREATE TABLE IF NOT EXISTS offline_customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        gstin TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`
    )

    transaction.executeSql(
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        action TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        attempts INTEGER DEFAULT 0
      );`
    )
  })
}

export const saveOfflineInvoice = (invoice: OfflineInvoiceInput): Promise<void> => {
  return runTransaction((transaction) => {
    transaction.executeSql(
      `INSERT OR REPLACE INTO offline_invoices 
      (id, invoice_number, customer_id, customer_name, customer_email, customer_gstin,
       invoice_date, due_date, subtotal, cgst, sgst, igst, total, status, notes, terms,
       items, synced, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice.id || `offline_${Date.now()}`,
        invoice.invoice_number || '',
        invoice.customer_id || null,
        invoice.customer_name || '',
        invoice.customer_email || null,
        invoice.customer_gstin || null,
        invoice.invoice_date || nowIso(),
        invoice.due_date || null,
        invoice.subtotal ?? 0,
        invoice.cgst ?? 0,
        invoice.sgst ?? 0,
        invoice.igst ?? 0,
        invoice.total ?? 0,
        invoice.status || 'draft',
        invoice.notes || null,
        invoice.terms || null,
        JSON.stringify(invoice.items || []),
        invoice.synced ?? 0,
        nowIso(),
        nowIso(),
      ]
    )
  })
}

export const getOfflineInvoices = async (): Promise<SqlRow[]> => {
  const rows = await queryRows('SELECT * FROM offline_invoices ORDER BY created_at DESC')
  return rows.map((invoice) => {
    const parsedItems = (() => {
      try {
        return JSON.parse(asString(invoice.items || '[]'))
      } catch {
        return []
      }
    })()
    return { ...invoice, items: parsedItems }
  })
}

export const saveOfflineItem = (item: OfflineItemInput): Promise<void> => {
  return runTransaction((transaction) => {
    transaction.executeSql(
      `INSERT OR REPLACE INTO offline_items 
      (id, name, sku, barcode, category, unit, purchase_price, selling_price,
       gst_rate, hsn_code, current_stock, min_stock, max_stock, description,
       image_url, synced, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id || `offline_${Date.now()}`,
        item.name || '',
        item.sku || '',
        item.barcode || null,
        item.category || null,
        item.unit || 'PCS',
        item.purchase_price ?? 0,
        item.selling_price ?? 0,
        item.gst_rate ?? 0,
        item.hsn_code || null,
        item.current_stock ?? 0,
        item.min_stock ?? 0,
        item.max_stock ?? 0,
        item.description || null,
        item.image_url || null,
        item.synced ?? 0,
        nowIso(),
        nowIso(),
      ]
    )
  })
}

export const getOfflineItems = (): Promise<SqlRow[]> => {
  return queryRows('SELECT * FROM offline_items ORDER BY name ASC')
}

export const saveOfflineCustomer = (customer: OfflineCustomerInput): Promise<void> => {
  return runTransaction((transaction) => {
    transaction.executeSql(
      `INSERT OR REPLACE INTO offline_customers 
      (id, name, email, phone, gstin, address, city, state, pincode, synced, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.id || `offline_${Date.now()}`,
        customer.name || '',
        customer.email || null,
        customer.phone || null,
        customer.gstin || null,
        customer.address || null,
        customer.city || null,
        customer.state || null,
        customer.pincode || null,
        customer.synced ?? 0,
        nowIso(),
        nowIso(),
      ]
    )
  })
}

export const getOfflineCustomers = (): Promise<SqlRow[]> => {
  return queryRows('SELECT * FROM offline_customers ORDER BY name ASC')
}

export const addToSyncQueue = (tableName: string, recordId: string, action: string, data: SyncQueueInput): Promise<void> => {
  return runTransaction((transaction) => {
    transaction.executeSql(
      'INSERT INTO sync_queue (table_name, record_id, action, data, created_at) VALUES (?, ?, ?, ?, ?)',
      [tableName, recordId, action, JSON.stringify(data), nowIso()]
    )
  })
}

export const getSyncQueue = async (): Promise<SqlRow[]> => {
  const rows = await queryRows('SELECT * FROM sync_queue ORDER BY created_at ASC')
  return rows.map((entry) => {
    const parsedData = (() => {
      try {
        return JSON.parse(asString(entry.data || '{}'))
      } catch {
        return {}
      }
    })()
    return { ...entry, data: parsedData }
  })
}

export const removeSyncQueueItem = (id: number): Promise<void> => {
  return runTransaction((transaction) => {
    transaction.executeSql('DELETE FROM sync_queue WHERE id = ?', [id])
  })
}

export const markAsSynced = (tableName: string, recordId: string): Promise<void> => {
  return runTransaction((transaction) => {
    transaction.executeSql(
      `UPDATE ${tableName} SET synced = 1, updated_at = ? WHERE id = ?`,
      [nowIso(), recordId]
    )
  })
}

export const clearOfflineData = (): Promise<void> => {
  return runTransaction((transaction) => {
    transaction.executeSql('DELETE FROM offline_invoices')
    transaction.executeSql('DELETE FROM offline_items')
    transaction.executeSql('DELETE FROM offline_customers')
    transaction.executeSql('DELETE FROM sync_queue')
  })
}

export const getUnsyncedCount = async (): Promise<number> => {
  const rows = await queryRows(
    `SELECT 
      (SELECT COUNT(*) FROM offline_invoices WHERE synced = 0) +
      (SELECT COUNT(*) FROM offline_items WHERE synced = 0) +
      (SELECT COUNT(*) FROM offline_customers WHERE synced = 0) as total`
  )

  if (rows.length === 0) return 0
  return asNumber(rows[0].total)
}
