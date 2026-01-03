import React, { useState, useMemo } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { InventoryStackNavigationProp } from '@navigation/types';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import Card from '@components/ui/Card';
import { useUnsavedChanges } from '@hooks/useUnsavedChanges';
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['PCS', 'KG', 'LTR', 'MTR', 'BOX', 'SET'];
const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Stationery', 'Hardware', 'Other'];

export default function AddItemScreen() {
  const navigation = useNavigation<InventoryStackNavigationProp>();
  const { colors } = useTheme();
  const { organizationId } = useAuth();

  const [loading, setLoading] = useState(false);
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
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Item name is required';
    if (!sku.trim()) newErrors.sku = 'SKU is required';
    if (!purchasePrice || parseFloat(purchasePrice) <= 0) {
      newErrors.purchasePrice = 'Valid purchase price is required';
    }
    if (!sellingPrice || parseFloat(sellingPrice) <= 0) {
      newErrors.sellingPrice = 'Valid selling price is required';
    }
    if (!currentStock || parseInt(currentStock) < 0) {
      newErrors.currentStock = 'Valid stock quantity is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveItem = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill all required fields correctly');
      return;
    }

    if (!organizationId) {
      Alert.alert('Error', 'No organization selected for this account. Please create/select an organization in the web app first.');
      return;
    }

    setLoading(true);

    try {
      const itemData = {
        organization_id: organizationId,
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim() || null,
        category: category.trim() || 'Other',
        unit,
        purchase_price: parseFloat(purchasePrice),
        selling_price: parseFloat(sellingPrice),
        gst_rate: gstRate,
        hsn_code: hsnCode.trim() || null,
        min_stock: minStock ? parseInt(minStock) : 0,
        max_stock: maxStock ? parseInt(maxStock) : 0,
        current_stock: parseInt(currentStock),
        description: description.trim() || null,
        image_url: imageUri, // In production, upload to Supabase Storage first
      };

      const { data, error } = await supabase
        .from('items')
        .insert(itemData)
        .select()
        .single();

      if (error) throw error;

      setSavedSuccessfully(true);
      Alert.alert('Success', 'Item added successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.content}>
        {/* Image Section */}
        <Card style={styles.imageSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Item Image
          </Text>
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.itemImage} />
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

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Button
          title="Cancel"
          onPress={() => navigation.goBack()}
          variant="outline"
          style={styles.footerButton}
        />
        <Button
          title="Save Item"
          onPress={handleSaveItem}
          loading={loading}
          disabled={loading}
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
