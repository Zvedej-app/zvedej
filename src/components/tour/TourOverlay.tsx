import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import type { TKey } from '../../lib/i18n';
import { FONTS } from '../../lib/theme';
import { getTourState, measureTarget, setTourStep, subscribeTour, type Rect } from '../../lib/tour';
import { useSettings } from '../../providers/SettingsProvider';
import { Button, Row, T, type IconName } from '../ui';

interface Step {
  /** prvek ke zvýraznění (TourTarget id) */
  target?: string;
  /** obrazovka, na kterou se má aplikace přepnout */
  route?: string;
  icon: IconName;
  title: TKey;
  text: TKey;
}

export const TOUR_STEPS: Step[] = [
  { icon: 'sparkles', title: 'tour.0.t', text: 'tour.0.x' },
  { target: 'tab-index', route: '/', icon: 'newspaper', title: 'tour.1.t', text: 'tour.1.x' },
  { target: 'tab-training', route: '/training', icon: 'barbell', title: 'tour.2.t', text: 'tour.2.x' },
  { target: 'tr-plans', route: '/training', icon: 'calendar', title: 'tour.3.t', text: 'tour.3.x' },
  { target: 'tr-seg', route: '/training', icon: 'albums', title: 'tour.4.t', text: 'tour.4.x' },
  { target: 'tr-add', route: '/training', icon: 'add-circle', title: 'tour.5.t', text: 'tour.5.x' },
  { target: 'tab-challenge', route: '/challenge', icon: 'play-circle', title: 'tour.6.t', text: 'tour.6.x' },
  { target: 'tab-settings', route: '/settings', icon: 'settings', title: 'tour.7.t', text: 'tour.7.x' },
  { target: 'tab-profile', route: '/profile', icon: 'person-circle', title: 'tour.8.t', text: 'tour.8.x' },
  { target: 'st-help', route: '/settings', icon: 'help-circle', title: 'tour.9.t', text: 'tour.9.x' },
];

const PAD = 6;

/** Prohlídka ovládání: ztmaví obrazovku, zvýrazní prvek a ukáže k němu vysvětlení. */
export function TourOverlay() {
  const { t, colors } = useSettings();
  const { width: W, height: H } = useWindowDimensions();
  const { step } = useSyncExternalStore(subscribeTour, getTourState, getTourState);
  const [rect, setRect] = useState<Rect | null>(null);
  const [shownStep, setShownStep] = useState<number | null>(null);

  useEffect(() => {
    if (step === null) return;
    let alive = true;
    const s = TOUR_STEPS[step];
    if (s.route) router.navigate(s.route as never);
    // počkáme, až se obrazovka přepne a vykreslí
    const id = setTimeout(
      async () => {
        const r = s.target ? await measureTarget(s.target) : null;
        if (!alive) return;
        setRect(r);
        setShownStep(step);
      },
      s.route ? 450 : 0,
    );
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [step, W, H]);

  if (step === null || shownStep !== step) return null;
  const s = TOUR_STEPS[step];
  const last = step === TOUR_STEPS.length - 1;
  const dim = 'rgba(0, 0, 40, 0.72)';
  const hole = rect ? { x: rect.x - PAD, y: rect.y - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 } : null;
  const cardW = Math.min(W - 32, 380);
  // kartu dáme pod zvýrazněný prvek, když se tam vejde, jinak nad něj
  const below = hole ? H - (hole.y + hole.h) > 250 : false;
  const cardPos = hole
    ? below
      ? { top: hole.y + hole.h + 12 }
      : { bottom: H - hole.y + 12 }
    : { top: Math.max(80, H / 2 - 160) };
  const close = () => setTourStep(null);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        {hole ? (
          <>
            <View
              style={{ position: 'absolute', left: 0, right: 0, top: 0, height: Math.max(0, hole.y), backgroundColor: dim }}
            />
            <View style={{ position: 'absolute', left: 0, right: 0, top: hole.y + hole.h, bottom: 0, backgroundColor: dim }} />
            <View
              style={{
                position: 'absolute',
                left: 0,
                width: Math.max(0, hole.x),
                top: hole.y,
                height: hole.h,
                backgroundColor: dim,
              }}
            />
            <View
              style={{ position: 'absolute', left: hole.x + hole.w, right: 0, top: hole.y, height: hole.h, backgroundColor: dim }}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: hole.x,
                top: hole.y,
                width: hole.w,
                height: hole.h,
                borderRadius: 14,
                borderWidth: 3,
                borderColor: '#F1B100',
              }}
            />
          </>
        ) : (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: dim }} />
        )}

        <View
          style={{
            position: 'absolute',
            left: (W - cardW) / 2,
            width: cardW,
            ...cardPos,
            backgroundColor: colors.bg,
            borderRadius: 20,
            padding: 18,
            gap: 10,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          <Row gap={10}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={s.icon} size={20} color="#FFF" />
            </View>
            <T v="h3" style={{ flex: 1 }}>
              {t(s.title)}
            </T>
            {step > 0 && (
              <T v="caption" muted style={{ fontFamily: FONTS.bold }}>
                {step}/{TOUR_STEPS.length - 1}
              </T>
            )}
          </Row>
          <T style={{ lineHeight: 22 }}>{t(s.text)}</T>
          {step > 0 && (
            <Row gap={5} style={{ justifyContent: 'center' }}>
              {TOUR_STEPS.slice(1).map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i + 1 === step ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i + 1 === step ? colors.primary : colors.border,
                  }}
                />
              ))}
            </Row>
          )}
          <Row gap={8} style={{ marginTop: 4 }}>
            {!last && (
              <Pressable accessibilityRole="button" onPress={close} style={{ paddingVertical: 10, paddingRight: 6 }}>
                <T muted style={{ fontFamily: FONTS.bold }}>
                  {step === 0 ? t('tour.later') : t('tour.skip')}
                </T>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            {step > 1 && <Button small kind="secondary" title={t('tour.prev')} onPress={() => setTourStep(step - 1)} />}
            <Button
              small
              title={step === 0 ? t('tour.go') : last ? t('tour.done') : t('tour.next')}
              icon={last ? 'checkmark' : 'arrow-forward'}
              onPress={() => (last ? close() : setTourStep(step + 1))}
            />
          </Row>
        </View>
      </View>
    </Modal>
  );
}
