import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, SectionList, View } from 'react-native';
import { ClubBadge } from '../components/ClubBadge';
import { WeightSheet } from '../components/training/ToolsView';
import {
  Avatar,
  Banner,
  Button,
  Card,
  Chip,
  Field,
  Header,
  IconButton,
  ListItem,
  Row,
  Screen,
  SearchBar,
  Sheet,
  T,
} from '../components/ui';
import { range, Wheel } from '../components/WheelPicker';
import { api } from '../lib/api';
import {
  ageGroupLabel,
  categoriesFor,
  categoryForBodyweight,
  eligibleAgeGroups,
  formatCategory,
  suggestAgeGroup,
} from '../lib/categories';
import { getClub, searchClubs } from '../lib/clubs';
import type { AgeGroupId, Gender, Profile } from '../lib/types';
import { formatBodyweight, formatNumber, parseNum, toDisplay, toStoredKg } from '../lib/units';
import { useAuth } from '../providers/AuthProvider';
import { useSettings } from '../providers/SettingsProvider';

const THIS_YEAR = new Date().getFullYear();
const YEARS = range(1930, THIS_YEAR - 15).reverse();

export default function ProfileEdit() {
  const { t, settings } = useSettings();
  const { profile, session, saveProfile } = useAuth();
  const unit = settings.unit;
  const [p, setP] = useState<Profile | null>(profile);
  const [snatch, setSnatch] = useState(profile?.prSnatch ? String(Math.round(toDisplay(profile.prSnatch, unit))) : '');
  const [cj, setCj] = useState(profile?.prCleanJerk ? String(Math.round(toDisplay(profile.prCleanJerk, unit))) : '');
  const [clubSheet, setClubSheet] = useState(false);
  const [yearSheet, setYearSheet] = useState(false);
  const [bwSheet, setBwSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [newAvatar, setNewAvatar] = useState<{ uri: string; mime: string } | null>(null);
  const [year, setYear] = useState(profile?.birthYear ?? 2000);

  if (!p || !session) return null;
  const set = (patch: Partial<Profile>) => setP({ ...p, ...patch });
  const groups = eligibleAgeGroups(p.birthYear);
  const cats = p.gender ? categoriesFor(p.gender, p.ageGroup) : [];

  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    setNewAvatar({ uri: a.uri, mime: a.mimeType ?? 'image/jpeg' });
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      let avatarUrl = p.avatarUrl;
      if (newAvatar) avatarUrl = await api.uploadAvatar(session.userId, newAvatar.uri, newAvatar.mime);
      const s = parseNum(snatch);
      const c = parseNum(cj);
      await saveProfile({
        firstName: p.firstName.trim(),
        lastName: p.lastName.trim(),
        motto: p.motto?.trim() || null,
        avatarUrl,
        clubId: p.clubId,
        gender: p.gender,
        birthYear: p.birthYear,
        ageGroup: p.ageGroup,
        weightCategory: p.weightCategory,
        bodyweight: p.bodyweight,
        prSnatch: s ? toStoredKg(s, unit) : null,
        prCleanJerk: c ? toStoredKg(c, unit) : null,
      });
      router.back();
    } catch (e: any) {
      setErr(e?.message ?? t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const club = getClub(p.clubId);

  return (
    <Screen edges={['top', 'bottom']}>
      <Header
        left={<IconButton name="close" onPress={() => router.back()} label={t('common.close')} />}
        title={t('pr.edit')}
        right={<Button small title={t('common.save')} onPress={save} loading={busy} />}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Pressable onPress={pickPhoto}>
              <Avatar uri={newAvatar?.uri ?? p.avatarUrl} name={`${p.firstName} ${p.lastName}`} size={96} ring />
            </Pressable>
            <Row>
              <Button small kind="ghost" icon="camera-outline" title={t('pr.changePhoto')} onPress={pickPhoto} />
              {(p.avatarUrl || newAvatar) && (
                <Button
                  small
                  kind="ghost"
                  title={t('pr.removePhoto')}
                  onPress={() => {
                    setNewAvatar(null);
                    set({ avatarUrl: null });
                  }}
                />
              )}
            </Row>
            <T v="caption" muted>
              {t('pr.photo')} ({t('common.optional')})
            </T>
          </View>

          <Row gap={10}>
            <Field
              label={t('auth.firstName')}
              value={p.firstName}
              onChangeText={(firstName) => set({ firstName })}
              style={{ flex: 1 }}
            />
            <Field
              label={t('auth.lastName')}
              value={p.lastName}
              onChangeText={(lastName) => set({ lastName })}
              style={{ flex: 1 }}
            />
          </Row>
          <Field
            label={`${t('pr.motto')} (${t('common.optional')})`}
            placeholder={t('pr.mottoPh')}
            value={p.motto ?? ''}
            maxLength={160}
            onChangeText={(motto) => set({ motto })}
          />

          <Card style={{ padding: 0, gap: 0 }}>
            <ListItem
              icon="barbell-outline"
              title={t('pr.club')}
              value={club?.name ?? t('pr.noClub')}
              onPress={() => setClubSheet(true)}
            />
            <ListItem
              icon="calendar-outline"
              title={t('pr.birthYear')}
              value={p.birthYear ? String(p.birthYear) : '—'}
              onPress={() => setYearSheet(true)}
            />
            <ListItem
              icon="scale-outline"
              title={t('pr.bodyweight')}
              value={p.bodyweight ? formatBodyweight(p.bodyweight, unit) : '—'}
              onPress={() => setBwSheet(true)}
            />
          </Card>

          <T v="label" muted>
            {t('pr.gender')}
          </T>
          <Row>
            {(['M', 'F'] as Gender[]).map((g) => (
              <Chip
                key={g}
                label={g === 'M' ? t('pr.male') : t('pr.female')}
                on={p.gender === g}
                onPress={() => set({ gender: g, weightCategory: null })}
              />
            ))}
          </Row>

          <T v="label" muted>
            {t('pr.ageGroup')}
          </T>
          <Row style={{ flexWrap: 'wrap' }} gap={6}>
            {groups.map((g) => (
              <Chip
                key={g}
                label={ageGroupLabel(g, p.gender, settings.lang)}
                on={p.ageGroup === g}
                onPress={() =>
                  set({
                    ageGroup: g as AgeGroupId,
                    // dorost má jiné kategorie – nevalidní kategorii zrušíme
                    weightCategory:
                      p.gender && p.weightCategory && categoriesFor(p.gender, g).includes(p.weightCategory)
                        ? p.weightCategory
                        : null,
                  })
                }
              />
            ))}
          </Row>

          <Row style={{ justifyContent: 'space-between' }}>
            <T v="label" muted>
              {t('pr.weightCategory')}
            </T>
            {p.gender && p.bodyweight && (
              <Button
                small
                kind="ghost"
                icon="sparkles-outline"
                title={t('pr.categoryAuto')}
                onPress={() => set({ weightCategory: categoryForBodyweight(p.gender!, p.ageGroup, p.bodyweight!) })}
              />
            )}
          </Row>
          {p.gender ? (
            <Row style={{ flexWrap: 'wrap' }} gap={6}>
              {cats.map((c) => (
                <Chip key={c} label={formatCategory(c)} on={p.weightCategory === c} onPress={() => set({ weightCategory: c })} />
              ))}
            </Row>
          ) : (
            <T v="small" muted>
              {t('pr.gender')} → {t('pr.weightCategory').toLowerCase()}
            </T>
          )}

          <T v="label" muted style={{ marginTop: 6 }}>
            {t('pr.prs')}
          </T>
          <Row gap={10}>
            <Field
              label={`${t('pr.snatch')} (${unit})`}
              value={snatch}
              onChangeText={(v) => setSnatch(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              style={{ flex: 1 }}
              placeholder="0"
            />
            <Field
              label={`${t('pr.cj')} (${unit})`}
              value={cj}
              onChangeText={(v) => setCj(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              style={{ flex: 1 }}
              placeholder="0"
            />
          </Row>
          {parseNum(snatch) && parseNum(cj) ? (
            <T muted>
              {t('pr.total')}:{' '}
              <T style={{ fontWeight: '800' }}>
                {formatNumber((parseNum(snatch) ?? 0) + (parseNum(cj) ?? 0))} {unit}
              </T>
            </T>
          ) : null}

          {err && <Banner icon="alert-circle-outline" text={err} />}
          <Button title={t('common.save')} onPress={save} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ClubSheet
        visible={clubSheet}
        value={p.clubId}
        onClose={() => setClubSheet(false)}
        onPick={(clubId) => {
          set({ clubId });
          setClubSheet(false);
        }}
      />

      <Sheet visible={yearSheet} onClose={() => setYearSheet(false)} title={t('pr.birthYear')}>
        <View style={{ alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
          <Wheel values={YEARS} value={year} onChange={setYear} width={140} />
          <Button
            title={t('common.done')}
            style={{ alignSelf: 'stretch' }}
            onPress={() => {
              const eligible = eligibleAgeGroups(year);
              set({
                birthYear: year,
                ageGroup: p.ageGroup && eligible.includes(p.ageGroup) ? p.ageGroup : suggestAgeGroup(year),
              });
              setYearSheet(false);
            }}
          />
        </View>
      </Sheet>

      <WeightSheet
        visible={bwSheet}
        title={t('pr.bodyweight')}
        kg={p.bodyweight ?? 80}
        min={30}
        decimals
        onClose={() => setBwSheet(false)}
        onSave={(bodyweight) => set({ bodyweight })}
        onClear={() => set({ bodyweight: null })}
      />
    </Screen>
  );
}

function ClubSheet({
  visible,
  value,
  onClose,
  onPick,
}: {
  visible: boolean;
  value: number | null;
  onClose: () => void;
  onPick: (id: number | null) => void;
}) {
  const { t, colors } = useSettings();
  const [q, setQ] = useState('');
  const sections = useMemo(() => {
    const list = searchClubs(q);
    return (['cechy', 'morava'] as const)
      .map((r) => ({
        title: t(r === 'cechy' ? 'csv.region.cechy' : 'csv.region.morava'),
        data: list.filter((c) => c.region === r),
      }))
      .filter((s) => s.data.length);
  }, [q, t]);
  return (
    <Sheet visible={visible} onClose={onClose} title={t('pr.chooseClub')} full>
      <View style={{ flex: 1, paddingHorizontal: 16, gap: 8 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('common.search')} />
        <SectionList
          sections={sections}
          keyExtractor={(c) => String(c.id)}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={<ListItem icon="close-circle-outline" title={t('pr.noClub')} onPress={() => onPick(null)} />}
          renderSectionHeader={({ section }) => (
            <T v="label" muted style={{ marginTop: 12, marginBottom: 4 }}>
              {section.title}
            </T>
          )}
          renderItem={({ item }) => (
            <View style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
              <ListItem
                left={<ClubBadge club={item} size={32} />}
                title={item.name}
                subtitle={item.city}
                onPress={() => onPick(item.id)}
                right={value === item.id ? <T color={colors.primary}>✓</T> : undefined}
              />
            </View>
          )}
        />
      </View>
    </Sheet>
  );
}
