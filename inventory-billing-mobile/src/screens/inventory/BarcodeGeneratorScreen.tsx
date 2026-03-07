import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { InventoryStackParamList, InventoryStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { useToast } from '@contexts/ToastContext';
import { supabase } from '@lib/supabase';
import Input from '@components/ui/Input';
import Button from '@components/ui/Button';
import { successFeedback, errorFeedback, lightTap } from '@lib/haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type RouteProps = RouteProp<InventoryStackParamList, 'BarcodeGenerator'>;

interface Item {
  id: string;
  name: string;
  item_code: string;
  barcode: string | null;
  sale_price: number;
  unit: string;
  hsn_code: string | null;
}

type BarcodeType = 'EAN13' | 'CODE128' | 'QR';
type LabelSize = 'small' | 'medium' | 'large';

const BARCODE_TYPES: { key: BarcodeType; label: string; desc: string }[] = [
  { key: 'EAN13', label: 'EAN-13', desc: '13-digit standard barcode' },
  { key: 'CODE128', label: 'Code 128', desc: 'Alphanumeric barcode' },
  { key: 'QR', label: 'QR Code', desc: '2D quick response code' },
];

const LABEL_SIZES: { key: LabelSize; label: string; width: string; height: string }[] = [
  { key: 'small', label: 'Small', width: '38mm', height: '25mm' },
  { key: 'medium', label: 'Medium', width: '50mm', height: '30mm' },
  { key: 'large', label: 'Large', width: '65mm', height: '40mm' },
];

function generateEAN13(): string {
  const baseDigits = Date.now().toString().slice(-12).padStart(12, '0');
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += baseDigits[i];
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return code + checkDigit.toString();
}

function generateSequentialCode(prefix: string, sequence: number): string {
  return `${prefix}${String(sequence).padStart(6, '0')}`;
}

export default function BarcodeGeneratorScreen() {
  const navigation = useNavigation<InventoryStackNavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors, shadows } = useTheme();
  const { organizationId } = useAuth();
  const toast = useToast();
  const routeItemId = route.params?.itemId;

  const [item, setItem] = useState<Item | null>(null);
  const [barcodeType, setBarcodeType] = useState<BarcodeType>('EAN13');
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');
  const [barcodeValue, setBarcodeValue] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [showPrice, setShowPrice] = useState(true);
  const [showName, setShowName] = useState(true);
  const [customPrefix, setCustomPrefix] = useState('');
  const [generating, setGenerating] = useState(false);
  const sequenceRef = useRef(1);

  useEffect(() => {
    if (!routeItemId || !organizationId) return;
    const loadItem = async () => {
      const { data } = await supabase
        .from('items')
        .select('id, name, item_code, barcode, sale_price, unit, hsn_code')
        .eq('id', routeItemId)
        .single();
      if (data) {
        setItem(data);
        setBarcodeValue(data.barcode || data.item_code || '');
      }
    };
    loadItem();
  }, [organizationId, routeItemId]);

  const handleGenerate = useCallback(() => {
    lightTap();
    if (barcodeType === 'EAN13') {
      setBarcodeValue(generateEAN13());
    } else {
      const prefix = customPrefix || item?.item_code || 'ITEM';
      setBarcodeValue(generateSequentialCode(prefix, sequenceRef.current));
      sequenceRef.current += 1;
    }
  }, [barcodeType, customPrefix, item]);

  const handleSaveBarcode = useCallback(async () => {
    if (!item || !barcodeValue) {
      toast.error('No barcode to save');
      return;
    }
    try {
      const { error } = await supabase
        .from('items')
        .update({ barcode: barcodeValue })
        .eq('id', item.id);
      if (error) throw error;
      successFeedback();
      toast.success('Barcode saved to item');
    } catch {
      errorFeedback();
      toast.error('Failed to save barcode');
    }
  }, [item, barcodeValue, toast]);

  const handlePrintLabels = useCallback(async () => {
    if (!barcodeValue) {
      toast.error('Generate a barcode first');
      return;
    }
    setGenerating(true);
    try {
      const qty = Math.min(parseInt(quantity, 10) || 1, 100);
      const sizeConfig = LABEL_SIZES.find(s => s.key === labelSize) || LABEL_SIZES[1];

      const labels = Array.from({ length: qty }, () => `
        <div style="width:${sizeConfig.width};height:${sizeConfig.height};border:1px solid #eee;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;padding:2mm;margin:1mm;page-break-inside:avoid;">
          ${showName && item ? `<div style="font-size:8pt;font-weight:bold;text-align:center;margin-bottom:2mm;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:100%;">${item.name}</div>` : ''}
          <div style="font-family:monospace;font-size:14pt;letter-spacing:2px;font-weight:bold;">${barcodeValue}</div>
          ${showPrice && item ? `<div style="font-size:9pt;margin-top:2mm;">₹${item.sale_price.toFixed(2)}</div>` : ''}
        </div>
      `).join('');

      const html = `<html><head><style>body{margin:0;padding:5mm;display:flex;flex-wrap:wrap;}@page{margin:5mm;}</style></head><body>${labels}</body></html>`;

      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Print Barcode Labels' });
      }

      await supabase.from('barcode_logs').insert({
        organization_id: organizationId,
        item_id: item?.id || null,
        item_name: item?.name || 'Custom',
        barcode_value: barcodeValue,
        barcode_type: barcodeType,
        quantity_printed: qty,
        label_size: labelSize,
      });

      successFeedback();
      toast.success(`Generated ${qty} label(s)`);
    } catch (err) {
      errorFeedback();
      toast.error('Failed to generate labels');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }, [barcodeValue, quantity, labelSize, showName, showPrice, item, barcodeType, organizationId, toast]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#7C3AED', '#8B5CF6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Barcode Generator</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {item && (
          <View style={[styles.itemCard, { backgroundColor: colors.card, ...shadows.sm }]}>
            <View style={[styles.itemIcon, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="cube" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.itemCode, { color: colors.textSecondary }]}>{item.item_code || 'No code'} · ₹{item.sale_price}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BARCODE TYPE</Text>
          <View style={styles.typeGrid}>
            {BARCODE_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeCard, { backgroundColor: colors.card, ...shadows.sm }, barcodeType === t.key && { borderColor: colors.primary, borderWidth: 2 }]}
                onPress={() => { setBarcodeType(t.key); lightTap(); }}
              >
                <Ionicons name="barcode-outline" size={24} color={barcodeType === t.key ? colors.primary : colors.textSecondary} />
                <Text style={[styles.typeLabel, { color: barcodeType === t.key ? colors.primary : colors.text }]}>{t.label}</Text>
                <Text style={[styles.typeDesc, { color: colors.textTertiary }]}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BARCODE VALUE</Text>
          <Input placeholder="Enter or generate barcode..." value={barcodeValue} onChangeText={setBarcodeValue} leftIcon="barcode" />
          {barcodeType !== 'EAN13' && (
            <Input placeholder="Custom prefix (optional)" value={customPrefix} onChangeText={setCustomPrefix} leftIcon="text" containerStyle={styles.prefixInput} />
          )}
          <Button title="Auto-Generate" onPress={handleGenerate} variant="outline" style={styles.generateBtn} />
        </View>

        {barcodeValue ? (
          <View style={[styles.previewCard, { backgroundColor: colors.card, ...shadows.md }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>PREVIEW</Text>
            <View style={styles.previewBarcode}>
              <View style={styles.barcodeLines}>
                {Array.from({ length: 30 }, (_, i) => (
                  <View key={i} style={[styles.barcodeLine, { height: 50, width: i % 3 === 0 ? 2 : 1, backgroundColor: '#000', marginHorizontal: 0.5 }]} />
                ))}
              </View>
              <Text style={styles.barcodeText}>{barcodeValue}</Text>
              {showName && item && <Text style={[styles.previewName, { color: colors.text }]}>{item.name}</Text>}
              {showPrice && item && <Text style={[styles.previewPrice, { color: colors.primary }]}>₹{item.sale_price.toFixed(2)}</Text>}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>LABEL OPTIONS</Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Label Size</Text>
          <View style={styles.sizeRow}>
            {LABEL_SIZES.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.sizeChip, labelSize === s.key ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => { setLabelSize(s.key); lightTap(); }}
              >
                <Text style={[styles.sizeLabel, { color: labelSize === s.key ? '#fff' : colors.text }]}>{s.label}</Text>
                <Text style={[styles.sizeDim, { color: labelSize === s.key ? 'rgba(255,255,255,0.7)' : colors.textTertiary }]}>{s.width} x {s.height}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input placeholder="Quantity (1-100)" value={quantity} onChangeText={setQuantity} keyboardType="numeric" leftIcon="copy" containerStyle={styles.qtyInput} />

          <View style={styles.toggleRow}>
            <TouchableOpacity style={styles.toggle} onPress={() => { setShowName(!showName); lightTap(); }}>
              <Ionicons name={showName ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
              <Text style={[styles.toggleText, { color: colors.text }]}>Show Item Name</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toggle} onPress={() => { setShowPrice(!showPrice); lightTap(); }}>
              <Ionicons name={showPrice ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
              <Text style={[styles.toggleText, { color: colors.text }]}>Show Price</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionRow}>
          {item && (
            <Button title="Save to Item" onPress={handleSaveBarcode} variant="outline" style={styles.actionBtn} />
          )}
          <Button title={generating ? 'Generating...' : 'Print Labels'} onPress={handlePrintLabels} disabled={generating || !barcodeValue} style={styles.actionBtn} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  headerRight: { width: 40 },
  content: { padding: 20, paddingBottom: 40 },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, gap: 12, marginBottom: 20 },
  itemIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemCode: { fontSize: 12, marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginLeft: 2 },
  typeGrid: { flexDirection: 'row', gap: 10 },
  typeCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  typeLabel: { fontSize: 12, fontWeight: '600' },
  typeDesc: { fontSize: 9, textAlign: 'center' },
  prefixInput: { marginTop: 8, marginBottom: 0 },
  generateBtn: { marginTop: 8 },
  previewCard: { borderRadius: 16, padding: 20, marginBottom: 24, alignItems: 'center' },
  previewLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  previewBarcode: { alignItems: 'center' },
  barcodeLines: { flexDirection: 'row', alignItems: 'flex-end' },
  barcodeLine: { /* dynamic */ },
  barcodeText: { fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '700', marginTop: 6, letterSpacing: 2 },
  previewName: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  previewPrice: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  sizeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sizeChip: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center' },
  sizeLabel: { fontSize: 13, fontWeight: '600' },
  sizeDim: { fontSize: 10, marginTop: 2 },
  qtyInput: { marginBottom: 12 },
  toggleRow: { flexDirection: 'row', gap: 20 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleText: { fontSize: 14, fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flex: 1 },
});
