import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Custom storage implementation using SecureStore for tokens
const SECURESTORE_MAX_VALUE_LENGTH = 1900;

const getChunkMetaKey = (key: string) => `${key}__chunks`;
const getChunkKey = (key: string, index: number) => `${key}__chunk_${index}`;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      try {
        return await AsyncStorage.getItem(key);
      } catch (e) {
        console.error('Local storage is unavailable:', e);
        return null;
      }
    }
    try {
      const chunkMeta = await SecureStore.getItemAsync(getChunkMetaKey(key));
      if (chunkMeta) {
        const chunkCount = Number.parseInt(chunkMeta, 10);
        if (!Number.isFinite(chunkCount) || chunkCount <= 0) {
          return null;
        }
        const chunks: string[] = [];
        for (let i = 0; i < chunkCount; i++) {
          const chunk = await SecureStore.getItemAsync(getChunkKey(key, i));
          if (typeof chunk !== 'string') {
            return null;
          }
          chunks.push(chunk);
        }
        return chunks.join('');
      }

      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error getting item from SecureStore:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (e) {
        console.error('Local storage is unavailable:', e);
      }
      return;
    }
    try {
      // Clear any previous value/chunks first
      const existingChunkMeta = await SecureStore.getItemAsync(getChunkMetaKey(key));
      if (existingChunkMeta) {
        const existingCount = Number.parseInt(existingChunkMeta, 10);
        if (Number.isFinite(existingCount) && existingCount > 0) {
          for (let i = 0; i < existingCount; i++) {
            await SecureStore.deleteItemAsync(getChunkKey(key, i));
          }
        }
        await SecureStore.deleteItemAsync(getChunkMetaKey(key));
      }
      await SecureStore.deleteItemAsync(key);

      if (value.length <= SECURESTORE_MAX_VALUE_LENGTH) {
        await SecureStore.setItemAsync(key, value);
        return;
      }

      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += SECURESTORE_MAX_VALUE_LENGTH) {
        chunks.push(value.slice(i, i + SECURESTORE_MAX_VALUE_LENGTH));
      }

      await SecureStore.setItemAsync(getChunkMetaKey(key), String(chunks.length));
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(getChunkKey(key, i), chunks[i]);
      }
    } catch (error) {
      console.error('Error setting item in SecureStore:', error);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      try {
        await AsyncStorage.removeItem(key);
      } catch (e) {
        console.error('Local storage is unavailable:', e);
      }
      return;
    }
    try {
      const chunkMeta = await SecureStore.getItemAsync(getChunkMetaKey(key));
      if (chunkMeta) {
        const chunkCount = Number.parseInt(chunkMeta, 10);
        if (Number.isFinite(chunkCount) && chunkCount > 0) {
          for (let i = 0; i < chunkCount; i++) {
            await SecureStore.deleteItemAsync(getChunkKey(key, i));
          }
        }
        await SecureStore.deleteItemAsync(getChunkMetaKey(key));
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing item from SecureStore:', error);
    }
  },
};

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = any; // Import from your existing types
