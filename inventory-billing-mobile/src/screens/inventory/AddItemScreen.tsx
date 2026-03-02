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
const UNITS = ['PCS', 'KG', 'LTR', 'MTR', 'BOX', 'SET'];
const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Stationery', 'Hardware', 'Other'];

interface ItemFormFields {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: string;
  purchasePrice: string;
  sellingPrice: string;
  gstRate: number;
  hsnCode: string;
  minStock: string;
  maxStock: string;
  currentStock: string;
  description: string;
}

const mapSupabaseItemToForm = (data: Record<string, unknown>): ItemFormFields => ({
  name: String(data.name || ''),
  sku: String(data.item_code || ''),
  barcode: String(data.barcode_no || ''),
  category: String(data.category || ''),
  unit: String(data.unit || 'PCS'),
  purchasePrice: data.purchase_price ? String(data.purchase_price) : '',
  sellingPrice: data.sale_price ? String(data.sale_price) : '',
  gstRate: data.tax_rate ? Number(data.tax_rate) : 18,
  hsnCode: String(data.hsn || ''),
  minStock: data.min_stock ? String(data.min_stock) : '',
  maxStock: '',
  currentStock: data.current_stock ? String(data.current_stock) : '0',
  description: String(data.description || ''),
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
    minStock: string; currentStock: string; description: string;
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
  tax_rate: fields.gstRate,
  hsn: fields.hsnCode.trim() || null,
  min_stock: fields.minStock ? parseInt(fields.minStock) : 0,
  current_stock: parseInt(fields.currentStock),
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
          const fields = mapSupabaseItemToForm(data as Record<string, unknown>);
          setName(fields.name);
          setSku(fields.sku);
          setBarcode(fields.barcode);
          setCategory(fields.category);
          setUnit(fields.unit);
          setPurchasePrice(fields.purchasePrice);
          setSellingPrice(fields.sellingPrice);
          setGstRate(fields.gstRate);
          setHsnCode(fields.hsnCode);
          setMinStock(fields.minStock);
          setMaxStock(fields.maxStock);
          setCurrentStock(fields.currentStock);
          setDescription(fields.description);
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
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
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
        { name, sku, barcode, category, unit, purchasePrice, sellingPrice, gstRate, hsnCode, minStock, currentStock, description },
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
});
