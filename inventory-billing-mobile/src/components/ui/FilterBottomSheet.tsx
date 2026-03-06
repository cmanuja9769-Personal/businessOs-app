import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@contexts/ThemeContext';
import { format, startOfMonth, endOfMonth, subMonths, isValid } from 'date-fns';

const ISO_DATE = 'yyyy-MM-dd';
const DISPLAY_FORMAT = 'dd MMM yyyy';

export interface FilterConfig {
  dateFrom: string;
  dateTo: string;
}

interface FilterBottomSheetProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onApply: (filters: FilterConfig) => void;
  readonly initialFilters: FilterConfig;
  readonly title?: string;
}

function toDate(iso: string): Date {
  const d = new Date(iso);
  return isValid(d) ? d : new Date();
}

function toISO(d: Date): string {
  return format(d, ISO_DATE);
}

const PRESETS = [
  {
    label: 'This Month',
    getRange: () => ({
      dateFrom: format(startOfMonth(new Date()), ISO_DATE),
      dateTo: format(endOfMonth(new Date()), ISO_DATE),
    }),
  },
  {
    label: 'Last Month',
    getRange: () => ({
      dateFrom: format(startOfMonth(subMonths(new Date(), 1)), ISO_DATE),
      dateTo: format(endOfMonth(subMonths(new Date(), 1)), ISO_DATE),
    }),
  },
  {
    label: 'Last 3 Months',
    getRange: () => ({
      dateFrom: format(startOfMonth(subMonths(new Date(), 2)), ISO_DATE),
      dateTo: format(endOfMonth(new Date()), ISO_DATE),
    }),
  },
  {
    label: 'This FY',
    getRange: () => {
      const now = new Date();
      const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return {
        dateFrom: format(new Date(fyStart, 3, 1), ISO_DATE),
        dateTo: format(endOfMonth(new Date()), ISO_DATE),
      };
    },
  },
] as const;

type ActivePicker = 'from' | 'to' | null;

export default function FilterBottomSheet({
  visible,
  onClose,
  onApply,
  initialFilters,
  title = 'Filters',
}: FilterBottomSheetProps) {
  const { colors } = useTheme();
  const [filters, setFilters] = useState<FilterConfig>(initialFilters);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  const handlePreset = useCallback((preset: (typeof PRESETS)[number]) => {
    const range = preset.getRange();
    setFilters(range);
  }, []);

  const handleApply = useCallback(() => {
    onApply(filters);
    onClose();
  }, [filters, onApply, onClose]);

  const handleReset = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const handleDateChange = useCallback(
    (field: 'dateFrom' | 'dateTo') =>
      (_event: DateTimePickerEvent, selected?: Date) => {
        if (Platform.OS === 'android') setActivePicker(null);
        if (selected) {
          setFilters((prev) => ({ ...prev, [field]: toISO(selected) }));
        }
      },
    [],
  );

  const confirmIOSPicker = useCallback(() => {
    setActivePicker(null);
  }, []);

  const renderDateField = (field: 'dateFrom' | 'dateTo', label: string) => {
    const pickerKey: ActivePicker = field === 'dateFrom' ? 'from' : 'to';
    const dateValue = toDate(filters[field]);
    const isActive = activePicker === pickerKey;

    return (
      <View style={styles.dateField}>
        <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{label}</Text>
        <TouchableOpacity
          style={[
            styles.dateInput,
            {
              borderColor: isActive ? colors.primary : colors.border,
              backgroundColor: colors.background,
            },
          ]}
          onPress={() => setActivePicker(isActive ? null : pickerKey)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={isActive ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {format(dateValue, DISPLAY_FORMAT)}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const pickerField = activePicker === 'from' ? 'dateFrom' as const : 'dateTo' as const;
  const pickerDateValue = activePicker ? toDate(filters[pickerField]) : new Date();
  const pickerMaxDate = pickerField === 'dateFrom' ? toDate(filters.dateTo) : undefined;
  const pickerMinDate = pickerField === 'dateTo' ? toDate(filters.dateFrom) : undefined;
  const pickerLabel = activePicker === 'from' ? 'From Date' : 'To Date';

  const renderIOSPicker = () => (
    <View style={[styles.iosPickerContainer, { backgroundColor: colors.card }]}>
      <View style={styles.iosPickerHeader}>
        <Text style={[styles.iosPickerLabel, { color: colors.textSecondary }]}>
          {pickerLabel}
        </Text>
        <TouchableOpacity onPress={confirmIOSPicker}>
          <Text style={[styles.iosPickerDone, { color: colors.primary }]}>Done</Text>
        </TouchableOpacity>
      </View>
      <DateTimePicker
        value={pickerDateValue}
        mode="date"
        display="spinner"
        onChange={handleDateChange(pickerField)}
        maximumDate={pickerMaxDate}
        minimumDate={pickerMinDate}
        themeVariant={colors.background === '#FFFFFF' ? 'light' : 'dark'}
      />
    </View>
  );

  const renderAndroidPicker = () => (
    <DateTimePicker
      value={pickerDateValue}
      mode="date"
      display="default"
      onChange={handleDateChange(pickerField)}
      maximumDate={pickerMaxDate}
      minimumDate={pickerMinDate}
    />
  );

  const renderNativePicker = () => {
    if (!activePicker) return null;
    return Platform.OS === 'ios' ? renderIOSPicker() : renderAndroidPicker();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Quick Presets
            </Text>
            <View style={styles.presetRow}>
              {PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[styles.presetChip, { borderColor: colors.border }]}
                  onPress={() => handlePreset(preset)}
                >
                  <Text style={[styles.presetText, { color: colors.primary }]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Date Range</Text>
            <View style={styles.dateRow}>
              {renderDateField('dateFrom', 'From')}
              {renderDateField('dateTo', 'To')}
            </View>
            {renderNativePicker()}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: colors.border }]}
              onPress={handleReset}
            >
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={handleApply}
            >
              <Text style={[styles.actionText, { color: '#fff' }]}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 8,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  iosPickerContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iosPickerLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  iosPickerDone: {
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButton: {
    borderWidth: 0,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
