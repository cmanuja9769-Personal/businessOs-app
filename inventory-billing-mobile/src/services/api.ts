import { supabase } from '@lib/supabase';

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface PaginatedResponse<T> {
  data: T[] | null;
  error: Error | null;
  count: number;
  hasMore: boolean;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  searchColumns?: string[];
  orderBy?: string;
  ascending?: boolean;
}

const DEFAULT_PAGE_SIZE = 50;

export class ApiService {
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

  static async getPaginated<T>(
    table: string,
    filters?: Record<string, any>,
    options?: PaginationOptions
  ): Promise<PaginatedResponse<T>> {
    try {
      const pageSize = options?.pageSize || DEFAULT_PAGE_SIZE;
      const page = options?.page || 0;
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let countQuery = supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

      let dataQuery = supabase
        .from(table)
        .select('*')
        .order(options?.orderBy || 'created_at', { ascending: options?.ascending ?? false })
        .range(from, to);

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          countQuery = countQuery.eq(key, value);
          dataQuery = dataQuery.eq(key, value);
        });
      }

      if (options?.searchQuery?.trim() && options?.searchColumns?.length) {
        const searchTerm = `%${options.searchQuery.trim()}%`;
        const orFilter = options.searchColumns
          .map((col) => `${col}.ilike.${searchTerm}`)
          .join(',');
        countQuery = countQuery.or(orFilter);
        dataQuery = dataQuery.or(orFilter);
      }

      const [countResult, dataResult] = await Promise.all([
        page === 0 ? countQuery : Promise.resolve({ count: 0, error: null }),
        dataQuery,
      ]);

      if (dataResult.error) throw dataResult.error;

      const items = (dataResult.data || []) as T[];
      const totalCount = page === 0 && countResult && 'count' in countResult
        ? (countResult.count || 0)
        : 0;

      return {
        data: items,
        error: null,
        count: totalCount,
        hasMore: items.length === pageSize,
      };
    } catch (error) {
      console.error(`Error fetching paginated from ${table}:`, error);
      return { data: null, error: error as Error, count: 0, hasMore: false };
    }
  }

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
