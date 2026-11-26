import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useBottomInset, useTopInset } from '../lib/insets';
import { CONTENT_MAX, CONTENT_WIDE_MAX, useIsDesktop } from '../lib/layout';
import { FONTS, radius } from '../lib/theme';
import { useSettings } from '../providers/SettingsProvider';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/* ------------------------------- Text ------------------------------- */

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'label';

const VARIANTS: Record<Variant, TextStyle> = {
  h1: { fontSize: 28, fontFamily: FONTS.black, letterSpacing: -0.6 },
  h2: { fontSize: 22, fontFamily: FONTS.black, letterSpacing: -0.4 },
  h3: { fontSize: 17, fontFamily: FONTS.bold, letterSpacing: -0.1 },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 12, fontFamily: FONTS.bold, letterSpacing: 0.6, textTransform: 'uppercase' },
};

export function T({
  v = 'body',
  muted,
  color,
  style,
  children,
  ...rest
}: {
  v?: Variant;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  numberOfLines?: number;
  selectable?: boolean;
  /** vložený odkaz v textu */
  onPress?: () => void;
}) {
  const { colors } = useSettings();
  return (
    <RNText style={[VARIANTS[v], { color: color ?? (muted ? colors.textMuted : colors.text) }, style]} {...rest}>
      {children}
    </RNText>
  );
}

/* ------------------------------ Layout ------------------------------ */

export function Screen({
  children,
  scroll,
  edges = ['top'],
  style,
  contentStyle,
  refreshControl,
  wide,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  /** na počítači širší obsah (např. dva sloupce) */
  wide?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<any>;
}) {
  const { colors } = useSettings();
  const top = useTopInset();
  const bottom = useBottomInset();
  const desktop = useIsDesktop();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colors.bg,
          paddingTop: edges.includes('top') ? top : 0,
          paddingBottom: edges.includes('bottom') ? bottom : 0,
        },
        // na počítači je obsah ve sloupci uprostřed, aby řádky nebyly přes celou obrazovku
        desktop && { width: '100%', maxWidth: wide ? CONTENT_WIDE_MAX : CONTENT_MAX, alignSelf: 'center' },
        style,
      ]}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ padding: 16, paddingBottom: 40, gap: 14 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );
}

export function Header({
  title,
  left,
  right,
  center,
}: {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  center?: React.ReactNode;
}) {
  const { colors } = useSettings();
  return (
    <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
      <View style={styles.headerSide}>{left}</View>
      <View style={styles.headerCenter}>
        {center ?? (
          <T v="h3" numberOfLines={1}>
            {title}
          </T>
        )}
      </View>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const { colors } = useSettings();
  const s = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style];
  if (onPress)
    return (
      <PressScale onPress={onPress} style={s} scaleTo={0.98}>
        {children}
      </PressScale>
    );
  return <View style={s}>{children}</View>;
}

/**
 * Pressable, který se při stisku pružně zmáčkne (hmatová odezva jako u nativních aplikací).
 * Na webu i v telefonu běží animace v nativním vlákně, kde to jde.
 */
export function PressScale({
  children,
  onPress,
  style,
  scaleTo = 0.96,
  disabled,
  accessibilityLabel,
  accessibilityRole = 'button',
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'tab' | 'link';
}) {
  const [scale] = React.useState(() => new Animated.Value(1));
  const to = (v: number) =>
    Animated.spring(scale, {
      toValue: v,
      useNativeDriver: Platform.OS !== 'web',
      speed: 40,
      bounciness: v === 1 ? 8 : 0,
    }).start();
  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Row({ children, style, gap = 8 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Spacer({ h = 8 }: { h?: number }) {
  return <View style={{ height: h }} />;
}

/* ------------------------------ Buttons ----------------------------- */

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  loading,
  small,
  style,
  textColor,
}: {
  title: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** barva textu a ikony (např. na tmavém pozadí) */
  textColor?: string;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, tap } = useSettings();
  const bg =
    kind === 'primary'
      ? colors.primary
      : kind === 'secondary'
        ? colors.primarySoft
        : kind === 'danger'
          ? colors.danger
          : 'transparent';
  const fg = textColor ?? (kind === 'primary' || kind === 'danger' ? colors.onPrimary : colors.primary);
  return (
    <PressScale
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[styles.btn, small && styles.btnSmall, { backgroundColor: bg, opacity: disabled ? 0.45 : 1 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 19} color={fg} />}
          <RNText style={{ color: fg, fontFamily: FONTS.bold, fontSize: small ? 13.5 : 15.5, letterSpacing: 0 }}>{title}</RNText>
        </>
      )}
    </PressScale>
  );
}

