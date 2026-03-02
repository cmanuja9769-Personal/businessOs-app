import React, { useEffect, useMemo, useState } from 'react';
import {
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
  gstin?: string | null;
  billing_address?: string | null;
};

type CustomerFormData = {
  name: string;
  email: string;
  phone: string;
  gst_number: string;
  address: string;
};

type CustomerPayload = Record<string, string | null>;

function getButtonTitle(isLoading: boolean, isEditMode: boolean): string {
  if (isLoading) {
    return isEditMode ? 'Updating...' : 'Adding...';
  }
  return isEditMode ? 'Update Customer' : 'Add Customer';
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

function buildPreferredPayload(orgId: string, form: CustomerFormData): CustomerPayload {
  return {
    organization_id: orgId,
    name: form.name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    gst_number: form.gst_number.trim() ? form.gst_number.trim().toUpperCase() : null,
    address: form.address.trim() || null,
  };
}

function buildLegacyPayload(orgId: string, form: CustomerFormData): CustomerPayload {
  return {
    organization_id: orgId,
    name: form.name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    gstin: form.gst_number.trim() ? form.gst_number.trim().toUpperCase() : null,
    billing_address: form.address.trim() || null,
  };
}

export default function AddCustomerScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddCustomerRouteProp>();
  const { colors } = useTheme();
  const { organizationId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [initialFormData, setInitialFormData] = useState<CustomerFormData | null>(null);
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
        const c = (data as unknown as DbCustomer) ?? null;
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

  const saveWithFallback = async (payloadPreferred: CustomerPayload, payloadLegacy: CustomerPayload) => {
    const run = async (payload: CustomerPayload) => {
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

    const msg = String(first.error.message ?? '');
    const schemaCache = msg.toLowerCase().includes('schema cache');
    const mentionsPreferredCol = msg.includes('gst_number') || msg.includes('address');
    if (schemaCache && mentionsPreferredCol) {
      return run(payloadLegacy);
    }
    return first;
  };

  const handleSubmit = async () => {
    const successMessage = isEdit ? 'Customer updated successfully' : 'Customer added successfully';
    const failMessage = isEdit ? 'Failed to update customer' : 'Failed to add customer';

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
      const preferred = buildPreferredPayload(organizationId, formData);
      const legacy = buildLegacyPayload(organizationId, formData);

      const { error } = await saveWithFallback(preferred, legacy);
      if (error) throw error;

      setSavedSuccessfully(true);
      Alert.alert('Success', successMessage, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err: unknown) {
      console.error('Error adding customer:', err);
      Alert.alert('Error', getErrorMessage(err, failMessage));
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
        title={getButtonTitle(loading, isEdit)}
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
