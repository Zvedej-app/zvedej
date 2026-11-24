import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  Banner,
  Button,
  Card,
  Empty,
  Field,
  Header,
  IconButton,
  Loading,
  Row,
  Screen,
  Segmented,
  Sheet,
  T,
} from '../components/ui';
import { api } from '../lib/api';
import { confirm, notify, toast } from '../lib/dialog';
import type { TKey } from '../lib/i18n';
import type { ContentReport, ModerationAction, ModerationAppeal } from '../lib/types';
import { useAuth } from '../providers/AuthProvider';
import { useSettings } from '../providers/SettingsProvider';

const KIND_ICON = { user: 'person-outline', message: 'chatbubble-outline', video: 'videocam-outline' } as const;

/** Přehled nahlášení pro správce: posouzení, odstranění obsahu, zablokování účtu. */
export default function ModerationScreen() {
  const { t, colors, locale } = useSettings();
  const { profile } = useAuth();
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [section, setSection] = useState<'reports' | 'appeals'>('reports');
  const [list, setList] = useState<ContentReport[] | null>(null);
  const [act, setAct] = useState<{ report: ContentReport; action: ModerationAction } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .listReports(filter)
      .then(setList)
      .catch(() => setList([]));
  }, [filter]);
  useEffect(load, [load]);

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
      new Date(iso),
    );

  const resolve = async () => {
    if (!act) return;
    if (act.action !== 'dismiss' && !reason.trim()) return notify(t('mod.reasonRequired'));
    setBusy(true);
    try {
      await api.resolveReport(act.report.id, act.action, reason.trim());
      setAct(null);
      setReason('');
      toast(t('mod.done'));
      load();
    } catch {
      notify(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  if (!profile?.isAdmin) {
    return (
      <Screen>
        <Header
          left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
          title={t('mod.title')}
        />
        <Empty icon="lock-closed-outline" text={t('mod.forbidden')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={t('mod.title')}
        right={<IconButton name="refresh" onPress={load} label={t('mod.refresh')} />}
      />
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Segmented
          value={section}
          onChange={setSection}
          options={[
            { key: 'reports', label: t('mod.title') },
            { key: 'appeals', label: t('appeal.listTitle') },
          ]}
        />
      </View>
      {section === 'appeals' ? (
        <AppealsList />
      ) : (
        <>
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <Segmented
              value={filter}
              onChange={(f) => {
                setList(null);
                setFilter(f);
              }}
              options={[
                { key: 'open', label: t('mod.open') },
                { key: 'all', label: t('mod.all') },
              ]}
            />
          </View>
          {list === null ? (
            <Loading />
          ) : list.length === 0 ? (
            <Empty icon="shield-checkmark-outline" text={t('mod.empty')} />
          ) : (
            <Screen scroll edges={[]}>
              <Banner text={t('mod.hint')} />
              {list.map((r) => (
                <Card key={r.id} style={{ gap: 10 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row gap={8}>
                      <Ionicons name={KIND_ICON[r.kind]} size={18} color={colors.primary} />
                      <T style={{ fontWeight: '800' }}>{t(`mod.kind.${r.kind}` as TKey)}</T>
                      {r.status !== 'open' && (
                        <T v="caption" muted>
                          · {t(`mod.status.${r.status}` as TKey)}
                        </T>
                      )}
                    </Row>
                    <T v="caption" muted>
                      {fmt(r.createdAt)}
                    </T>
                  </Row>

                  <T v="small">
                    <T v="small" muted>
                      {t('mod.target')}:{' '}
                    </T>
                    <T
                      v="small"
                      color={colors.primary}
                      style={{ fontWeight: '700' }}
                      onPress={r.targetUserId ? () => router.push(`/user/${r.targetUserId}`) : undefined}
                    >
                      {r.targetName || '—'}
                    </T>
                    {r.targetBanned ? <T v="small" color={colors.danger}>{`  ${t('mod.banned')}`}</T> : null}
                  </T>
                  <T v="small" muted>
                    {t('mod.reporter')}: {r.reporterName || '—'}
                  </T>
                  {r.reason ? (
                    <T v="small">
                      <T v="small" muted>
                        {t('mod.reasonLabel')}:{' '}
                      </T>
                      {r.reason}
                    </T>
                  ) : null}
                  {r.snapshot ? (
                    <View
                      style={{
                        backgroundColor: colors.bg,
                        borderRadius: 10,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <T v="small" selectable>
                        {r.snapshot}
                      </T>
                    </View>
                  ) : null}
                  {r.videoUrl ? (
                    <Button
                      small
                      kind="ghost"
                      icon="play-circle-outline"
                      title={`${t('mod.openVideo')}${r.videoHidden ? ` (${t('mod.hidden')})` : ''}`}
                      onPress={() => WebBrowser.openBrowserAsync(r.videoUrl!)}
                      style={{ alignSelf: 'flex-start' }}
                    />
                  ) : null}
                  {r.sameTargetReports > 1 && r.status === 'open' ? (
                    <T v="caption" color={colors.danger} style={{ fontWeight: '700' }}>
                      {t('mod.reportsOnUser', { n: r.sameTargetReports })}
                    </T>
                  ) : null}
                  {r.status !== 'open' && r.resolution ? (
                    <T v="caption" muted>
                      {t('mod.resolution')}: {r.resolution}
                    </T>
                  ) : null}

                  {r.status === 'open' ? (
                    <Row gap={8} style={{ flexWrap: 'wrap' }}>
                      <Button
                        small
                        kind="secondary"
                        title={t('mod.dismiss')}
                        style={{ flexGrow: 1 }}
                        onPress={() => setAct({ report: r, action: 'dismiss' })}
                      />
                      <Button
                        small
                        kind="secondary"
                        title={t('mod.remove')}
                        style={{ flexGrow: 1 }}
                        onPress={() => setAct({ report: r, action: 'remove' })}
                      />
                      {!r.targetBanned && r.targetUserId ? (
                        <Button
                          small
                          kind="danger"
                          title={t('mod.ban')}
                          style={{ flexGrow: 1 }}
                          onPress={() => setAct({ report: r, action: 'ban' })}
                        />
                      ) : null}
                    </Row>
                  ) : r.targetBanned && r.targetUserId ? (
                    <Button
                      small
                      kind="ghost"
                      title={t('mod.unban')}
                      style={{ alignSelf: 'flex-start' }}
                      onPress={async () => {
                        if (
                          !(await confirm(t('mod.unbanQ', { name: r.targetName }), {
                            ok: t('mod.unban'),
                            cancel: t('common.cancel'),
                          }))
                        )
                          return;
                        await api.unbanUser(r.targetUserId!).catch(() => notify(t('common.error')));
                        load();
                      }}
                    />
                  ) : null}
                </Card>
              ))}
            </Screen>
          )}
        </>
      )}
      <Sheet visible={!!act} onClose={() => setAct(null)} title={act ? t(`mod.${act.action}` as TKey) : ''}>
        <View style={{ gap: 12, paddingHorizontal: 16 }}>
          <T v="small" muted>
            {act ? t(`mod.${act.action}Hint` as TKey) : ''}
          </T>
          <Field
            label={t('mod.reason')}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={500}
            placeholder={act?.action === 'dismiss' ? t('mod.reasonOptional') : t('mod.reasonPlaceholder')}
          />
          <Button title={t('mod.confirm')} kind={act?.action === 'ban' ? 'danger' : 'primary'} onPress={resolve} loading={busy} />
        </View>
      </Sheet>
    </Screen>
  );
}

/** Odvolání uživatelů proti rozhodnutí moderátora (DSA čl. 20) */
function AppealsList() {
  const { t, colors, locale } = useSettings();
  const [list, setList] = useState<ModerationAppeal[] | null>(null);
  const [decision, setDecision] = useState<{ a: ModerationAppeal; grant: boolean } | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    api
      .listAppeals('all')
      .then(setList)
      .catch(() => setList([]));
  }, []);
  useEffect(load, [load]);

  const resolve = async () => {
    if (!decision) return;
    if (!text.trim()) return notify(t('mod.reasonRequired'));
    setBusy(true);
    try {
      await api.resolveAppeal(decision.a.id, decision.grant, text.trim());
      setDecision(null);
      setText('');
      toast(t('mod.done'));
      load();
    } catch {
      notify(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  if (list === null) return <Loading />;
  if (!list.length) return <Empty icon="scale-outline" text={t('appeal.none')} />;
  return (
    <Screen scroll edges={[]}>
      <Banner text={t('appeal.adminHint')} />
      {list.map((a) => (
        <Card key={a.id} style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T style={{ fontWeight: '800' }}>{a.userName || '—'}</T>
            <T v="caption" muted>
              {new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
                new Date(a.createdAt),
              )}
            </T>
          </Row>
          {a.noticeReason ? (
            <T v="small" muted>
              {t('mod.resolution')}: {a.noticeReason}
            </T>
          ) : null}
          <View style={{ backgroundColor: colors.bg, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.border }}>
            <T v="small" selectable>
              {a.body}
            </T>
          </View>
          {a.status === 'open' ? (
            <Row gap={8}>
              <Button
                small
                kind="secondary"
                title={t('appeal.uphold')}
                style={{ flexGrow: 1 }}
                onPress={() => setDecision({ a, grant: false })}
              />
              <Button small title={t('appeal.grant')} style={{ flexGrow: 1 }} onPress={() => setDecision({ a, grant: true })} />
            </Row>
          ) : (
            <T v="caption" muted>
              {a.status === 'granted' ? t('appeal.granted') : t('appeal.upheld')}
              {a.decision ? ` – ${a.decision}` : ''}
            </T>
          )}
        </Card>
      ))}
      <Sheet
        visible={!!decision}
        onClose={() => setDecision(null)}
        title={decision?.grant ? t('appeal.grant') : t('appeal.uphold')}
      >
        <View style={{ gap: 12, paddingHorizontal: 16 }}>
          <T v="small" muted>
            {decision?.grant ? t('appeal.grantHint') : t('appeal.upholdHint')}
          </T>
          <Field label={t('mod.reason')} value={text} onChangeText={setText} multiline maxLength={1000} />
          <Button title={t('mod.confirm')} onPress={resolve} loading={busy} />
        </View>
      </Sheet>
    </Screen>
  );
}