export function IconButton({
  name,
  onPress,
  size = 24,
  color,
  label,
  style,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, tap } = useSettings();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [{ padding: 4, opacity: pressed ? 0.6 : 1 }, style]}
    >
      <Ionicons name={name} size={size} color={color ?? colors.text} />
    </Pressable>
  );
}

/* ------------------------------ Inputs ------------------------------ */

export function Field({
  label,
  hint,
  style,
  inputStyle,
  ...props
}: TextInputProps & { label?: string; hint?: string; style?: StyleProp<ViewStyle>; inputStyle?: StyleProp<TextStyle> }) {
  const { colors } = useSettings();
  return (
    <View style={[{ gap: 6 }, style]}>
      {label && (
        <T v="label" muted>
          {label}
        </T>
      )}
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[
          styles.input,
          webNoOutline,
          { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
          props.multiline && { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
          inputStyle,
        ]}
      />
      {hint && (
        <T v="caption" muted>
          {hint}
        </T>
      )}
    </View>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  onFocus,
  autoFocus,
}: {
  value: string;
  onChangeText: (s: string) => void;
  placeholder: string;
  onFocus?: () => void;
  autoFocus?: boolean;
}) {
  const { colors } = useSettings();
  return (
    <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        onFocus={onFocus}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        style={[{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 0, minHeight: 22 }, webNoOutline]}
      />
      {value.length > 0 && <IconButton name="close-circle" size={18} color={colors.textMuted} onPress={() => onChangeText('')} />}
    </View>
  );
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { key: K; label: string; icon?: IconName }[];
  value: K;
  onChange: (k: K) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, tap } = useSettings();
  return (
    <View style={[styles.segment, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(o.key);
            }}
            style={[styles.segmentItem, on && { backgroundColor: colors.accent }]}
          >
            {o.icon && <Ionicons name={o.icon} size={15} color={on ? colors.onPrimary : colors.textMuted} />}
            <RNText
              numberOfLines={1}
              style={{ color: on ? colors.onPrimary : colors.textMuted, fontWeight: '700', fontSize: 13 }}
            >
              {o.label}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, on, onPress, icon }: { label: string; on?: boolean; onPress?: () => void; icon?: IconName }) {
  const { colors, tap } = useSettings();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[
        styles.chip,
        { borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accent : colors.surface },
      ]}
    >
      {icon && <Ionicons name={icon} size={14} color={on ? colors.onPrimary : colors.text} />}
      <RNText style={{ color: on ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 13 }}>{label}</RNText>
    </Pressable>
  );
}

/* ------------------------------ Display ----------------------------- */

export function Avatar({ uri, name, size = 44, ring }: { uri?: string | null; name?: string; size?: number; ring?: boolean }) {
  const { colors } = useSettings();
  const initials = (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
  const inner = uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" transition={150} />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <RNText style={{ color: colors.primary, fontWeight: '800', fontSize: size * 0.38 }}>{initials || '?'}</RNText>
    </View>
  );
  if (!ring) return inner;
  return <View style={{ padding: 3, borderRadius: size, borderWidth: 2.5, borderColor: colors.primary }}>{inner}</View>;
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 64 }}>
      <T v="h2">{value}</T>
      <T v="caption" muted>
        {label}
      </T>
    </View>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
      <T v="label" muted>
        {children}
      </T>
      {right}
    </Row>
  );
}

export function Empty({ icon = 'sparkles-outline', text, action }: { icon?: IconName; text: string; action?: React.ReactNode }) {
  const { colors } = useSettings();
  return (
    <View style={{ alignItems: 'center', padding: 28, gap: 12 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <T muted style={{ textAlign: 'center' }}>
        {text}
      </T>
      {action}
    </View>
  );
}

export function Banner({ text, icon = 'information-circle-outline' }: { text: string; icon?: IconName }) {
  const { colors } = useSettings();
  return (
    <Row style={{ backgroundColor: colors.primarySoft, padding: 10, borderRadius: radius.md }}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <T v="small" style={{ flex: 1 }} color={colors.primaryStrong}>
        {text}
      </T>
    </Row>
  );
}

/* ---------------------------- List rows ----------------------------- */

export function ListGroup({ children, title }: { children: React.ReactNode; title?: string }) {
  const { colors } = useSettings();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: 8 }}>
      {title && (
        <T v="label" muted style={{ marginLeft: 4 }}>
          {title}
        </T>
      )}
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {items.map((c, i) => (
          <View key={i}>
            {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 14 }} />}
            {c}
          </View>
        ))}
      </View>
    </View>
  );
}

