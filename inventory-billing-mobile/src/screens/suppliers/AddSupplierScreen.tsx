import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import Input from '@components/ui/Input';
import Button from '@components/ui/Button';
import { useUnsavedChanges } from '@hooks/useUnsavedChanges';
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';
import { MoreStackParamList } from '@navigation/types';

type AddSupplierRouteProp = RouteProp<MoreStackParamList, 'AddSupplier'>;

type DbSupplier = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  gst_number?: string | null;
  // legacy
  gstin?: string | null;
};

export default function AddSupplierScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<AddSupplierRouteProp>();
  const { colors } = useTheme();
  const { organizationId } = useAuth();

  const supplierId = route.params?.supplierId;
  const isEdit = useMemo(() => Boolean(supplierId), [supplierId]);

  const [loading, setLoading] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gst_number: '',
    address: '',
  });

  // Track unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (savedSuccessfully) return false;
    if (!initialFormData) {
      return formData.name.trim() !== '' || 
             formData.email.trim() !== '' || 
             formData.phone.trim() !== '' ||
             formData.gst_number.trim() !== '' ||
             formData.address.trim() !== '';
    }
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData, savedSuccessfully]);

  useUnsavedChanges({ hasUnsavedChanges });

  useEffect(() => {
    if (!supplierId || !organizationId) {
      setInitialFormData({
        name: '',
        email: '',
        phone: '',
        gst_number: '',
        address: '',
      });
      return;
    }

    const fetchSupplier = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('id', supplierId)
          .maybeSingle();

        if (error) throw error;
        const s = (data as any as DbSupplier) ?? null;
        if (!s) return;

        const fetchedData = {
          name: s.name ?? '',
          email: (s.email ?? '') as string,
          phone: (s.phone ?? '') as string,
          gst_number: ((s.gst_number ?? s.gstin) ?? '') as string,
          address: (s.address ?? '') as string,
        };
        setFormData(fetchedData);
        setInitialFormData(fetchedData);
      } catch (e) {
        console.error('[ADD_SUPPLIER] fetchSupplier error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplier();
  }, [supplierId, organizationId]);

  const saveWithFallback = async (payloadPreferred: any, payloadLegacy: any) => {
    const run = async (payload: any) => {
      if (isEdit) {
        return supabase
          .from('suppliers')
          .update(payload)
          .eq('organization_id', organizationId)
          .eq('id', supplierId as string);
      }
      return supabase.from('suppliers').insert(payload);
    };

    const first = await run(payloadPreferred);
    if (!first.error) return first;

    const msg = String((first.error as any)?.message || '');
    const schemaCache = msg.toLowerCase().includes('schema cache');
    const mentionsPreferredCol = msg.includes('gst_number');
    if (schemaCache && mentionsPreferredCol) {
      return run(payloadLegacy);
    }

    return first;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Supplier name is required');
      return;
    }

    if (!organizationId) {
      Alert.alert('Error', 'Organization not found');
      return;
    }

    try {
      setLoading(true);

      const preferred = {
        organization_id: organizationId,
        name: formData.name.trim(),
        email: formData.email.trim() ? formData.email.trim() : null,
        phone: formData.phone.trim() ? formData.phone.trim() : null,
        gst_number: formData.gst_number.trim() ? formData.gst_number.trim().toUpperCase() : null,
        address: formData.address.trim() ? formData.address.trim() : null,
      };

      const legacy = {
        organization_id: organizationId,
        name: formData.name.trim(),
        email: formData.email.trim() ? formData.email.trim() : null,
        phone: formData.phone.trim() ? formData.phone.trim() : null,
        gstin: formData.gst_number.trim() ? formData.gst_number.trim().toUpperCase() : null,
        address: formData.address.trim() ? formData.address.trim() : null,
      };

      const { error } = await saveWithFallback(preferred, legacy);
      if (error) throw error;

      setSavedSuccessfully(true);
      Alert.alert('Success', isEdit ? 'Supplier updated successfully' : 'Supplier added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      Alert.alert('Error', error.message || (isEdit ? 'Failed to update supplier' : 'Failed to add supplier'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Supplier Information</Text>

        <Input
          label="Supplier Name *"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="Enter supplier name"
        />

        <Input
          label="Email"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          placeholder="supplier@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Phone"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tax Information</Text>

        <Input
          label="GSTIN"
          value={formData.gst_number}
          onChangeText={(text) => setFormData({ ...formData, gst_number: text.toUpperCase() })}
          placeholder="22AAAAA0000A1Z5"
          autoCapitalize="characters"
        />
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Address</Text>

        <Input
          label="Address"
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
          placeholder="Enter address"
          multiline
          numberOfLines={3}
        />
      </Card>

      <Button
        title={loading ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Supplier' : 'Add Supplier')}
        onPress={handleSubmit}
        disabled={loading}
        style={styles.submitButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  submitButton: {
    marginBottom: spacing.xl,
  },
});
