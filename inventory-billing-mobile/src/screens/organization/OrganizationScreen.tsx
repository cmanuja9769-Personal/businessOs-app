import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Card from '@components/ui/Card';
import Loading from '@components/ui/Loading';
import { spacing, fontSize } from '@theme/spacing';
import { supabase } from '@lib/supabase';

interface Organization {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  pan: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  logo_url: string | null;
}

export default function OrganizationScreen() {
  const { colors } = useTheme();
  const { organizationId } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganization();
  }, [organizationId]);

  const fetchOrganization = async () => {
    try {
      console.log('[ORGANIZATION] Fetching org:', organizationId);
      if (!organizationId) {
        console.warn('[ORGANIZATION] No organizationId available');
        return;
      }

      // Try app_organizations first
      let { data, error } = await supabase
        .from('app_organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      // Fallback to organizations table
      if (error || !data) {
        const result = await supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .single();
        data = result.data;
        error = result.error;
      }

      console.log('[ORGANIZATION] Query result:', { data, error });

      if (error) throw error;
      setOrganization(data);
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!organization) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Organization not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {organization.logo_url && (
        <View style={styles.logoContainer}>
          <Image source={{ uri: organization.logo_url }} style={styles.logo} />
        </View>
      )}

      <Card style={styles.infoCard}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Organization Name</Text>
        <Text style={[styles.value, { color: colors.text }]}>{organization.name}</Text>
      </Card>

      {organization.email && (
        <Card style={styles.infoCard}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <Text style={[styles.value, { color: colors.text }]}>{organization.email}</Text>
        </Card>
      )}

      {organization.phone && (
        <Card style={styles.infoCard}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Phone</Text>
          <Text style={[styles.value, { color: colors.text }]}>{organization.phone}</Text>
        </Card>
      )}

      {organization.gstin && (
        <Card style={styles.infoCard}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>GSTIN</Text>
          <Text style={[styles.value, { color: colors.text }]}>{organization.gstin}</Text>
        </Card>
      )}

      {organization.pan && (
        <Card style={styles.infoCard}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>PAN</Text>
          <Text style={[styles.value, { color: colors.text }]}>{organization.pan}</Text>
        </Card>
      )}

      {organization.address && (
        <Card style={styles.infoCard}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Address</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {organization.address}
            {organization.city && `\n${organization.city}`}
            {organization.state && `, ${organization.state}`}
            {organization.pincode && ` - ${organization.pincode}`}
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  infoCard: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  value: {
    fontSize: fontSize.md,
  },
  errorText: {
    textAlign: 'center',
    fontSize: fontSize.lg,
  },
});
