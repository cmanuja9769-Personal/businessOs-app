import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { InventoryStackNavigationProp, InventoryStackParamList } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { useToast } from '@contexts/ToastContext';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import Card from '@components/ui/Card';
import Loading from '@components/ui/Loading';
import { useUnsavedChanges } from '@hooks/useUnsavedChanges';
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';
import { successFeedback, errorFeedback } from '@lib/haptics';

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['PCS', 'KG', 'LTR', 'MTR', 'BOX', 'SET', 'DOZEN', 'PKT', 'BAG'];
const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Stationery', 'Hardware', 'Other'];
const PACKAGING_UNITS = ['CTN', 'GONI', 'BAG', 'BUNDLE', 'PKT', 'BOX', 'CASE', 'ROLL', 'DRUM'];

const KEYBOARD_BEHAVIOR = Platform.OS === 'ios' ? ('padding' as const) : undefined;

interface ItemFormFields {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: string;
  purchasePrice: string;
  sellingPrice: string;
  wholesalePrice: string;
  mrp: string;
  quantityDiscountPrice: string;
  gstRate: number;
  cessRate: string;
  hsnCode: string;
  minStock: string;
  maxStock: string;
  currentStock: string;
  packagingUnit: string;
  qtyPerPackage: string;
  enableBatch: boolean;
  enableSerial: boolean;
  location: string;
  rackInfo: string;
  description: string;
}

const str = (val: unknown, fallback = ''): string => String(val || fallback);
const numStr = (val: unknown, fallback = ''): string => val ? String(val) : fallback;

const mapSupabaseItemToForm = (data: Record<string, unknown>): ItemFormFields => ({
  name: str(data.name),
  sku: str(data.item_code),
  barcode: str(data.barcode_no),
  category: str(data.category),
  unit: str(data.unit, 'PCS'),
  purchasePrice: numStr(data.purchase_price),
  sellingPrice: numStr(data.sale_price),
  wholesalePrice: numStr(data.wholesale_price),
  mrp: numStr(data.mrp),
  quantityDiscountPrice: numStr(data.quantity_discount_price),
  gstRate: data.tax_rate ? Number(data.tax_rate) : 18,
  cessRate: numStr(data.cess_rate),
  hsnCode: str(data.hsn),
  minStock: numStr(data.min_stock),
  maxStock: numStr(data.max_stock),
  currentStock: numStr(data.current_stock, '0'),
  packagingUnit: str(data.packaging_unit),
  qtyPerPackage: numStr(data.qty_per_package),
  enableBatch: Boolean(data.enable_batch_tracking),
  enableSerial: Boolean(data.enable_serial_tracking),
  location: str(data.location),
  rackInfo: str(data.rack_info),
  description: str(data.description),
});

const validateItemForm = (fields: {
  name: string;
  sku: string;
  purchasePrice: string;
  sellingPrice: string;
  currentStock: string;
}): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!fields.name.trim()) errors.name = 'Item name is required';
  if (!fields.sku.trim()) errors.sku = 'SKU is required';
  if (!fields.purchasePrice || parseFloat(fields.purchasePrice) <= 0) {
    errors.purchasePrice = 'Valid purchase price is required';
  }
  if (!fields.sellingPrice || parseFloat(fields.sellingPrice) <= 0) {
    errors.sellingPrice = 'Valid selling price is required';
  }
  if (!fields.currentStock || parseInt(fields.currentStock) < 0) {
    errors.currentStock = 'Valid stock quantity is required';
  }
  return errors;
};

const buildItemData = (
  fields: {
    name: string; sku: string; barcode: string; category: string; unit: string;
    purchasePrice: string; sellingPrice: string; gstRate: number; hsnCode: string;
    minStock: string; maxStock: string; currentStock: string; description: string;
    wholesalePrice: string; mrp: string; quantityDiscountPrice: string; cessRate: string;
    packagingUnit: string; qtyPerPackage: string; enableBatch: boolean; enableSerial: boolean;
    location: string; rackInfo: string;
  },
  organizationId: string,
) => ({
  organization_id: organizationId,
  name: fields.name.trim(),
  item_code: fields.sku.trim(),
  barcode_no: fields.barcode.trim() || null,
  category: fields.category.trim() || 'Other',
  unit: fields.unit,
  purchase_price: parseFloat(fields.purchasePrice),
  sale_price: parseFloat(fields.sellingPrice),
  wholesale_price: fields.wholesalePrice ? parseFloat(fields.wholesalePrice) : null,
  mrp: fields.mrp ? parseFloat(fields.mrp) : null,
  quantity_discount_price: fields.quantityDiscountPrice ? parseFloat(fields.quantityDiscountPrice) : null,
  tax_rate: fields.gstRate,
  cess_rate: fields.cessRate ? parseFloat(fields.cessRate) : 0,
  hsn: fields.hsnCode.trim() || null,
  min_stock: fields.minStock ? parseInt(fields.minStock) : 0,
  max_stock: fields.maxStock ? parseInt(fields.maxStock) : null,
  current_stock: parseInt(fields.currentStock),
  packaging_unit: fields.packagingUnit || null,
  qty_per_package: fields.qtyPerPackage ? parseInt(fields.qtyPerPackage) : null,
  enable_batch_tracking: fields.enableBatch,
  enable_serial_tracking: fields.enableSerial,
  location: fields.location.trim() || null,
  rack_info: fields.rackInfo.trim() || null,
  description: fields.description.trim() || null,
});