export function ListItem({
  icon,
  title,
  subtitle,
  value,
  onPress,
  toggle,
  onToggle,
  danger,
  right,
  left,
}: {
  icon?: IconName;
  /** vlastní prvek vlevo (např. logo klubu) místo ikony */
  left?: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  const { colors, tap } = useSettings();
  const color = danger ? colors.danger : colors.text;
  const content = (
    <Row style={{ paddingVertical: 12, paddingHorizontal: 14, minHeight: 52 }} gap={12}>
      {left}
      {icon && !left && (
        <View style={[styles.listIcon, { backgroundColor: danger ? 'transparent' : colors.primarySoft }]}>
          <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <T color={color} style={{ fontWeight: '600' }}>
          {title}
        </T>
        {subtitle && (
          <T v="caption" muted>
            {subtitle}
          </T>
        )}
      </View>
      {value && (
        <T v="small" muted numberOfLines={1} style={{ maxWidth: 160 }}>
          {value}
        </T>
      )}
      {right}
      {toggle !== undefined && (
        <Switch
          value={toggle}
          onValueChange={(v) => {
            tap();
            onToggle?.(v);
          }}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor="#FFFFFF"
          {...(Platform.OS === 'web' ? ({ activeThumbColor: '#FFFFFF' } as object) : {})}
        />
      )}
      {onPress && toggle === undefined && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Row>
  );
  // řádek s přepínačem jde přepnout klepnutím kamkoli na řádek
  const press = onPress ?? (toggle !== undefined && onToggle ? () => onToggle(!toggle) : null);
  if (!press) return content;
  return (
    <Pressable
      accessibilityRole={toggle !== undefined && !onPress ? 'switch' : 'button'}
      accessibilityState={toggle !== undefined ? { checked: toggle } : undefined}
      onPress={() => {
        tap();
        press();
      }}
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      {content}
    </Pressable>
  );
}

/* ----------------------------- Bottom sheet ------------------------- */

export function Sheet({
  visible,
  onClose,
  title,
  children,
  right,
  full,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  full?: boolean;
}) {
  const bottomInset = useBottomInset();
  const { colors } = useSettings();
  // na počítači se panel zobrazí jako dialog uprostřed obrazovky
  const desktop = useIsDesktop();
  return (
    <Modal visible={visible} transparent animationType={desktop ? 'fade' : 'slide'} onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={onClose} />
        <View
          style={{ flex: 1, justifyContent: desktop ? 'center' : 'flex-end', alignItems: desktop ? 'center' : undefined }}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.bg,
                paddingBottom: Math.max(bottomInset, 16),
                maxHeight: '92%',
              },
              full && { height: '92%' },
              desktop && { width: 520, maxHeight: '86%', borderRadius: 20, paddingTop: 16 },
              desktop && full && { height: '86%' },
            ]}
          >
            {!desktop && <View style={[styles.grabber, { backgroundColor: colors.border }]} />}
            {(title || right) && (
              <Row style={{ justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }}>
                <T v="h3" style={{ flex: 1 }}>
                  {title}
                </T>
                {right ?? <IconButton name="close" onPress={onClose} />}
              </Row>
            )}
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Loading() {
  const { colors } = useSettings();
  return (
    <View style={{ padding: 32, alignItems: 'center' }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

/** na webu skryje výchozí rámeček prohlížeče u vstupních polí */
const webNoOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

const styles = StyleSheet.create({
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { width: 72, flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerCenter: { flex: 1, alignItems: 'center' },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    minHeight: 48,
    borderRadius: radius.md,
  },
  btnSmall: { minHeight: 36, paddingHorizontal: 12, borderRadius: radius.sm },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  segment: { flexDirection: 'row', padding: 3, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.sm + 2,
  },
  chip: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  group: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  listIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 8 },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 10 },
});
