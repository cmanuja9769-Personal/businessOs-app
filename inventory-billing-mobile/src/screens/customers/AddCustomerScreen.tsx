import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import Input from '@components/ui/Input';
import Button from '@components/ui/Button';
import { useUnsavedChanges } from '@hooks/useUnsavedChanges';
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';
import { MoreStackParamList } from '@navigation/types';
import type { RouteProp } from '@react-navigation/native';

type AddCustomerRouteProp = RouteProp<MoreStackParamList, 'AddCustomer'>;

type DbCustomer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  gst_number?: string | null;
  // legacy
  gstin?: string | null;
  billing_address?: string | null;
};

export default function AddCustomerScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddCustomerRouteProp>();
  const { colors } = useTheme();
  const { organizationId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);
  const customerId = route.params?.customerId;
  const isEdit = useMemo(() => Boolean(customerId), [customerId]);

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
      // For new customer, check if any field has data
      return formData.name.trim() !== '' || 
             formData.email.trim() !== '' || 
             formData.phone.trim() !== '' ||
             formData.gst_number.trim() !== '' ||
             formData.address.trim() !== '';
    }
    // For edit, compare with initial data
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData, savedSuccessfully]);

  useUnsavedChanges({ hasUnsavedChanges });

  useEffect(() => {
    if (!customerId || !organizationId) {
      // For new customer, set initial as empty
      setInitialFormData({
        name: '',
        email: '',
        phone: '',
        gst_number: '',
        address: '',
      });
      return;
    }

    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('id', customerId)
          .maybeSingle();

        if (error) throw error;
        const c = (data as any as DbCustomer) ?? null;
        if (!c) return;

        const fetchedData = {
          name: c.name ?? '',
          email: (c.email ?? '') as string,
          phone: (c.phone ?? '') as string,
          gst_number: ((c.gst_number ?? c.gstin) ?? '') as string,
          address: ((c.address ?? c.billing_address) ?? '') as string,
        };
        setFormData(fetchedData);
        setInitialFormData(fetchedData);
      } catch (e) {
        console.error('[ADD_CUSTOMER] fetchCustomer error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId, organizationId]);

  const saveWithFallback = async (payloadPreferred: any, payloadLegacy: any) => {
    // Prefer web schema first; if schema cache complains, retry with legacy.
    const run = async (payload: any) => {
      if (isEdit) {
        return supabase
          .from('customers')
          .update(payload)
          .eq('organization_id', organizationId)
          .eq('id', customerId as string);
      }
      return supabase.from('customers').insert(payload);
    };

    const first = await run(payloadPreferred);
    if (!first.error) return first;

    const msg = String((first.error as any)?.message || '');
    const schemaCache = msg.toLowerCase().includes('schema cache');
    const mentionsPreferredCol = msg.includes('gst_number') || msg.includes('address');
    if (schemaCache && mentionsPreferredCol) {
      return run(payloadLegacy);
    }
    return first;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Customer name is required');
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
        billing_address: formData.address.trim() ? formData.address.trim() : null,
      };

      const { error } = await saveWithFallback(preferred, legacy);
      if (error) throw error;

      setSavedSuccessfully(true);
      Alert.alert('Success', isEdit ? 'Customer updated successfully' : 'Customer added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error adding customer:', error);
      Alert.alert('Error', error.message || (isEdit ? 'Failed to update customer' : 'Failed to add customer'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>

        <Input
          label="Customer Name *"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="Enter customer name"
        />

        <Input
          label="Email"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          placeholder="customer@example.com"
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
        title={loading ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Customer' : 'Add Customer')}
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
