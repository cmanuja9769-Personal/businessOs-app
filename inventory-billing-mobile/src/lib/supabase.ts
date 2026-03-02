import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Custom storage implementation using SecureStore for tokens
const SECURESTORE_MAX_VALUE_LENGTH = 1900;
const LOCAL_STORAGE_ERROR = 'Local storage is unavailable:';

const getChunkMetaKey = (key: string) => `${key}__chunks`;
const getChunkKey = (key: string, index: number) => `${key}__chunk_${index}`;

async function webStorageGet(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.error(LOCAL_STORAGE_ERROR, e);
    return null;
  }
}

async function webStorageSet(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.error(LOCAL_STORAGE_ERROR, e);
  }
}

async function webStorageRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.error(LOCAL_STORAGE_ERROR, e);
  }
}

function parseChunkCount(meta: string | null): number {
  if (!meta) return 0;
  const count = Number.parseInt(meta, 10);
  if (!Number.isFinite(count)) return 0;
  if (count <= 0) return 0;
  return count;
}

async function readChunkedValue(key: string, chunkCount: number): Promise<string | null> {
  const chunks: string[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const chunk = await SecureStore.getItemAsync(getChunkKey(key, i));
    if (typeof chunk !== 'string') return null;
    chunks.push(chunk);
  }
  return chunks.join('');
}

async function clearStoredChunks(key: string): Promise<void> {
  const chunkCount = parseChunkCount(await SecureStore.getItemAsync(getChunkMetaKey(key)));
  for (let i = 0; i < chunkCount; i++) {
    await SecureStore.deleteItemAsync(getChunkKey(key, i));
  }
  await SecureStore.deleteItemAsync(getChunkMetaKey(key));
  await SecureStore.deleteItemAsync(key);
}

function splitIntoChunks(value: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += SECURESTORE_MAX_VALUE_LENGTH) {
    chunks.push(value.slice(i, i + SECURESTORE_MAX_VALUE_LENGTH));
  }
  return chunks;
}

async function writeChunkedValue(key: string, chunks: string[]): Promise<void> {
  await SecureStore.setItemAsync(getChunkMetaKey(key), String(chunks.length));
  for (let i = 0; i < chunks.length; i++) {
    await SecureStore.setItemAsync(getChunkKey(key, i), chunks[i]);
  }
}

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') return webStorageGet(key);
    try {
      const chunkCount = parseChunkCount(await SecureStore.getItemAsync(getChunkMetaKey(key)));
      if (chunkCount > 0) return readChunkedValue(key, chunkCount);
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error getting item from SecureStore:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      await webStorageSet(key, value);
      return;
    }
    try {
      await clearStoredChunks(key);
      if (value.length <= SECURESTORE_MAX_VALUE_LENGTH) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
      const chunks = splitIntoChunks(value);
      await writeChunkedValue(key, chunks);
    } catch (error) {
      console.error('Error setting item in SecureStore:', error);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      await webStorageRemove(key);
      return;
    }
    try {
      await clearStoredChunks(key);
    } catch (error) {
      console.error('Error removing item from SecureStore:', error);
    }
  },
};

export const supabase: SupabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}) as unknown as SupabaseClient;
