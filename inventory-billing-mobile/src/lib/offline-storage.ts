import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const db = Platform.OS === 'web'
  ? {
      transaction: () => console.warn('SQLite transaction skipped on web'),
    } as any
  : SQLite.openDatabase('inventory_billing_offline.db');

// Initialize database tables
export const initDatabase = (): Promise<void> => {
  if (Platform.OS === 'web') {
    console.warn('Offline storage is not supported on web');
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx: any) => {
        // Invoices table
        tx.executeSql(
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
        );

        // Items table
        tx.executeSql(
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
        );

        // Customers table
        tx.executeSql(
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
        );

        // Sync queue table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_name TEXT NOT NULL,
            record_id TEXT NOT NULL,
            action TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            attempts INTEGER DEFAULT 0
          );`
        );

        console.log('Database tables created successfully');
      },
      (error: any) => {
        console.error('Error creating tables:', error);
        reject(error);
      },
      () => {
        console.log('Database initialized');
        resolve();
      }
    );
  });
};

// Invoice operations
export const saveOfflineInvoice = (invoice: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx: any) => {
        tx.executeSql(
          `INSERT OR REPLACE INTO offline_invoices 
          (id, invoice_number, customer_id, customer_name, customer_email, customer_gstin,
           invoice_date, due_date, subtotal, cgst, sgst, igst, total, status, notes, terms,
           items, synced, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            invoice.id || `offline_${Date.now()}`,
            invoice.invoice_number,
            invoice.customer_id,
            invoice.customer_name,
            invoice.customer_email,
            invoice.customer_gstin,
            invoice.invoice_date,
            invoice.due_date,
            invoice.subtotal,
            invoice.cgst,
            invoice.sgst,
            invoice.igst,
            invoice.total,
            invoice.status,
            invoice.notes,
            invoice.terms,
            JSON.stringify(invoice.items),
            0, // not synced
            new Date().toISOString(),
            new Date().toISOString(),
          ]
        );
      },
      (error: any) => reject(error),
      () => resolve()
    );
  });
};

export const getOfflineInvoices = (): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT * FROM offline_invoices ORDER BY created_at DESC',
        [],
        (_: any, { rows }: any) => {
          const invoices = [];
          for (let i = 0; i < rows.length; i++) {
            const invoice = rows.item(i);
            invoice.items = JSON.parse(invoice.items);
            invoices.push(invoice);
          }
          resolve(invoices);
        },
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Item operations
export const saveOfflineItem = (item: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx: any) => {
        tx.executeSql(
          `INSERT OR REPLACE INTO offline_items 
          (id, name, sku, barcode, category, unit, purchase_price, selling_price,
           gst_rate, hsn_code, current_stock, min_stock, max_stock, description,
           image_url, synced, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id || `offline_${Date.now()}`,
            item.name,
            item.sku,
            item.barcode,
            item.category,
            item.unit,
            item.purchase_price,
            item.selling_price,
            item.gst_rate,
            item.hsn_code,
            item.current_stock,
            item.min_stock,
            item.max_stock,
            item.description,
            item.image_url,
            0, // not synced
            new Date().toISOString(),
            new Date().toISOString(),
          ]
        );
      },
      (error: any) => reject(error),
      () => resolve()
    );
  });
};

export const getOfflineItems = (): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT * FROM offline_items ORDER BY name ASC',
        [],
        (_: any, { rows }: any) => {
          const items = [];
          for (let i = 0; i < rows.length; i++) {
            items.push(rows.item(i));
          }
          resolve(items);
        },
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Customer operations
export const saveOfflineCustomer = (customer: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx: any) => {
        tx.executeSql(
          `INSERT OR REPLACE INTO offline_customers 
          (id, name, email, phone, gstin, address, city, state, pincode, synced, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            customer.id || `offline_${Date.now()}`,
            customer.name,
            customer.email,
            customer.phone,
            customer.gstin,
            customer.address,
            customer.city,
            customer.state,
            customer.pincode,
            0, // not synced
            new Date().toISOString(),
            new Date().toISOString(),
          ]
        );
      },
      (error: any) => reject(error),
      () => resolve()
    );
  });
};

export const getOfflineCustomers = (): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT * FROM offline_customers ORDER BY name ASC',
        [],
        (_: any, { rows }: any) => {
          const customers = [];
          for (let i = 0; i < rows.length; i++) {
            customers.push(rows.item(i));
          }
          resolve(customers);
        },
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Sync operations
export const addToSyncQueue = (tableName: string, recordId: string, action: string, data: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx: any) => {
        tx.executeSql(
          'INSERT INTO sync_queue (table_name, record_id, action, data, created_at) VALUES (?, ?, ?, ?, ?)',
          [tableName, recordId, action, JSON.stringify(data), new Date().toISOString()]
        );
      },
      (error: any) => reject(error),
      () => resolve()
    );
  });
};

export const getSyncQueue = (): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT * FROM sync_queue ORDER BY created_at ASC',
        [],
        (_: any, { rows }: any) => {
          const queue = [];
          for (let i = 0; i < rows.length; i++) {
            const item = rows.item(i);
            item.data = JSON.parse(item.data);
            queue.push(item);
          }
          resolve(queue);
        },
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

export const removeSyncQueueItem = (id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx: any) => {
        tx.executeSql('DELETE FROM sync_queue WHERE id = ?', [id]);
      },
      (error: any) => reject(error),
      () => resolve()
    );
  });
};

export const markAsSynced = (tableName: string, recordId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx: any) => {
        tx.executeSql(
          `UPDATE ${tableName} SET synced = 1, updated_at = ? WHERE id = ?`,
          [new Date().toISOString(), recordId]
        );
      },
      (error: any) => reject(error),
      () => resolve()
    );
  });
};

// Clear all offline data (for testing)
export const clearOfflineData = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx: any) => {
        tx.executeSql('DELETE FROM offline_invoices');
        tx.executeSql('DELETE FROM offline_items');
        tx.executeSql('DELETE FROM offline_customers');
        tx.executeSql('DELETE FROM sync_queue');
      },
      (error: any) => reject(error),
      () => resolve()
    );
  });
};

// Get unsynced records count
export const getUnsyncedCount = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `SELECT 
          (SELECT COUNT(*) FROM offline_invoices WHERE synced = 0) +
          (SELECT COUNT(*) FROM offline_items WHERE synced = 0) +
          (SELECT COUNT(*) FROM offline_customers WHERE synced = 0) as total`,
        [],
        (_: any, { rows }: any) => {
          resolve(rows.item(0).total);
        },
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
};
