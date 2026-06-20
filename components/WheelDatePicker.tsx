import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { getDaysInMonth } from 'date-fns';

const ITEM_HEIGHT = 40;
const VISIBLE_ROWS = 5; // odd so there is a clear center row
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const PAD = (VISIBLE_ROWS - 1) / 2;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

type WheelColumnProps = {
  values: { value: number; label: string }[];
  selected: number;
  onSelect: (value: number) => void;
  flex?: number;
  align?: 'center' | 'left';
};

function WheelColumn({ values, selected, onSelect, flex = 1, align = 'center' }: WheelColumnProps) {
  const ref = useRef<ScrollView>(null);
  const selectedIndex = values.findIndex((v) => v.value === selected);
  const isScrolling = useRef(false);

  // Keep the wheel aligned with the selected value when it changes externally
  // (e.g. month change clamps the day, or a parent reset).
  useEffect(() => {
    if (isScrolling.current) return undefined;
    const idx = values.findIndex((v) => v.value === selected);
    if (idx < 0) return undefined;
    const id = setTimeout(() => {
      ref.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, [selected, values]);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isScrolling.current = false;
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.max(0, Math.min(values.length - 1, Math.round(y / ITEM_HEIGHT)));
      const next = values[idx];
      if (next && next.value !== selected) onSelect(next.value);
      // Snap exactly onto the row.
      ref.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
    },
    [onSelect, selected, values],
  );

  return (
    <View style={{ flex, height: PICKER_HEIGHT }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        nestedScrollEnabled
        onScrollBeginDrag={() => {
          isScrolling.current = true;
        }}
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollEndDrag={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: PAD * ITEM_HEIGHT }}
        contentOffset={{ x: 0, y: Math.max(0, selectedIndex) * ITEM_HEIGHT }}
      >
        {values.map((item) => {
          const active = item.value === selected;
          return (
            <Pressable
              key={item.value}
              onPress={() => {
                onSelect(item.value);
                const idx = values.findIndex((v) => v.value === item.value);
                ref.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
              }}
              style={{
                height: ITEM_HEIGHT,
                justifyContent: 'center',
                alignItems: align === 'center' ? 'center' : 'flex-start',
                paddingLeft: align === 'left' ? 12 : 0,
              }}
            >
              <Text
                style={{
                  fontSize: 19,
                  color: active ? '#F8FAFC' : '#64748B',
                  fontWeight: active ? '600' : '400',
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export type WheelDatePickerProps = {
  value: Date;
  onChange: (date: Date) => void;
  minYear?: number;
  maxYear?: number;
};

export function WheelDatePicker({ value, onChange, minYear, maxYear }: WheelDatePickerProps) {
  const now = new Date();
  const maxY = maxYear ?? now.getFullYear();
  const minY = minYear ?? maxY - 10;

  const month = value.getMonth();
  const day = value.getDate();
  const year = value.getFullYear();

  const monthValues = useMemo(() => MONTHS.map((label, i) => ({ value: i, label })), []);

  const daysInMonth = getDaysInMonth(new Date(year, month, 1));
  const dayValues = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
    [daysInMonth],
  );

  const yearValues = useMemo(
    () =>
      Array.from({ length: maxY - minY + 1 }, (_, i) => {
        const y = minY + i;
        return { value: y, label: String(y) };
      }),
    [minY, maxY],
  );

  const emit = (m: number, d: number, y: number) => {
    const clampedDay = Math.min(d, getDaysInMonth(new Date(y, m, 1)));
    onChange(new Date(y, m, clampedDay, 12, 0, 0, 0));
  };

  return (
    <View>
      <View style={{ position: 'relative', flexDirection: 'row' }}>
        {/* Center selection band */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: PAD * ITEM_HEIGHT,
            height: ITEM_HEIGHT,
            borderRadius: 10,
            backgroundColor: 'rgba(69,243,255,0.08)',
            borderColor: 'rgba(69,243,255,0.25)',
            borderTopWidth: 1,
            borderBottomWidth: 1,
            zIndex: 1,
          }}
        />
        <WheelColumn
          flex={2.2}
          align={Platform.OS === 'web' ? 'center' : 'left'}
          values={monthValues}
          selected={month}
          onSelect={(m) => emit(m, day, year)}
        />
        <WheelColumn
          flex={1.2}
          values={dayValues}
          selected={day}
          onSelect={(d) => emit(month, d, year)}
        />
        <WheelColumn
          flex={1.6}
          values={yearValues}
          selected={year}
          onSelect={(y) => emit(month, day, y)}
        />
      </View>
    </View>
  );
}
