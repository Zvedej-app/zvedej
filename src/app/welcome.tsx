import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { welcomeKey } from '../components/WelcomeGate';
import { createPlanFromTemplate } from '../components/training/planActions';
import { Button, Field, Row, T } from '../components/ui';
import { TEMPLATES } from '../data/templates';
import type { TKey } from '../lib/i18n';
import { useBottomInset, useTopInset } from '../lib/insets';
import { recommendTemplate, type Experience, type Goal, type PerWeek } from '../lib/recommend';
import { BLUE, FLAG, FONTS } from '../lib/theme';
import { startTour } from '../lib/tour';
import { confirm } from '../lib/dialog';
import { activePlan } from '../lib/training';
import { useAuth } from '../providers/AuthProvider';
import { useSettings } from '../providers/SettingsProvider';
import { useTraining } from '../providers/TrainingProvider';

const LOGO = require('../../assets/images/logo-white.png');

type Step = 'hello' | 'exp' | 'week' | 'goal' | 'coach' | 'maxes' | 'plan' | 'done';
const ORDER: Step[] = ['hello', 'exp', 'week', 'goal', 'coach', 'maxes', 'plan', 'done'];
const MAX_IDS = ['snatch', 'clean_jerk', 'back_squat'] as const;

/** Úvodní průvodce pro nového uživatele: pár otázek → doporučený plán z knihovny → nabídka prohlídky. */
export default function Welcome() {
  const { t, settings } = useSettings();
  const training = useTraining();
  const { session } = useAuth();
  const topInset = useTopInset();
  const bottom = useBottomInset();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('hello');
  const [exp, setExp] = useState<Experience | null>(null);
  const [perWeek, setPerWeek] = useState<PerWeek | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [coach, setCoach] = useState<boolean | null>(null);
  const [maxes, setMaxes] = useState<Record<string, string>>({});
  const [noMaxes, setNoMaxes] = useState(false);

  const idx = ORDER.indexOf(step);
  const next = () => setStep(ORDER[idx + 1]);
  const back = () => setStep(ORDER[Math.max(0, idx - 1)]);
  const finish = async (tour: boolean) => {
    if (session) await AsyncStorage.setItem(welcomeKey(session.userId), '1').catch(() => {});
    router.dismissTo('/training');
    if (tour) setTimeout(() => startTour(1), 600);
  };
  const skip = () => finish(false);

  const knowsMaxes = !noMaxes && MAX_IDS.some((id) => Number((maxes[id] ?? '').replace(',', '.')) > 0);
  const recId = recommendTemplate({ exp: exp ?? 'mid', perWeek: perWeek ?? 3, goal: goal ?? 'general', knowsMaxes });
  const rec = TEMPLATES.find((x) => x.id === recId) ?? TEMPLATES[0];
  const recBuilt = rec.build(settings.lang);

  const saveMaxes = () => {
    for (const id of MAX_IDS) {
      const v = Number((maxes[id] ?? '').replace(',', '.'));
      if (v > 0 && v < 500) training.setMax(id, v);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[BLUE[500], BLUE[600], BLUE[800]]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingTop: Math.max(topInset, insets.top) + 12,
            // tlačítka nesmí sedět až u spodního okraje
            paddingBottom: Math.max(bottom, 0) + 36,
            width: '100%',
            maxWidth: 560,
            alignSelf: 'center',
          }}
        >
          {/* horní lišta: zpět, průběh, přeskočit */}
          <Row style={{ paddingHorizontal: 16, height: 40 }} gap={12}>
            {idx > 0 && step !== 'done' ? (
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={back} hitSlop={10}>
                <Ionicons name="chevron-back" size={26} color="#FFF" />
              </Pressable>
            ) : (
              <View style={{ width: 26 }} />
            )}
            <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
              <View style={{ width: `${(idx / (ORDER.length - 1)) * 100}%`, height: 6, backgroundColor: FLAG.red }} />
            </View>
            {step !== 'done' ? (
              <Pressable accessibilityRole="button" onPress={skip} hitSlop={10}>
                <T color="rgba(255,255,255,0.85)" style={{ fontFamily: FONTS.bold }}>
                  {t('wel.skip')}
                </T>
              </Pressable>
            ) : (
              <View style={{ width: 26 }} />
            )}
          </Row>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 12, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            {step === 'hello' && (
              <View style={{ flex: 1, justifyContent: 'center', gap: 16, paddingBottom: 12 }}>
                <Image source={LOGO} style={{ width: 94, height: 110, alignSelf: 'center' }} accessibilityLabel="Zvedej" />
                <T color="#FFF" style={{ fontSize: 30, lineHeight: 36, fontFamily: FONTS.black, textAlign: 'center' }}>
                  {t('wel.hello')}
                </T>
                <T color="rgba(255,255,255,0.85)" style={{ textAlign: 'center' }}>
                  {t('wel.helloSub')}
                </T>
                <View style={{ gap: 10, marginTop: 6 }}>
                  <Feature icon="calendar" text={t('wel.f1')} />
                  <Feature icon="stats-chart" text={t('wel.f2')} />
                  <Feature icon="people" text={t('wel.f3')} />
                </View>
              </View>
            )}

            {step === 'exp' && (
              <>
                <Q title={t('wel.expQ')} />
                {(['new', 'mid', 'pro'] as Experience[]).map((k) => (
                  <Choice
                    key={k}
                    on={exp === k}
                    title={t(`wel.exp.${k}` as TKey)}
                    sub={t(`wel.exp.${k}.sub` as TKey)}
                    onPress={() => setExp(k)}
                  />
                ))}
              </>
            )}

            {step === 'week' && (
              <>
                <Q title={t('wel.weekQ')} />
                {([3, 4, 5] as PerWeek[]).map((k) => (
                  <Choice key={k} on={perWeek === k} title={t(`wel.week.${k}` as TKey)} onPress={() => setPerWeek(k)} />
                ))}
              </>
            )}

            {step === 'goal' && (
              <>
                <Q title={t('wel.goalQ')} />
                {(['general', 'technique', 'strength', 'competition'] as Goal[]).map((k) => (
                  <Choice
                    key={k}
                    on={goal === k}
                    title={t(`wel.goal.${k}` as TKey)}
                    sub={t(`wel.goal.${k}.sub` as TKey)}
                    onPress={() => setGoal(k)}
                  />
                ))}
              </>
            )}

            {step === 'coach' && (
              <>
                <Q title={t('wel.coachQ')} />
                <Choice on={coach === true} title={t('wel.coachYes')} sub={t('wel.coachYesSub')} onPress={() => setCoach(true)} />
                <Choice on={coach === false} title={t('wel.coachNo')} sub={t('wel.coachNoSub')} onPress={() => setCoach(false)} />
              </>
            )}

            {step === 'maxes' && (
              <>
                <Q title={t('wel.maxQ')} sub={t('wel.maxSub')} />
                {!noMaxes &&
                  MAX_IDS.map((id) => (
                    <Row key={id} gap={12} style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 12 }}>
                      <T color="#FFF" style={{ flex: 1, fontFamily: FONTS.bold, fontSize: 17 }}>
                        {t(`wel.max.${id}` as TKey)}
                      </T>
                      <Field
                        style={{ width: 110 }}
                        inputStyle={{ textAlign: 'center', fontSize: 18, fontFamily: FONTS.bold }}
                        keyboardType="decimal-pad"
                        placeholder="kg"
                        value={maxes[id] ?? ''}
                        onChangeText={(v) => setMaxes({ ...maxes, [id]: v.replace(/[^0-9.,]/g, '') })}
                      />
                    </Row>
                  ))}
                <Choice on={noMaxes} title={t('wel.noMax')} sub={t('wel.noMaxSub')} onPress={() => setNoMaxes(!noMaxes)} />
              </>
            )}

            {step === 'plan' && (
              <>
                <Q title={coach ? t('wel.planCoachQ') : t('wel.planQ')} sub={coach ? t('wel.planCoachSub') : undefined} />
                <View style={{ backgroundColor: '#FFF', borderRadius: 20, padding: 18, gap: 8 }}>
                  <Row gap={8}>
                    <Ionicons name="sparkles" size={18} color={FLAG.red} />
                    <T v="caption" color={FLAG.red} style={{ fontFamily: FONTS.black, letterSpacing: 0.6 }}>
                      {t('wel.recommended').toUpperCase()}
                    </T>
                  </Row>
                  <T v="h2" color={BLUE[800]}>
                    {recBuilt.name}
                  </T>
                  <T v="small" color="#3B4A66">
                    {rec.desc(settings.lang)}
                  </T>
                  <T v="small" color="#3B4A66" style={{ fontFamily: FONTS.bold }}>
                    {t('lib.perWeek', { n: recBuilt.days.length })}
                    {recBuilt.weeks ? ` · ${t('lib.weeks', { n: recBuilt.weeks })}` : ''}
                  </T>
                </View>
              </>
            )}

            {step === 'done' && (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="checkmark" size={54} color="#4CBB17" />
                </View>
                <T color="#FFF" style={{ fontSize: 28, lineHeight: 34, fontFamily: FONTS.black, textAlign: 'center' }}>
                  {t('wel.doneTitle')}
                </T>
                <T color="rgba(255,255,255,0.85)" style={{ textAlign: 'center' }}>
                  {t('wel.doneSub')}
                </T>
              </View>
            )}
          </ScrollView>

          {/* tlačítka dole */}
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            {step === 'hello' && <Big title={t('wel.start')} onPress={next} />}
            {step === 'exp' && <Big title={t('tour.next')} onPress={next} disabled={!exp} />}
            {step === 'week' && <Big title={t('tour.next')} onPress={next} disabled={!perWeek} />}
            {step === 'goal' && <Big title={t('tour.next')} onPress={next} disabled={!goal} />}
            {step === 'coach' && <Big title={t('tour.next')} onPress={next} disabled={coach === null} />}
            {step === 'maxes' && (
              <Big
                title={t('tour.next')}
                onPress={() => {
                  saveMaxes();
                  next();
                }}
              />
            )}
            {step === 'plan' && (
              <>
                <Big
                  title={t('wel.usePlan')}
                  onPress={async () => {
                    // spuštěno znovu z Návodu: aktivní plán nahradíme jen po potvrzení
                    const current = activePlan(training.data);
                    if (
                      current &&
                      !(await confirm(t('lib.replaceQ', { name: current.name }), { ok: t('common.yes'), cancel: t('common.cancel') }))
                    )
                      return;
                    createPlanFromTemplate(training, rec.id, settings.lang, true);
                    next();
                  }}
                />
                <Button
                  kind="ghost"
                  textColor="#FFF"
                  title={t('wel.otherPlan')}
                  onPress={async () => {
                    if (session) await AsyncStorage.setItem(welcomeKey(session.userId), '1').catch(() => {});
                    router.replace('/plan-library');
                  }}
                />
                <Button kind="ghost" textColor="rgba(255,255,255,0.75)" title={t('wel.noPlan')} onPress={next} />
              </>
            )}
            {step === 'done' && (
              <>
                <Big title={t('wel.tour')} icon="compass" onPress={() => finish(true)} />
                <Button kind="ghost" textColor="#FFF" title={t('wel.noTour')} onPress={() => finish(false)} />
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Q({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ gap: 6, marginBottom: 6 }}>
      <T color="#FFF" style={{ fontSize: 26, lineHeight: 32, fontFamily: FONTS.black }}>
        {title}
      </T>
      {sub ? <T color="rgba(255,255,255,0.8)">{sub}</T> : null}
    </View>
  );
}

function Feature({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <Row gap={12} style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14 }}>
      <Ionicons name={icon} size={22} color="#FFF" />
      <T color="#FFF" style={{ flex: 1 }}>
        {text}
      </T>
    </Row>
  );
}

function Choice({ on, title, sub, onPress }: { on: boolean; title: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 18,
        padding: 16,
        backgroundColor: on ? '#FFF' : 'rgba(255,255,255,0.1)',
        borderWidth: 2,
        borderColor: on ? '#FFF' : 'rgba(255,255,255,0.15)',
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <T color={on ? BLUE[800] : '#FFF'} style={{ fontFamily: FONTS.bold, fontSize: 17 }}>
          {title}
        </T>
        {sub ? (
          <T v="small" color={on ? '#3B4A66' : 'rgba(255,255,255,0.75)'}>
            {sub}
          </T>
        ) : null}
      </View>
      <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? FLAG.red : 'rgba(255,255,255,0.6)'} />
    </Pressable>
  );
}

function Big({
  title,
  onPress,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <Button
      title={title}
      icon={icon}
      onPress={onPress}
      disabled={disabled}
      style={{ minHeight: 56, borderRadius: 16, backgroundColor: FLAG.red }}
    />
  );
}
