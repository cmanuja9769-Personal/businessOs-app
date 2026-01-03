# Mobile App Navigation Model

## Navigation Architecture

### 1. High-Level Structure (Destination-Based Navigation)

```
┌─────────────────────────────────────────────────────────────┐
│                    App Root                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Bottom Tab Navigator                      │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │  │
│  │  │Home │ │Invoi│ │Party│ │Items│ │More │            │  │
│  │  │ 🏠  │ │ 📄  │ │ 👥  │ │ 📦  │ │ ☰   │            │  │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘            │  │
│  └───────────────────────────────────────────────────────┘  │
│                        + FAB 🔵                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. Bottom Navigation Tabs (5 Primary Destinations)

| Tab | Icon | Purpose | Key Screens |
|-----|------|---------|-------------|
| **Home** | 🏠 | Dashboard & Overview | Stats, Recent Activity, Quick Actions |
| **Invoices** | 📄 | All Documents | List, Create, View, Edit |
| **Parties** | 👥 | Customers & Suppliers | List, Add, View |
| **Items** | 📦 | Inventory Management | List, Add, View, Stock |
| **More** | ☰ | Settings & Extras | Profile, Settings, Reports |

### 3. The "Super Action" FAB (Floating Action Button)

Located on the Dashboard (Home) screen, bottom-right corner.

**When tapped, reveals:**
- ➕ New Invoice (Primary action)
- 📄 New Quotation
- 👤 Add Party
- 📦 Add Item

**Design:**
- Gradient purple button (matches app primary color)
- 60px diameter
- Rotates 45° when opened
- Semi-transparent backdrop when menu is open
- Menu items slide up with spring animation

### 4. Navigation Stack Structure

```
DashboardStack
├── Dashboard (Home)
└── Profile

InvoiceStack
├── InvoiceList
├── InvoiceDetail (View only)
└── CreateInvoice (Create/Edit)

CustomersStack
├── Customers (List)
├── CustomerDetail (View only)
└── AddCustomer (Create/Edit)

InventoryStack
├── ItemList
├── ItemDetail (View only)
└── AddItem (Create/Edit)

MoreStack
├── More (Menu)
├── Settings
├── Profile
├── Suppliers
└── Reports
```

---

## Interaction Patterns

### 1. Drill-Down vs Modal (When to Use What)

| Pattern | Use Case | Example |
|---------|----------|---------|
| **Push Navigation** | Major screen transitions | Invoice List → Invoice Detail |
| **Bottom Sheet** | Quick actions preserving context | Add customer while creating invoice (Future) |
| **Full Modal** | Complex forms with multiple steps | Create Invoice (wizard steps) |
| **Alert Dialog** | Confirmations only | "Discard changes?" |

### 2. Screen Types & Behavior

#### View-Only Screens
- `InvoiceDetailScreen`
- `CustomerDetailScreen`
- `ItemDetailScreen`

**Behavior:**
- ✅ Free navigation (no unsaved changes prompt)
- ✅ Back button always works
- ✅ Tab switching works instantly
- ✅ Swipe back gesture enabled

#### Edit Screens
- `CreateInvoiceScreen`
- `AddCustomerScreen`
- `AddItemScreen`
- `AddSupplierScreen`

**Behavior:**
- ⚠️ Shows "Discard changes?" when leaving with unsaved data
- ⚠️ Back button triggers confirmation if changes exist
- ⚠️ Hardware back (Android) triggers confirmation
- ✅ After successful save, exits cleanly without prompts

### 3. Unsaved Changes Detection

```typescript
// Only these conditions trigger the "Discard" prompt:
hasUnsavedChanges = (
  selectedCustomer !== null ||  // Customer selected
  invoiceItems.length > 0 ||    // Items added
  notes.length > 0              // Notes written
) && !savedSuccessfully;        // Not just saved
```

### 4. Header Structure (Consistent Pattern)

```
┌─────────────────────────────────────────────────────────────┐
│  ←  │         Screen Title          │  [Action]            │
│ Back│                               │  Save/Close          │
└─────────────────────────────────────────────────────────────┘
```

- **Back Button:** Left side, always present on child screens
- **Title:** Centered, describes current context
- **Action Button:** Right side, context-specific (Save, Edit, Share)

---

## User Flow Examples

### Flow 1: Creating a Sale Invoice

```
1. Dashboard 
   ├─ Tap FAB (+)
   └─ Select "New Invoice"

2. Create Invoice Screen (Step-by-Step Wizard)
   ├─ Step 1: Select Document Type
   │   └─ Tap "Invoice" card → Continue
   │
   ├─ Step 2: Select Customer
   │   ├─ Search or scroll list
   │   └─ Tap customer → Next
   │
   ├─ Step 3: Add Items
   │   ├─ Tap "Add Items" button
   │   ├─ Modal opens with item list
   │   ├─ Tap items to add (quantity auto-increments)
   │   ├─ Edit quantity inline
   │   └─ Close modal → Review
   │
   └─ Step 4: Review & Save
       ├─ Review totals, taxes
       ├─ Add notes (optional)
       └─ Tap "Create Invoice" → Success → Navigates to Invoice Detail

3. Invoice Detail Screen
   ├─ View complete invoice
   ├─ Share as PDF
   └─ Edit (goes back to Create screen in edit mode)
```

### Flow 2: Checking a Report

```
1. Dashboard
   └─ Tap "More" tab

2. More Screen
   └─ Tap "Reports"

3. Reports Screen
   ├─ Select report type (Sales, Inventory, etc.)
   └─ Apply filters (date range, customer)

4. Report View
   ├─ View data/charts
   └─ Export/Share
```

### Flow 3: Editing an Invoice

```
1. Invoices Tab
   └─ Tap any invoice

2. Invoice Detail Screen
   └─ Tap "Edit" button

3. Create Invoice Screen (Edit Mode)
   ├─ Document Type: LOCKED (shown as badge, not editable)
   ├─ Starts at Step 2 (Customer selection)
   ├─ Customer: Pre-filled, can change
   ├─ Items: Pre-loaded, can modify
   └─ Tap "Update Invoice" → Success
```

---

## Empty States

All list screens should display helpful empty states:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      📄                                     │
│                                                             │
│              No Invoices Yet                                │
│                                                             │
│     Create your first invoice to get started               │
│                                                             │
│            [+ Create Invoice]                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation Notes

### Files Modified:
- `src/hooks/useUnsavedChanges.ts` - Simplified, screen-local only
- `src/contexts/NavigationContext.tsx` - Removed global tracking
- `src/navigation/MainNavigator.tsx` - Clean tab switching
- `src/screens/invoices/CreateInvoiceScreen.tsx` - Edit mode locks doc type
- `src/screens/dashboard/DashboardScreen.tsx` - FAB added

### Key Principles Applied:
1. **No global state for unsaved changes** - Each screen manages itself
2. **Tab switching is instant** - No confirmation on tab change
3. **Edit screens own their prompts** - Only CreateInvoice, AddCustomer, etc. show prompts
4. **View screens are always free** - InvoiceDetail, CustomerDetail allow free navigation
5. **FAB for discoverability** - Main actions accessible from dashboard
