import { supabase } from '@lib/supabase';

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export class ApiService {
  // Generic GET request
  static async get<T>(table: string, filters?: Record<string, any>): Promise<ApiResponse<T[]>> {
    try {
      let query = supabase.from(table).select('*');

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data as T[], error: null };
    } catch (error) {
      console.error(`Error fetching from ${table}:`, error);
      return { data: null, error: error as Error };
    }
  }

  // Generic POST request
  static async create<T>(table: string, data: Partial<T>): Promise<ApiResponse<T>> {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      return { data: result as T, error: null };
    } catch (error) {
      console.error(`Error creating in ${table}:`, error);
      return { data: null, error: error as Error };
    }
  }

  // Generic UPDATE request
  static async update<T>(
    table: string,
    id: string,
    data: Partial<T>
  ): Promise<ApiResponse<T>> {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return { data: result as T, error: null };
    } catch (error) {
      console.error(`Error updating in ${table}:`, error);
      return { data: null, error: error as Error };
    }
  }

  // Generic DELETE request
  static async delete(table: string, id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);

      if (error) throw error;

      return { data: null, error: null };
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
      return { data: null, error: error as Error };
    }
  }
}
