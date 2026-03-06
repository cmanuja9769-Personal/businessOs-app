import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Platform,
} from 'react-native';
import { useTheme } from '@contexts/ThemeContext';

export interface TableColumn {
  key: string;
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  format?: (value: unknown) => string;
}

interface MobileDataTableProps {
  readonly columns: readonly TableColumn[];
  readonly data: readonly Record<string, unknown>[];
  readonly keyExtractor?: (item: Record<string, unknown>, index: number) => string;
  readonly totalsRow?: Record<string, unknown>;
  readonly emptyMessage?: string;
  readonly stickyFirstColumn?: boolean;
  readonly ListHeaderComponent?: React.ReactElement | null;
}

const MIN_COLUMN_WIDTH = 80;

export default function MobileDataTable({
  columns,
  data,
  keyExtractor,
  totalsRow,
  emptyMessage = 'No data available',
  stickyFirstColumn = true,
  ListHeaderComponent,
}: MobileDataTableProps) {
  const { colors, shadows } = useTheme();

  const stickyCol = stickyFirstColumn ? columns[0] : null;
  const scrollCols = stickyFirstColumn ? columns.slice(1) : columns;

  const totalScrollWidth = scrollCols.reduce((sum, col) => sum + Math.max(col.width, MIN_COLUMN_WIDTH), 0);

  const formatCell = useCallback((col: TableColumn, row: Record<string, unknown>): string => {
    const raw = row[col.key];
    if (col.format) return col.format(raw);
    if (raw === null || raw === undefined) return '-';
    return String(raw);
  }, []);

  const renderHeader = () => (
    <View style={[styles.headerRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {stickyCol && (
        <View
          style={[
            styles.stickyCell,
            styles.headerCell,
            {
              width: Math.max(stickyCol.width, MIN_COLUMN_WIDTH),
              backgroundColor: colors.card,
              borderRightColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.headerText, { color: colors.textSecondary }]} numberOfLines={1}>
            {stickyCol.header}
          </Text>
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
        <View style={[styles.scrollRow, { width: totalScrollWidth }]}>
          {scrollCols.map((col) => (
            <View
              key={col.key}
              style={[styles.headerCell, { width: Math.max(col.width, MIN_COLUMN_WIDTH) }]}
            >
              <Text
                style={[
                  styles.headerText,
                  { color: colors.textSecondary, textAlign: col.align || 'left' },
                ]}
                numberOfLines={1}
              >
                {col.header}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderRow = ({ item, index }: { item: Record<string, unknown>; index: number }) => {
    const isEven = index % 2 === 0;
    const rowBg = isEven ? colors.background : colors.card;

    return (
      <View style={[styles.dataRow, { backgroundColor: rowBg, borderBottomColor: colors.border }]}>
        {stickyCol && (
          <View
            style={[
              styles.stickyCell,
              styles.dataCell,
              {
                width: Math.max(stickyCol.width, MIN_COLUMN_WIDTH),
                backgroundColor: rowBg,
                borderRightColor: colors.border,
              },
            ]}
          >
            {stickyCol.render ? (
              stickyCol.render(item[stickyCol.key], item)
            ) : (
              <Text style={[styles.cellText, { color: colors.text, fontWeight: '600' }]} numberOfLines={2}>
                {formatCell(stickyCol, item)}
              </Text>
            )}
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
          <View style={[styles.scrollRow, { width: totalScrollWidth }]}>
            {scrollCols.map((col) => (
              <View
                key={col.key}
                style={[styles.dataCell, { width: Math.max(col.width, MIN_COLUMN_WIDTH) }]}
              >
                {col.render ? (
                  col.render(item[col.key], item)
                ) : (
                  <Text
                    style={[
                      styles.cellText,
                      { color: colors.text, textAlign: col.align || 'left' },
                    ]}
                    numberOfLines={2}
                  >
                    {formatCell(col, item)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderTotals = () => {
    if (!totalsRow) return null;
    return (
      <View style={[styles.totalsRow, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {stickyCol && (
          <View
            style={[
              styles.stickyCell,
              styles.dataCell,
              {
                width: Math.max(stickyCol.width, MIN_COLUMN_WIDTH),
                backgroundColor: colors.card,
                borderRightColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.cellText, { color: colors.text, fontWeight: '700' }]}>
              {String(totalsRow[stickyCol.key] ?? 'Total')}
            </Text>
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
          <View style={[styles.scrollRow, { width: totalScrollWidth }]}>
            {scrollCols.map((col) => {
              const raw = totalsRow[col.key];
              const display = col.format && raw !== undefined ? col.format(raw) : String(raw ?? '');
              return (
                <View
                  key={col.key}
                  style={[styles.dataCell, { width: Math.max(col.width, MIN_COLUMN_WIDTH) }]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      { color: colors.text, fontWeight: '700', textAlign: col.align || 'left' },
                    ]}
                  >
                    {display}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{emptyMessage}</Text>
    </View>
  );

  const defaultKeyExtractor = useCallback(
    (item: Record<string, unknown>, index: number) => String(item.id ?? index),
    [],
  );

  return (
    <View style={[styles.container, { ...shadows.sm }]}>
      {ListHeaderComponent}
      {renderHeader()}
      <FlatList
        data={data as Record<string, unknown>[]}
        keyExtractor={keyExtractor || defaultKeyExtractor}
        renderItem={renderRow}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={data.length > 0 ? renderTotals : null}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={15}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  totalsRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
  },
  scrollRow: {
    flexDirection: 'row',
  },
  stickyCell: {
    zIndex: 1,
    borderRightWidth: 1,
  },
  headerCell: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  dataCell: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cellText: {
    fontSize: 13,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