const upsertItem = async (
  isEditing: boolean,
  itemId: string | undefined,
  organizationId: string,
  itemData: Record<string, unknown>,
) => {
  if (isEditing) {
    const { error } = await supabase.from('items').update(itemData).eq('id', itemId).eq('organization_id', organizationId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('items').insert(itemData).select().single();
  if (error) throw error;
};

const launchCamera = async (): Promise<string | null> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Camera permission is required to take photos');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  return result.canceled ? null : result.assets[0].uri;
};

const getErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

export default function AddItemScreen() {
  const navigation = useNavigation<InventoryStackNavigationProp>();
  const route = useRoute<RouteProp<InventoryStackParamList, 'AddItem'>>();
  const { colors } = useTheme();
  const { organizationId } = useAuth();
  const toast = useToast();

  const itemId = route.params?.itemId;
  const barcodeFromScan = route.params?.barcode;
  const isEditing = !!itemId;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('PCS');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [gstRate, setGstRate] = useState(18);
  const [hsnCode, setHsnCode] = useState('');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [description, setDescription] = useState('');
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  const [wholesalePrice, setWholesalePrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [quantityDiscountPrice, setQuantityDiscountPrice] = useState('');
  const [cessRate, setCessRate] = useState('');
  const [packagingUnit, setPackagingUnit] = useState('');
  const [qtyPerPackage, setQtyPerPackage] = useState('');
  const [enableBatch, setEnableBatch] = useState(false);
  const [enableSerial, setEnableSerial] = useState(false);
  const [location, setLocation] = useState('');
  const [rackInfo, setRackInfo] = useState('');

  const applyItemFormFields = (fields: ItemFormFields) => {
    setName(fields.name);
    setSku(fields.sku);
    setBarcode(fields.barcode);
    setCategory(fields.category);
    setUnit(fields.unit);
    setPurchasePrice(fields.purchasePrice);
    setSellingPrice(fields.sellingPrice);
    setWholesalePrice(fields.wholesalePrice);
    setMrp(fields.mrp);
    setQuantityDiscountPrice(fields.quantityDiscountPrice);
    setGstRate(fields.gstRate);
    setCessRate(fields.cessRate);
    setHsnCode(fields.hsnCode);
    setMinStock(fields.minStock);
    setMaxStock(fields.maxStock);
    setCurrentStock(fields.currentStock);
    setPackagingUnit(fields.packagingUnit);
    setQtyPerPackage(fields.qtyPerPackage);
    setEnableBatch(fields.enableBatch);
    setEnableSerial(fields.enableSerial);
    setLocation(fields.location);
    setRackInfo(fields.rackInfo);
    setDescription(fields.description);
  };

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Track unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (savedSuccessfully) return false;
    return name.length > 0 || sku.length > 0 || purchasePrice.length > 0 || sellingPrice.length > 0;
  }, [name, sku, purchasePrice, sellingPrice, savedSuccessfully]);

  // Warn user when navigating away with unsaved changes
  useUnsavedChanges({
    hasUnsavedChanges,
    title: 'Discard Item?',
    message: 'You have unsaved changes. Are you sure you want to discard them?',
  });

  useEffect(() => {
    if (barcodeFromScan) {
      setBarcode(barcodeFromScan);
    }
  }, [barcodeFromScan]);

  useEffect(() => {
    if (!itemId || !organizationId) {
      setInitialLoading(false);
      return;
    }

    const fetchItem = async () => {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('id', itemId)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          applyItemFormFields(mapSupabaseItemToForm(data as Record<string, unknown>));
        }
      } catch {
        toast.error('Failed to load item details');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchItem();
  }, [itemId, organizationId, toast]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePicture = async () => {
    const uri = await launchCamera();
    if (uri) setImageUri(uri);
  };

  const validateForm = (): boolean => {
    const newErrors = validateItemForm({ name, sku, purchasePrice, sellingPrice, currentStock });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveItem = async () => {
    if (!validateForm()) {
      errorFeedback();
      Alert.alert('Validation Error', 'Please fill all required fields correctly');
      return;
    }

    if (!organizationId) {
      Alert.alert('Error', 'No organization selected for this account. Please create/select an organization in the web app first.');
      return;
    }

    setLoading(true);

    try {
      const itemData = buildItemData(
        {
          name, sku, barcode, category, unit, purchasePrice, sellingPrice,
          gstRate, hsnCode, minStock, maxStock, currentStock, description,
          wholesalePrice, mrp, quantityDiscountPrice, cessRate,
          packagingUnit, qtyPerPackage, enableBatch, enableSerial,
          location, rackInfo,
        },
        organizationId,
      );
      await upsertItem(isEditing, itemId, organizationId, itemData);
      setSavedSuccessfully(true);
      successFeedback();
      toast.success(isEditing ? 'Item updated successfully' : 'Item added successfully');
      navigation.goBack();
    } catch (err: unknown) {
      errorFeedback();
      toast.error(getErrorMessage(err, 'Failed to save item'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={KEYBOARD_BEHAVIOR}
    >
      {initialLoading ? (
        <Loading fullScreen text="Loading item..." />
      ) : (
      <ScrollView style={styles.content}>
        {/* Image Section */}
        <Card style={styles.imageSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Item Image
          </Text>
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.itemImage} alt="Item image" accessibilityLabel="Item image" />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImageUri(null)}
              >
                <Ionicons name="close-circle" size={32} color={colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imageButtons}>
              <TouchableOpacity
                style={[styles.imageButton, { borderColor: colors.border }]}
                onPress={takePicture}
              >
                <Ionicons name="camera" size={32} color={colors.primary} />
                <Text style={[styles.imageButtonText, { color: colors.text }]}>
                  Take Photo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.imageButton, { borderColor: colors.border }]}
                onPress={pickImage}
              >
                <Ionicons name="images" size={32} color={colors.primary} />
                <Text style={[styles.imageButtonText, { color: colors.text }]}>
                  Choose from Gallery
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Basic Information */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Basic Information
          </Text>
          <Input
            label="Item Name *"
            placeholder="Enter item name"
            value={name}
            onChangeText={setName}
            error={errors.name}
          />
          <Input
            label="SKU *"
            placeholder="Enter SKU code"
            value={sku}
            onChangeText={setSku}
            error={errors.sku}
          />
          <Input
            label="Barcode"
            placeholder="Enter barcode"
            value={barcode}
            onChangeText={setBarcode}
            rightIcon="barcode"
          />
          <Input
            label="HSN Code"
            placeholder="Enter HSN code"
            value={hsnCode}
            onChangeText={setHsnCode}
          />
          <Input
            label="Description"
            placeholder="Enter description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </Card>

        {/* Category & Unit */}
        <Card style={{ marginTop: spacing.md }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Category & Unit
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
          <View style={styles.optionsRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: category === cat ? colors.primary : colors.card,
                    borderColor: category === cat ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: category === cat ? '#fff' : colors.text },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Unit
          </Text>
          <View style={styles.optionsRow}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: unit === u ? colors.primary : colors.card,
                    borderColor: unit === u ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setUnit(u)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: unit === u ? '#fff' : colors.text },
                  ]}
                >
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Pricing */}
        <Card style={{ marginTop: spacing.md }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Pricing & Tax
          </Text>
          <View style={styles.row}>
            <Input
              label="Purchase Price *"
              placeholder="0.00"
              value={purchasePrice}
              onChangeText={setPurchasePrice}
              keyboardType="numeric"
              error={errors.purchasePrice}
              style={styles.halfInput}
            />
            <Input
              label="Selling Price *"
              placeholder="0.00"
              value={sellingPrice}
              onChangeText={setSellingPrice}
              keyboardType="numeric"
              error={errors.sellingPrice}
              style={styles.halfInput}
            />
          </View>

          <View style={styles.row}>
            <Input
              label="Wholesale Price"
              placeholder="0.00"
              value={wholesalePrice}
              onChangeText={setWholesalePrice}
              keyboardType="numeric"
              style={styles.halfInput}
            />
            <Input
              label="MRP"
              placeholder="0.00"
              value={mrp}
              onChangeText={setMrp}
              keyboardType="numeric"
              style={styles.halfInput}
            />
          </View>

          <Input
            label="Quantity Discount Price"
            placeholder="0.00"
            value={quantityDiscountPrice}
            onChangeText={setQuantityDiscountPrice}
            keyboardType="numeric"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>GST Rate</Text>
          <View style={styles.optionsRow}>
            {GST_RATES.map((rate) => (
              <TouchableOpacity
                key={rate}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: gstRate === rate ? colors.primary : colors.card,
                    borderColor: gstRate === rate ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setGstRate(rate)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: gstRate === rate ? '#fff' : colors.text },
                  ]}
                >
                  {rate}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="CESS Rate (%)"
            placeholder="0"
            value={cessRate}
            onChangeText={setCessRate}
            keyboardType="numeric"
          />
        </Card>

        {/* Inventory */}
        <Card style={{ marginTop: spacing.md }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Inventory
          </Text>
          <Input
            label="Current Stock *"
            placeholder="0"
            value={currentStock}
            onChangeText={setCurrentStock}
            keyboardType="numeric"
            error={errors.currentStock}
          />
          <View style={styles.row}>
            <Input
              label="Minimum Stock"
              placeholder="0"
              value={minStock}
              onChangeText={setMinStock}
              keyboardType="numeric"
              style={styles.halfInput}
            />
            <Input
              label="Maximum Stock"
              placeholder="0"
              value={maxStock}
              onChangeText={setMaxStock}
              keyboardType="numeric"
              style={styles.halfInput}
            />
          </View>
          <View style={styles.row}>
            <Input
              label="Location"
              placeholder="Warehouse location"
              value={location}
              onChangeText={setLocation}
              style={styles.halfInput}
            />
            <Input
              label="Rack/Shelf"
              placeholder="Rack info"
              value={rackInfo}
              onChangeText={setRackInfo}
              style={styles.halfInput}
            />
          </View>
        </Card>

        {/* Packaging Units */}
        <Card style={{ marginTop: spacing.md }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Packaging
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Packaging Unit</Text>
          <View style={styles.optionsRow}>
            {PACKAGING_UNITS.map((pu) => (
              <TouchableOpacity
                key={pu}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: packagingUnit === pu ? colors.primary : colors.card,
                    borderColor: packagingUnit === pu ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setPackagingUnit(packagingUnit === pu ? '' : pu)}
              >
                <Text
                  style={[styles.optionText, { color: packagingUnit === pu ? '#fff' : colors.text }]}
                >
                  {pu}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {packagingUnit ? (
            <Input
              label={`Qty per ${packagingUnit}`}
              placeholder="e.g. 12"
              value={qtyPerPackage}
              onChangeText={setQtyPerPackage}
              keyboardType="numeric"
            />
          ) : null}
        </Card>

        {/* Tracking Options */}
        <Card style={{ marginTop: spacing.md }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Tracking
          </Text>
          <TouchableOpacity
            style={[styles.trackingToggle, { borderColor: colors.border }]}
            onPress={() => setEnableBatch(!enableBatch)}
          >
            <Ionicons name={enableBatch ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
            <View style={styles.trackingInfo}>
              <Text style={[styles.trackingLabel, { color: colors.text }]}>Enable Batch Tracking</Text>
              <Text style={[styles.trackingHint, { color: colors.textSecondary }]}>Track manufacturing & expiry dates (FIFO)</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.trackingToggle, { borderColor: colors.border }]}
            onPress={() => setEnableSerial(!enableSerial)}
          >
            <Ionicons name={enableSerial ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
            <View style={styles.trackingInfo}>
              <Text style={[styles.trackingLabel, { color: colors.text }]}>Enable Serial Number Tracking</Text>
              <Text style={[styles.trackingHint, { color: colors.textSecondary }]}>Track individual units with warranty</Text>
            </View>
          </TouchableOpacity>
        </Card>
      </ScrollView>
      )}

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Button
          title="Cancel"
          onPress={() => navigation.goBack()}
          variant="outline"
          style={styles.footerButton}
        />
        <Button
          title={isEditing ? 'Update Item' : 'Save Item'}
          onPress={handleSaveItem}
          loading={loading}
          disabled={loading || initialLoading}
          style={styles.footerButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  imageSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  imageContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  itemImage: {
    width: 200,
    height: 200,
    borderRadius: spacing.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: '25%',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  imageButton: {
    flex: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: spacing.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  imageButtonText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.md,
    borderWidth: 1,
  },
  optionText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
  },
  trackingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  trackingInfo: {
    flex: 1,
  },
  trackingLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  trackingHint: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
