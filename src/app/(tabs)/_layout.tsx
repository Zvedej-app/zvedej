import { Ionicons } from '@expo/vector-icons';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LionLogo } from '../../components/Logo';
import { Avatar, type IconName } from '../../components/ui';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import type { TKey } from '../../lib/i18n';

const ICONS: Record<string, { on: IconName; off: IconName; label: TKey }> = {
  training: { on: 'barbell', off: 'barbell-outline', label: 'tab.training' },
  challenge: { on: 'play-circle', off: 'play-circle-outline', label: 'tab.challenge' },
  settings: { on: 'settings', off: 'settings-outline', label: 'tab.settings' },
};

/** Spodní lišta ve stylu Instagramu – jen ikony, aktivní ikona je plná. */
function InstaTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, t, tap } = useSettings();
  const { profile } = useAuth();
  const dark = state.routes[state.index]?.name === 'challenge';
  const fg = dark ? '#FFFFFF' : colors.text;

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: dark ? '#000000' : colors.tabBar,
          borderTopColor: dark ? '#222' : colors.border,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const onPress = () => {
          tap();
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };
        let icon: React.ReactNode;
        let label: string;
        if (route.name === 'index') {
          label = t('tab.csv');
          icon = (
            <View style={{ opacity: focused ? 1 : 0.6 }}>
              <LionLogo height={30} />
            </View>
          );
        } else if (route.name === 'profile') {
          label = t('tab.profile');
          icon = (
            <View style={[styles.avatarWrap, { borderColor: focused ? fg : 'transparent' }]}>
              <Avatar uri={profile?.avatarUrl} name={`${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`} size={26} />
            </View>
          );
        } else {
          const i = ICONS[route.name];
          label = t(i.label);
          icon = <Ionicons name={focused ? i.on : i.off} size={27} color={focused && !dark ? colors.accent : fg} />;
        }
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            style={styles.item}
          >
            {icon}
            <View style={[styles.dot, { backgroundColor: focused ? (dark ? '#FFF' : colors.accent) : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <InstaTabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="training" />
      <Tabs.Screen name="challenge" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44 },
  avatarWrap: { borderWidth: 2, borderRadius: 20, padding: 1 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
