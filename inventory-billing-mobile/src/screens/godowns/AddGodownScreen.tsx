import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TextInput as RNTextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import Loading from '@components/ui/Loading';
import { spacing } from '@theme/spacing';
import { supabase } from '@lib/supabase';

type RouteParams = {
  godownId?: string;
};

const makeGodownCode = (n: number) => 'GDN' + String(n).padStart(4, '0');

export default function AddGodownScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { organizationId } = useAuth();
  
  const godownId = route.params?.godownId as string | undefined;
  const isEditing = !!godownId;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);

  useEffect(() => {
    if (isEditing) {
      fetchGodown();
    } else {
      generateCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [godownId]);

  const fetchGodown = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', godownId)
        .single();

      if (error) throw error;

      if (data) {
        setName(data.name || '');
        setCode(data.code || '');
        setIsDefault(data.is_default || false);
      }
    } catch (error) {
      console.error('[ADD_GODOWN] fetchGodown error:', error);
      Alert.alert('Error', 'Failed to fetch godown details');
    } finally {
      setInitialLoading(false);
    }
  };

  const generateCode = async () => {
    try {
      if (!organizationId) return;

      const { count, error } = await supabase
        .from('warehouses')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (error) throw error;

      const newCode = makeGodownCode((count ?? 0) + 1);
      setCode(newCode);
    } catch (error) {
      console.error('[ADD_GODOWN] generateCode error:', error);
      setCode('GDN0001');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a godown name');
      return;
    }

    if (!organizationId) {
      Alert.alert('Error', 'Organization not found');
      return;
    }

    setLoading(true);
    try {
      const godownData = {
        name: name.trim(),
        code: code.trim(),
        is_default: isDefault,
        organization_id: organizationId,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('warehouses')
          .update(godownData)
          .eq('id', godownId);

        if (error) throw error;
        Alert.alert('Success', 'Godown updated successfully');
      } else {
        const { error } = await supabase
          .from('warehouses')
          .insert([godownData]);

        if (error) throw error;
        Alert.alert('Success', 'Godown created successfully');
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('[ADD_GODOWN] handleSave error:', error);
      Alert.alert('Error', error.message || 'Failed to save godown');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Input
          label="Godown Name"
          value={name}
          onChangeText={setName}
          placeholder="Enter godown name"
          autoCapitalize="words"
        />

        <Input
          label="Code"
          value={code}
          onChangeText={setCode}
          placeholder="GDN0001"
          autoCapitalize="characters"
        />

        <Button
          title={loading ? 'Saving...' : isEditing ? 'Update Godown' : 'Create Godown'}
          onPress={handleSave}
          disabled={loading}
          style={styles.saveButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
});
