import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Share,
  TouchableOpacity,
  StatusBar,
  Platform,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { InvoiceDetailRouteProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Loading from '@components/ui/Loading';
import { supabase } from '@lib/supabase';
import { formatCurrency, formatDate } from '@lib/utils';

type DocumentType = 'invoice' | 'sales_order' | 'quotation' | 'proforma' | 'delivery_challan' | 'credit_note' | 'debit_note';

interface DocumentTypeConfig {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
}

const DOCUMENT_TYPES: Record<DocumentType, DocumentTypeConfig> = {
  invoice: { label: 'Invoice', icon: 'receipt-outline', gradient: ['#4F46E5', '#6366F1'] },
  sales_order: { label: 'Sales Order', icon: 'cart-outline', gradient: ['#059669', '#10B981'] },
  quotation: { label: 'Quotation', icon: 'document-text-outline', gradient: ['#D97706', '#F59E0B'] },
  proforma: { label: 'Proforma', icon: 'clipboard-outline', gradient: ['#7C3AED', '#8B5CF6'] },
  delivery_challan: { label: 'Delivery Challan', icon: 'car-outline', gradient: ['#0369A1', '#0EA5E9'] },
  credit_note: { label: 'Credit Note', icon: 'arrow-down-circle-outline', gradient: ['#DC2626', '#EF4444'] },
  debit_note: { label: 'Debit Note', icon: 'arrow-up-circle-outline', gradient: ['#EA580C', '#F97316'] },
};

type DbInvoice = {
  id: string;
  invoice_number?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_gstin?: string | null;
  customer_address?: string | null;
  customer_phone?: string | null;
  status?: string | null;
  document_type?: string | null;
  pricing_mode?: string | null;
  billing_mode?: string | null;
  gst_enabled?: boolean | null;
  subtotal?: number | null;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  discount?: number | null;
  total?: number | null;
  paid_amount?: number | null;
  balance?: number | null;
  notes?: string | null;
  terms?: string | null;
  items?: any;
};

interface InvoiceItem {
  itemId?: string;
  itemName?: string;
  item_name?: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  amount?: number;
  gstRate?: number;
  gst_rate?: number;
  hsn?: string;
}

export default function InvoiceDetailScreen() {
  const route = useRoute<InvoiceDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { colors, shadows, isDark } = useTheme();
  const { organizationId } = useAuth();
  const { invoiceId } = route.params;

  const [invoice, setInvoice] = useState<DbInvoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);

  const normalizeItems = (raw: any): InvoiceItem[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    if (typeof raw === 'object' && Array.isArray(raw.items)) return raw.items;
    return [];
  };

  const fetchInvoice = async () => {
    try {
      if (!organizationId) {
        setInvoice(null);
        setInvoiceItems([]);
        return;
      }

      // Fetch invoice data
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', invoiceId)
        .maybeSingle();

      if (error) throw error;
      setInvoice(data as DbInvoice | null);

      // Also try to fetch items from invoice_items table (web app stores items here)
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (!itemsError && itemsData && itemsData.length > 0) {
        // Map invoice_items table columns to our InvoiceItem interface
        const mappedItems: InvoiceItem[] = itemsData.map((item: any) => ({
          itemId: item.item_id,
          itemName: item.item_name,
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
          gstRate: item.gst_rate,
          gst_rate: item.gst_rate,
          hsn: item.hsn,
        }));
        setInvoiceItems(mappedItems);
      } else {
        setInvoiceItems([]);
      }
    } catch (error) {
      console.error('[INVOICE_DETAIL] fetchInvoice error:', error);
      Alert.alert('Error', 'Failed to fetch invoice');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [organizationId, invoiceId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoice();
  };

  const handleShare = async () => {
    if (!invoice) return;
    
    const items = normalizeItems(invoice.items);
    const title = invoice.invoice_number || `#${invoice.id.slice(0, 8)}`;
    const total = formatCurrency(invoice.total || 0);
    const date = formatDate(invoice.invoice_date || new Date().toISOString());

    const lines = items
      .slice(0, 20)
      .map((it, idx) => {
        const name = it.itemName || it.item_name || `Item ${idx + 1}`;
        const qty = it.quantity ?? 0;
        const rate = formatCurrency(it.rate ?? 0);
        const amount = formatCurrency(it.amount ?? (qty * (it.rate ?? 0)));
        return `${idx + 1}. ${name} — ${qty} × ${rate} = ${amount}`;
      })
      .join('\n');

    const message = [
      `Invoice ${title}`,
      invoice.customer_name ? `Customer: ${invoice.customer_name}` : null,
      `Date: ${date}`,
      `Total: ${total}`,
      '',
      'Items:',
      lines || '(No items)',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share({ message });
    } catch (error) {
      Alert.alert('Error', 'Unable to share invoice');
    }
  };

  const handleGeneratePDF = async () => {
    if (!invoice) return;

    try {
      const items = invoiceItems.length > 0 ? invoiceItems : normalizeItems(invoice.items);
      const title = invoice.invoice_number || `#${invoice.id.slice(0, 8)}`;
      const pricingModeLabel = getPricingModeLabel(invoice.pricing_mode || 'sale');
      const gstEnabled = invoice.gst_enabled !== false;

      // Generate items table rows
      const itemRows = items.map((item, index) => {
        const name = item.itemName || item.item_name || `Item ${index + 1}`;
        const qty = item.quantity ?? 0;
        const rate = item.rate ?? 0;
        const amount = item.amount ?? (qty * rate);
        const gstRate = item.gstRate || item.gst_rate || 0;
        const hsn = item.hsn || '-';

        return `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">${index + 1}</td>
            <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">
              <strong>${name}</strong>
              ${hsn !== '-' ? `<br><small style="color: #6B7280;">HSN: ${hsn}</small>` : ''}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center;">${qty}</td>
            <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: right;">₹${rate.toFixed(2)}</td>
            ${gstEnabled ? `<td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center;">${gstRate}%</td>` : ''}
            <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: right;"><strong>₹${amount.toFixed(2)}</strong></td>
          </tr>
        `;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #1F2937;
              font-size: 12px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              border-bottom: 2px solid #4F46E5;
              padding-bottom: 20px;
            }
            .invoice-title {
              font-size: 28px;
              font-weight: bold;
              color: #4F46E5;
              margin: 0;
            }
            .invoice-number {
              color: #6B7280;
              margin-top: 5px;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .badge-unpaid { background: #FEF3C7; color: #D97706; }
            .badge-paid { background: #D1FAE5; color: #059669; }
            .badge-partial { background: #DBEAFE; color: #2563EB; }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #6B7280;
              margin-bottom: 8px;
            }
            .info-grid {
              display: flex;
              justify-content: space-between;
            }
            .info-box {
              width: 48%;
              background: #F9FAFB;
              padding: 15px;
              border-radius: 8px;
            }
            .customer-name {
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 5px;
            }
            .customer-detail {
              color: #6B7280;
              font-size: 11px;
              margin-top: 3px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background: #F3F4F6;
              padding: 12px 10px;
              text-align: left;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #6B7280;
              font-weight: 600;
            }
            th.right { text-align: right; }
            th.center { text-align: center; }
            .totals {
              margin-top: 20px;
              display: flex;
              justify-content: flex-end;
            }
            .totals-table {
              width: 300px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #E5E7EB;
            }
            .totals-row.grand {
              border-bottom: none;
              border-top: 2px solid #4F46E5;
              margin-top: 5px;
              padding-top: 12px;
            }
            .totals-label {
              color: #6B7280;
            }
            .totals-value {
              font-weight: 600;
            }
            .totals-value.grand {
              font-size: 18px;
              color: #4F46E5;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #E5E7EB;
              color: #9CA3AF;
              font-size: 10px;
              text-align: center;
            }
            .pricing-mode {
              margin-top: 5px;
              font-size: 10px;
              color: #6B7280;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="invoice-title">INVOICE</h1>
              <div class="invoice-number">${title}</div>
              <div class="pricing-mode">${pricingModeLabel} • ${gstEnabled ? 'GST Billing' : 'Non-GST Billing'}</div>
            </div>
            <div style="text-align: right;">
              <span class="badge badge-${(invoice.status || 'unpaid').toLowerCase()}">${(invoice.status || 'UNPAID').toUpperCase()}</span>
              <div style="margin-top: 10px; color: #6B7280;">
                <div>Date: ${formatDate(invoice.invoice_date || new Date().toISOString())}</div>
                ${invoice.due_date ? `<div>Due: ${formatDate(invoice.due_date)}</div>` : ''}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="info-grid">
              <div class="info-box">
                <div class="section-title">Bill To</div>
                <div class="customer-name">${invoice.customer_name || 'Walk-in Customer'}</div>
                ${invoice.customer_phone ? `<div class="customer-detail">📞 ${invoice.customer_phone}</div>` : ''}
                ${invoice.customer_email ? `<div class="customer-detail">✉️ ${invoice.customer_email}</div>` : ''}
                ${invoice.customer_address ? `<div class="customer-detail">📍 ${invoice.customer_address}</div>` : ''}
                ${invoice.customer_gstin ? `<div class="customer-detail">GSTIN: ${invoice.customer_gstin}</div>` : ''}
              </div>
              <div class="info-box">
                <div class="section-title">Payment Info</div>
                <div><strong>Total:</strong> ₹${(invoice.total || 0).toFixed(2)}</div>
                <div><strong>Paid:</strong> ₹${(invoice.paid_amount || 0).toFixed(2)}</div>
                <div><strong>Balance:</strong> ₹${((invoice.total || 0) - (invoice.paid_amount || 0)).toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Items</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th>Item</th>
                  <th class="center" style="width: 60px;">Qty</th>
                  <th class="right" style="width: 80px;">Rate</th>
                  ${gstEnabled ? '<th class="center" style="width: 60px;">GST</th>' : ''}
                  <th class="right" style="width: 100px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
              </tbody>
            </table>
          </div>

          <div class="totals">
            <div class="totals-table">
              <div class="totals-row">
                <span class="totals-label">Subtotal</span>
                <span class="totals-value">₹${(invoice.subtotal || 0).toFixed(2)}</span>
              </div>
              ${invoice.discount && invoice.discount > 0 ? `
              <div class="totals-row">
                <span class="totals-label">Discount</span>
                <span class="totals-value">- ₹${invoice.discount.toFixed(2)}</span>
              </div>
              ` : ''}
              ${gstEnabled && (invoice.cgst || invoice.sgst || invoice.igst) ? `
              ${invoice.cgst ? `
              <div class="totals-row">
                <span class="totals-label">CGST</span>
                <span class="totals-value">₹${invoice.cgst.toFixed(2)}</span>
              </div>
              ` : ''}
              ${invoice.sgst ? `
              <div class="totals-row">
                <span class="totals-label">SGST</span>
                <span class="totals-value">₹${invoice.sgst.toFixed(2)}</span>
              </div>
              ` : ''}
              ${invoice.igst ? `
              <div class="totals-row">
                <span class="totals-label">IGST</span>
                <span class="totals-value">₹${invoice.igst.toFixed(2)}</span>
              </div>
              ` : ''}
              ` : ''}
              <div class="totals-row grand">
                <span class="totals-label" style="font-size: 14px;">Grand Total</span>
                <span class="totals-value grand">₹${(invoice.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          ${invoice.notes ? `
          <div class="section" style="margin-top: 30px;">
            <div class="section-title">Notes</div>
            <p style="color: #6B7280; margin: 0;">${invoice.notes}</p>
          </div>
          ` : ''}

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Invoice ${title}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Generated', `Saved to: ${uri}`);
      }
    } catch (error: any) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', error.message || 'Failed to generate PDF');
    }
  };

  const getPricingModeLabel = (mode: string) => {
    switch (mode) {
      case 'wholesale': return 'Wholesale Price';
      case 'quantity': return 'Quantity Price (Bulk)';
      default: return 'Sale Price (MRP)';
    }
  };

  const getStatusStyle = (status: string | null | undefined) => {
    switch (String(status || '').toLowerCase()) {
      case 'paid':
        return { bg: colors.successLight, color: colors.success, label: 'PAID' };
      case 'partial':
        return { bg: colors.infoLight, color: colors.info, label: 'PARTIAL' };
      case 'overdue':
        return { bg: colors.errorLight, color: colors.error, label: 'OVERDUE' };
      case 'draft':
        return { bg: isDark ? colors.surfaceElevated : '#F1F5F9', color: colors.textTertiary, label: 'DRAFT' };
      case 'cancelled':
        return { bg: colors.errorLight, color: colors.error, label: 'CANCELLED' };
      default:
        return { bg: colors.warningLight, color: colors.warning, label: 'PENDING' };
    }
  };

  if (loading) return <Loading fullScreen />;

  if (!invoice) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="document-outline" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Invoice not found</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          This invoice may have been deleted or you may not have access.
        </Text>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const docType = (invoice.document_type || 'invoice') as DocumentType;
  const docConfig = DOCUMENT_TYPES[docType] || DOCUMENT_TYPES.invoice;
  const statusStyle = getStatusStyle(invoice.status);
  // Use items from invoice_items table first, fallback to JSON items column
  const items = invoiceItems.length > 0 ? invoiceItems : normalizeItems(invoice.items);
  const balance = invoice.balance ?? ((invoice.total || 0) - (invoice.paid_amount || 0));
  const pricingMode = invoice.pricing_mode || 'sale';
  const billingMode = invoice.billing_mode || (invoice.gst_enabled === false ? 'non-gst' : 'gst');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle="light-content"
        backgroundColor={docConfig.gradient[0]}
      />
      
      {/* Back Button Header */}
      <View style={[styles.backHeader, { backgroundColor: docConfig.gradient[0] }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backHeaderBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.backHeaderTitle}>Invoice Details</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Card */}
        <LinearGradient
          colors={docConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerTop}>
            <View style={styles.docTypeContainer}>
              <View style={styles.docTypeIcon}>
                <Ionicons name={docConfig.icon} size={20} color={docConfig.gradient[0]} />
              </View>
              <Text style={styles.docTypeLabel}>{docConfig.label}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Text style={styles.statusText}>{statusStyle.label}</Text>
            </View>
          </View>
          
          <Text style={styles.invoiceNumber}>
            {invoice.invoice_number || `#${invoice.id.slice(0, 8)}`}
          </Text>
          
          <View style={styles.headerDates}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Date</Text>
              <Text style={styles.dateValue}>
                {formatDate(invoice.invoice_date || new Date().toISOString())}
              </Text>
            </View>
            <View style={styles.dateDivider} />
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Due Date</Text>
              <Text style={styles.dateValue}>
                {formatDate(invoice.due_date || invoice.invoice_date || new Date().toISOString())}
              </Text>
            </View>
          </View>
          
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.total || 0)}</Text>
          </View>
        </LinearGradient>

        {/* Pricing & Billing Mode */}
        <View style={styles.modeContainer}>
          <View style={[styles.modeBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
            <Text style={[styles.modeBadgeText, { color: colors.primary }]}>
              {getPricingModeLabel(pricingMode)}
            </Text>
          </View>
          <View style={[styles.modeBadge, { backgroundColor: billingMode === 'gst' ? colors.successLight : colors.warningLight }]}>
            <Ionicons name="receipt-outline" size={14} color={billingMode === 'gst' ? colors.success : colors.warning} />
            <Text style={[styles.modeBadgeText, { color: billingMode === 'gst' ? colors.success : colors.warning }]}>
              {billingMode === 'gst' ? 'GST Billing' : 'Non-GST'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card, ...shadows.sm }]}
            onPress={() => navigation.navigate('CreateInvoice', { invoiceId: invoice.id })}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card, ...shadows.sm }]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card, ...shadows.sm }]}
            onPress={handleGeneratePDF}
          >
            <Ionicons name="download-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Customer Card */}
        <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Customer</Text>
          </View>
          
          <Text style={[styles.customerName, { color: colors.text }]}>
            {invoice.customer_name || 'Walk-in Customer'}
          </Text>
          
          {invoice.customer_email && (
            <View style={styles.customerDetail}>
              <Ionicons name="mail-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.customerDetailText, { color: colors.textSecondary }]}>
                {invoice.customer_email}
              </Text>
            </View>
          )}
          
          {invoice.customer_phone && (
            <View style={styles.customerDetail}>
              <Ionicons name="call-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.customerDetailText, { color: colors.textSecondary }]}>
                {invoice.customer_phone}
              </Text>
            </View>
          )}
          
          {invoice.customer_gstin && (
            <View style={[styles.gstinBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.gstinText, { color: colors.primary }]}>
                GSTIN: {invoice.customer_gstin}
              </Text>
            </View>
          )}
        </View>

        {/* Items Card - Tap to view all */}
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}
          onPress={() => setShowItemsModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Items ({items.length})
              </Text>
            </View>
            <View style={styles.viewAllButton}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </View>
          </View>
          
          {items.length === 0 ? (
            <View style={styles.noItemsContainer}>
              <Ionicons name="cube-outline" size={32} color={colors.textTertiary} />
              <Text style={[styles.noItemsText, { color: colors.textSecondary }]}>
                No items in this invoice
              </Text>
            </View>
          ) : (
            <View style={styles.itemsPreview}>
              {items.slice(0, 3).map((item, index) => {
                const itemName = item.itemName || item.item_name || `Item ${index + 1}`;
                const qty = item.quantity ?? 0;
                const rate = item.rate ?? 0;
                const amount = item.amount ?? (qty * rate);
                
                return (
                  <View 
                    key={index} 
                    style={[
                      styles.itemPreviewRow,
                      index < Math.min(items.length, 3) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                    ]}
                  >
                    <View style={styles.itemPreviewLeft}>
                      <View style={[styles.itemNumber, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.itemNumberText, { color: colors.primary }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={styles.itemPreviewDetails}>
                        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                          {itemName}
                        </Text>
                        <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                          {qty} × {formatCurrency(rate)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.itemAmount, { color: colors.text }]}>
                      {formatCurrency(amount)}
                    </Text>
                  </View>
                );
              })}
              {items.length > 3 && (
                <View style={[styles.moreItemsBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.moreItemsText, { color: colors.primary }]}>
                    +{items.length - 3} more items
                  </Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Items Modal */}
        <Modal
          visible={showItemsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowItemsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={styles.modalHeaderLeft}>
                  <Ionicons name="cube-outline" size={24} color={colors.primary} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Items ({items.length})
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowItemsModal(false)}
                  style={[styles.modalCloseButton, { backgroundColor: colors.surfaceElevated }]}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={items}
                keyExtractor={(_, index) => index.toString()}
                contentContainerStyle={styles.modalItemsList}
                showsVerticalScrollIndicator={true}
                ListEmptyComponent={
                  <View style={styles.modalEmptyContainer}>
                    <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
                    <Text style={[styles.modalEmptyText, { color: colors.textSecondary }]}>
                      No items in this invoice
                    </Text>
                  </View>
                }
                renderItem={({ item, index }) => {
                  const itemName = item.itemName || item.item_name || `Item ${index + 1}`;
                  const qty = item.quantity ?? 0;
                  const rate = item.rate ?? 0;
                  const amount = item.amount ?? (qty * rate);
                  const gstRate = item.gstRate || item.gst_rate || 0;
                  
                  return (
                    <View style={[styles.modalItemCard, { backgroundColor: colors.card, ...shadows.sm }]}>
                      <View style={styles.modalItemHeader}>
                        <View style={[styles.modalItemNumber, { backgroundColor: colors.primaryLight }]}>
                          <Text style={[styles.modalItemNumberText, { color: colors.primary }]}>
                            {index + 1}
                          </Text>
                        </View>
                        <Text style={[styles.modalItemAmount, { color: colors.primary }]}>
                          {formatCurrency(amount)}
                        </Text>
                      </View>
                      <Text style={[styles.modalItemName, { color: colors.text }]} numberOfLines={2}>
                        {itemName}
                      </Text>
                      <View style={styles.modalItemDetails}>
                        <View style={styles.modalItemDetailRow}>
                          <Text style={[styles.modalItemLabel, { color: colors.textTertiary }]}>Quantity</Text>
                          <Text style={[styles.modalItemValue, { color: colors.text }]}>
                            {qty} {item.unit || 'pcs'}
                          </Text>
                        </View>
                        <View style={styles.modalItemDetailRow}>
                          <Text style={[styles.modalItemLabel, { color: colors.textTertiary }]}>Rate</Text>
                          <Text style={[styles.modalItemValue, { color: colors.text }]}>
                            {formatCurrency(rate)}
                          </Text>
                        </View>
                        {gstRate > 0 && (
                          <View style={styles.modalItemDetailRow}>
                            <Text style={[styles.modalItemLabel, { color: colors.textTertiary }]}>GST</Text>
                            <Text style={[styles.modalItemValue, { color: colors.text }]}>{gstRate}%</Text>
                          </View>
                        )}
                        {item.hsn && (
                          <View style={styles.modalItemDetailRow}>
                            <Text style={[styles.modalItemLabel, { color: colors.textTertiary }]}>HSN</Text>
                            <Text style={[styles.modalItemValue, { color: colors.text }]}>{item.hsn}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                }}
              />
              
              {/* Modal Footer with Total */}
              <View style={[styles.modalFooter, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <Text style={[styles.modalFooterLabel, { color: colors.textSecondary }]}>
                  Subtotal ({items.length} items)
                </Text>
                <Text style={[styles.modalFooterValue, { color: colors.text }]}>
                  {formatCurrency(invoice?.subtotal || items.reduce((sum, item) => sum + (item.amount || (item.quantity || 0) * (item.rate || 0)), 0))}
                </Text>
              </View>
            </View>
          </View>
        </Modal>

        {/* Summary Card */}
        <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="calculator-outline" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Summary</Text>
          </View>
          
          <View style={styles.summaryRows}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatCurrency(invoice.subtotal || 0)}
              </Text>
            </View>
            
            {(invoice.cgst || 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>CGST</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {formatCurrency(invoice.cgst || 0)}
                </Text>
              </View>
            )}
            
            {(invoice.sgst || 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>SGST</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {formatCurrency(invoice.sgst || 0)}
                </Text>
              </View>
            )}
            
            {(invoice.igst || 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>IGST</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {formatCurrency(invoice.igst || 0)}
                </Text>
              </View>
            )}
            
            {(invoice.discount || 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Discount</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  -{formatCurrency(invoice.discount || 0)}
                </Text>
              </View>
            )}
            
            <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalRowLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.totalRowValue, { color: colors.text }]}>
                {formatCurrency(invoice.total || 0)}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Paid</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {formatCurrency(invoice.paid_amount || 0)}
              </Text>
            </View>
            
            <View style={[styles.summaryRow, styles.balanceRow, { backgroundColor: balance > 0 ? colors.warningLight : colors.successLight }]}>
              <Text style={[styles.balanceLabel, { color: balance > 0 ? colors.warning : colors.success }]}>
                Balance Due
              </Text>
              <Text style={[styles.balanceValue, { color: balance > 0 ? colors.warning : colors.success }]}>
                {formatCurrency(balance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Notes</Text>
            </View>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>
              {invoice.notes}
            </Text>
          </View>
        )}
        
        {/* Terms */}
        {invoice.terms && (
          <View style={[styles.card, { backgroundColor: colors.card, ...shadows.sm }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Terms & Conditions</Text>
            </View>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>
              {invoice.terms}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 12,
  },
  backHeaderBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  headerCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  docTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTypeLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  invoiceNumber: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  headerDates: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  dateValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dateDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
  totalContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
  },
  totalLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 4,
  },
  totalValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  customerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  customerDetailText: {
    fontSize: 14,
  },
  gstinBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  gstinText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noItemsContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noItemsText: {
    fontSize: 14,
    marginTop: 8,
  },
  itemsList: {
    gap: 0,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  itemMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  itemNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 13,
  },
  itemHsn: {
    fontSize: 11,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryRows: {
    gap: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 2,
    paddingTop: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  totalRowLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalRowValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  balanceRow: {
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
  },
  // Items Preview styles
  itemsPreview: {
    gap: 0,
  },
  itemPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  itemPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  itemPreviewDetails: {
    flex: 1,
  },
  moreItemsBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  moreItemsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: Dimensions.get('window').height * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemsList: {
    padding: 16,
    paddingBottom: 20,
  },
  modalEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  modalEmptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  modalItemCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  modalItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalItemNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalItemAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalItemDetails: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  modalItemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemLabel: {
    fontSize: 13,
  },
  modalItemValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  modalFooterLabel: {
    fontSize: 15,
  },
  modalFooterValue: {
    fontSize: 20,
    fontWeight: '700',
  },
});
