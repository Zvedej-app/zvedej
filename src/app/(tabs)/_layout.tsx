import { Ionicons } from '@expo/vector-icons';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useBottomInset } from '../../lib/insets';
import { LionLogo } from '../../components/Logo';
import { TourTarget } from '../../components/tour/TourTarget';
import { Avatar, type IconName } from '../../components/ui';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import type { TKey } from '../../lib/i18n';
import { emitTabEnter } from '../../lib/tabReset';
import { SIDEBAR_WIDTH, useIsDesktop } from '../../lib/layout';

const ICONS: Record<string, { on: IconName; off: IconName; label: TKey }> = {
  training: { on: 'barbell', off: 'barbell-outline', label: 'tab.training' },
  challenge: { on: 'play-circle', off: 'play-circle-outline', label: 'tab.challenge' },
  settings: { on: 'settings', off: 'settings-outline', label: 'tab.settings' },
};

/** Spodní lišta ve stylu Instagramu – jen ikony, aktivní ikona je plná. */
function InstaTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const bottomInset = useBottomInset();
  const { colors, t, tap } = useSettings();
  const { profile } = useAuth();
  const dark = state.routes[state.index]?.name === 'challenge';
  const fg = dark ? '#FFFFFF' : colors.text;
  const desktop = useIsDesktop();

  return (
    <View
      style={[
        desktop ? [styles.side, { borderRightColor: dark ? '#222' : colors.border }] : styles.bar,
        {
          // iPhony s tlačítkem nemají spodní odsazení – ikony by byly nalepené u okraje displeje
          paddingBottom: desktop ? 16 : Math.max(bottomInset, 22),
          backgroundColor: dark ? '#000000' : colors.tabBar,
          borderTopColor: dark ? '#222' : colors.border,
        },
      ]}
    >
      {/* na počítači: postranní panel s názvem aplikace nahoře */}
      {desktop && <Text style={[styles.brand, { color: dark ? '#FFFFFF' : colors.text }]}>Zvedej</Text>}
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const onPress = () => {
          tap();
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (event.defaultPrevented) return;
          // sekce se otevře na výchozí záložce – i při klepnutí na ikonu sekce, ve které už jsem
          emitTabEnter(route.name);
          if (!focused) navigateToTab(route.key);
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
            style={(state) =>
              desktop
                ? [
                    styles.sideItem,
                    // na webu Pressable hlásí i najetí myší
                    ((state as { hovered?: boolean }).hovered || focused) && {
                      backgroundColor: dark ? '#1A1A1A' : colors.surface,
                    },
                  ]
                : styles.item
            }
          >
            {desktop ? (
              <TourTarget id={`tab-${route.name}`} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={styles.sideIcon}>{icon}</View>
                <Text style={[styles.sideLabel, { color: fg, fontWeight: focused ? '800' : '500' }]}>{label}</Text>
              </TourTarget>
            ) : (
              <TourTarget id={`tab-${route.name}`} style={{ alignItems: 'center', gap: 4, paddingHorizontal: 6 }}>
                {icon}
                <View style={[styles.dot, { backgroundColor: focused ? (dark ? '#FFF' : colors.accent) : 'transparent' }]} />
              </TourTarget>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  // na počítači (široké okno v prohlížeči) je navigace vlevo, na telefonu dole
  const desktop = useIsDesktop();
  const { colors } = useSettings();
  return (
    <Tabs
      tabBar={(p) => <InstaTabBar {...p} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: desktop ? 'left' : 'bottom',
        // pozadí kolem sloupce s obsahem na počítači
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
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
  side: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: 28,
    paddingHorizontal: 12,
    gap: 4,
  },
  brand: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5, paddingHorizontal: 12, marginBottom: 24 },
  sideItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12 },
  sideIcon: { width: 40, alignItems: 'center' },
  sideLabel: { fontSize: 17 },
});
