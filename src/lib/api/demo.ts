import AsyncStorage from '@react-native-async-storage/async-storage';
import { currentMonthKey, prevMonthKey } from '../date';
import { uuid } from '../id';
import { fallbackTheme } from '../../data/themes';
import type {
  ChallengeVideo,
  ContentReport,
  Conversation,
  FriendsOverview,
  FriendStatus,
  Message,
  ModerationNotice,
  MonthlyWinner,
  Profile,
  TrainingData,
} from '../types';
import type { Backend, Session } from './types';
import { fetchFeedCached } from './feeds';

/**
 * Demo backend – vše se ukládá do AsyncStorage v zařízení.
 * Slouží k vyzkoušení aplikace bez nastaveného Supabase projektu.
 */

const K = {
  session: 'zvedej:demo:session',
  users: 'zvedej:demo:users',
  videos: 'zvedej:demo:videos',
  likes: 'zvedej:demo:likes',
  training: (id: string) => `zvedej:demo:training:${id}`,
  seeded: 'zvedej:demo:seeded:v2',
  friends: (id: string) => `zvedej:demo:friends:${id}`,
  messages: (id: string) => `zvedej:demo:messages:${id}`,
  blocks: (id: string) => `zvedej:demo:blocks:${id}`,
  reports: 'zvedej:demo:reports',
  notices: (id: string) => `zvedej:demo:notices:${id}`,
};

interface DemoVideo {
  id: string;
  userId: string;
  month: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  baseLikes: number;
  createdAt: string;
}

const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
];

function demoProfile(p: Partial<Profile> & { id: string }): Profile {
  return {
    firstName: '',
    lastName: '',
    avatarUrl: null,
    motto: null,
    clubId: null,
    gender: null,
    birthYear: null,
    ageGroup: null,
    weightCategory: null,
    prSnatch: null,
    prCleanJerk: null,
    bodyweight: null,
    showBodyweight: false,
    isPublic: true,
    createdAt: new Date().toISOString(),
    ...p,
  };
}

const SEED_USERS: Profile[] = [
  demoProfile({
    id: 'demo-1',
    firstName: 'Tereza',
    lastName: 'Nováková',
    gender: 'F',
    clubId: 27,
    birthYear: 1999,
    ageGroup: 'SENIOR',
    weightCategory: '61',
    prSnatch: 78,
    prCleanJerk: 96,
    bodyweight: 60.4,
    showBodyweight: true,
    motto: 'Rychlé lokty, klidná hlava.',
  }),
  demoProfile({
    id: 'demo-2',
    firstName: 'Jakub',
    lastName: 'Dvořák',
    gender: 'M',
    clubId: 34,
    birthYear: 2006,
    ageGroup: 'U20',
    weightCategory: '85',
    prSnatch: 121,
    prCleanJerk: 150,
    bodyweight: 83.1,
    motto: 'Každý den o kilo lepší.',
  }),
  demoProfile({
    id: 'demo-3',
    firstName: 'Petr',
    lastName: 'Svoboda',
    gender: 'M',
    clubId: 14,
    birthYear: 1984,
    ageGroup: 'M40',
    weightCategory: '95',
    prSnatch: 105,
    prCleanJerk: 132,
    bodyweight: 93.7,
    motto: 'Věk je jen číslo na startovce.',
  }),
  demoProfile({
    id: 'demo-4',
    firstName: 'Eliška',
    lastName: 'Černá',
    gender: 'F',
    clubId: 5,
    birthYear: 2010,
    ageGroup: 'U17',
    weightCategory: '57',
    prSnatch: 58,
    prCleanJerk: 72,
    bodyweight: 56.2,
  }),
  demoProfile({
    id: 'demo-5',
    firstName: 'Martin',
    lastName: 'Procházka',
    gender: 'M',
    clubId: 26,
    birthYear: 1996,
    ageGroup: 'SENIOR',
    weightCategory: '75',
    prSnatch: 128,
    prCleanJerk: 160,
    bodyweight: 74.5,
    motto: 'Bar is life.',
  }),
  demoProfile({
    id: 'demo-6',
    firstName: 'Lucie',
    lastName: 'Králová',
    gender: 'F',
    clubId: 45,
    birthYear: 2002,
    ageGroup: 'U23',
    weightCategory: '69',
    prSnatch: 84,
    prCleanJerk: 104,
    bodyweight: 67.9,
  }),
];

async function get<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
const set = (key: string, v: unknown) => AsyncStorage.setItem(key, JSON.stringify(v));

async function ensureSeed() {
  if (await AsyncStorage.getItem(K.seeded)) return;
  const month = currentMonthKey();
  const prev = prevMonthKey(month);
  const now = Date.now();
  const videos: DemoVideo[] = [
    {
      id: 'v1',
      userId: 'demo-2',
      month,
      videoUrl: SAMPLE_VIDEOS[0],
      thumbnailUrl: null,
      caption: 'Trh 115 kg z bloků 🔥',
      baseLikes: 42,
      createdAt: new Date(now - 86400000 * 9).toISOString(),
    },
    {
      id: 'v2',
      userId: 'demo-1',
      month,
      videoUrl: SAMPLE_VIDEOS[1],
      thumbnailUrl: null,
      caption: 'Nadhoz 92 – konečně stabilní výraz',
      baseLikes: 57,
      createdAt: new Date(now - 86400000 * 7).toISOString(),
    },
    {
      id: 'v3',
      userId: 'demo-5',
      month,
      videoUrl: SAMPLE_VIDEOS[2],
      thumbnailUrl: null,
      caption: 'Dřep vpředu 3×3 @ 170',
      baseLikes: 31,
      createdAt: new Date(now - 86400000 * 5).toISOString(),
    },
    {
      id: 'v4',
      userId: 'demo-4',
      month,
      videoUrl: SAMPLE_VIDEOS[3],
      thumbnailUrl: null,
      caption: 'První trh přes 55!',
      baseLikes: 64,
      createdAt: new Date(now - 86400000 * 3).toISOString(),
    },
    {
      id: 'v5',
      userId: 'demo-3',
      month: prev,
      videoUrl: SAMPLE_VIDEOS[4],
      thumbnailUrl: null,
      caption: 'Masters PR v nadhozu',
      baseLikes: 88,
      createdAt: new Date(now - 86400000 * 40).toISOString(),
    },
    {
      id: 'v6',
      userId: 'demo-6',
      month: prev,
      videoUrl: SAMPLE_VIDEOS[0],
      thumbnailUrl: null,
      caption: 'Trh z visu',
      baseLikes: 51,
      createdAt: new Date(now - 86400000 * 38).toISOString(),
    },
  ];
  const users = await get<Profile[]>(K.users, []);
  const ids = new Set(users.map((u) => u.id));
  await set(K.users, [...users, ...SEED_USERS.filter((u) => !ids.has(u.id))]);
  await set(K.videos, videos);
  await AsyncStorage.setItem(K.seeded, '1');
}

interface DemoFriend {
  other: string;
  status: 'friends' | 'outgoing' | 'incoming';
}

const listeners = new Set<(s: Session | null) => void>();
const emit = (s: Session | null) => listeners.forEach((l) => l(s));

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function createDemoBackend(): Backend {
  async function session() {
    return get<Session | null>(K.session, null);
  }
  async function likes() {
    return get<Record<string, string[]>>(K.likes, {});
  }
  async function users() {
    await ensureSeed();
    return get<Profile[]>(K.users, []);
  }
  async function hydrate(list: DemoVideo[]): Promise<ChallengeVideo[]> {
    const [us, lk, s] = await Promise.all([users(), likes(), session()]);
    const byId = new Map(us.map((u) => [u.id, u]));
    return list.map((v) => {
      const a = byId.get(v.userId);
      const likers = lk[v.id] ?? [];
      return {
        id: v.id,
        userId: v.userId,
        month: v.month,
        videoUrl: v.videoUrl,
        thumbnailUrl: v.thumbnailUrl,
        caption: v.caption,
        likesCount: v.baseLikes + likers.length,
        likedByMe: !!s && likers.includes(s.userId),
        createdAt: v.createdAt,
        author: {
          id: v.userId,
          firstName: a?.firstName ?? '?',
          lastName: a?.lastName ?? '',
          avatarUrl: a?.avatarUrl ?? null,
          clubId: a?.clubId ?? null,
        },
      };
    });
  }
  /** Cizí profil: hmotnost jen se souhlasem (jako v databázi) */
  async function publicView(p: Profile): Promise<Profile> {
    const me = (await session())?.userId;
    return p.id === me || p.showBodyweight ? p : { ...p, bodyweight: null };
  }
  async function blockedIds(me: string) {
    return get<string[]>(K.blocks(me), []);
  }
  async function videos() {
    await ensureSeed();
    return get<DemoVideo[]>(K.videos, []);
  }

  /** Přátelé a zprávy ukázkových uživatelů – při prvním otevření se nasadí ukázková data. */
  async function friendRows(me: string): Promise<DemoFriend[]> {
    const raw = await AsyncStorage.getItem(K.friends(me));
    if (raw) return JSON.parse(raw);
    const seed: DemoFriend[] = [
      { other: 'demo-1', status: 'friends' },
      { other: 'demo-2', status: 'incoming' },
    ];
    await set(K.friends(me), seed);
    return seed;
  }
  async function messageRows(me: string): Promise<Message[]> {
    const raw = await AsyncStorage.getItem(K.messages(me));
    if (raw) return JSON.parse(raw);
    const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();
    const seed: Message[] = [
      {
        id: uuid(),
        senderId: 'demo-1',
        recipientId: me,
        body: 'Ahoj! Jdeš zítra na trénink do Barbell Clubu?',
        createdAt: ago(95),
        readAt: null,
      },
      {
        id: uuid(),
        senderId: 'demo-5',
        recipientId: me,
        body: 'Čau, viděl jsem tvoje video z výzvy – paráda! Nechceš si někdy zatrénovat spolu?',
        createdAt: ago(300),
        readAt: null,
      },
    ];
    await set(K.messages(me), seed);
    return seed;
  }

  async function addReport(kind: 'user' | 'message', targetUserId: string | null, messageId: string | null, reason: string) {
    const me = (await session())?.userId;
    if (!me) throw new Error('not signed in');
    const us = await users();
    const msg = messageId ? (await messageRows(me)).find((m) => m.id === messageId) : null;
    const target = targetUserId ?? msg?.senderId ?? null;
    const name = (id: string | null) => {
      const u = us.find((x) => x.id === id);
      return u ? `${u.firstName} ${u.lastName}`.trim() : '';
    };
    const r: ContentReport = {
      id: uuid(),
      kind,
      status: 'open',
      reason: reason || null,
      snapshot: msg?.body ?? null,
      resolution: null,
      createdAt: new Date().toISOString(),
      handledAt: null,
      reporterId: me,
      reporterName: name(me),
      targetUserId: target,
      targetName: name(target),
      targetBanned: false,
      messageId,
      videoId: null,
      videoUrl: null,
      videoHidden: null,
      sameTargetReports: 1,
    };
    await set(K.reports, [...(await get<ContentReport[]>(K.reports, [])), r]);
  }

  const backend: Backend = {
    mode: 'demo',

    getSession: session,
    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async signIn(email) {
      const s = { userId: `local-${normalize(email).replace(/[^a-z0-9]/g, '')}`, email };
      const us = await users();
      if (!us.find((u) => u.id === s.userId)) {
        await set(K.users, [...us, demoProfile({ id: s.userId, firstName: email.split('@')[0] })]);
      }
      await set(K.session, s);
      emit(s);
    },
    async signUp({ email, firstName, lastName, birthDate }) {
      const s = { userId: `local-${normalize(email).replace(/[^a-z0-9]/g, '')}`, email };
      const us = (await users()).filter((u) => u.id !== s.userId);
      await set(K.users, [...us, demoProfile({ id: s.userId, firstName, lastName, birthYear: Number(birthDate.slice(0, 4)) })]);
      await set(K.session, s);
      emit(s);
      return { needsConfirmation: false };
    },
    async signInDemo() {
      const s = { userId: 'local-demo', email: null };
      const us = await users();
      if (!us.find((u) => u.id === s.userId)) {
        await set(K.users, [
          ...us,
          demoProfile({
            id: s.userId,
            firstName: 'Demo',
            lastName: 'Vzpěrač',
            gender: 'M',
            clubId: 27,
            birthYear: 1998,
            ageGroup: 'SENIOR',
            weightCategory: '85',
            prSnatch: 110,
            prCleanJerk: 138,
            bodyweight: 82.5,
            motto: 'Zvedej!',
            // v ukázce si lze vyzkoušet i přehled nahlášení
            isAdmin: true,
          }),
        ]);
      }
      await set(K.session, s);
      emit(s);
    },
    async resetPassword() {},
    async signOut() {
      await AsyncStorage.removeItem(K.session);
      emit(null);
    },
    async deleteAccount() {
      const s = await session();
      if (s) {
        await set(
          K.users,
          (await users()).filter((u) => u.id !== s.userId),
        );
        await set(
          K.videos,
          (await videos()).filter((v) => v.userId !== s.userId),
        );
        await AsyncStorage.removeItem(K.training(s.userId));
      }
      await backend.signOut();
    },

    async getProfile(id) {
      const p = (await users()).find((u) => u.id === id);
      return p ? publicView(p) : null;
    },
    async updateProfile(id, patch) {
      const us = await users();
      const cur = us.find((u) => u.id === id) ?? demoProfile({ id });
      const next = { ...cur, ...patch, id };
      await set(K.users, [...us.filter((u) => u.id !== id), next]);
      return next;
    },
    async uploadAvatar(_userId, uri) {
      return uri;
    },
    async searchProfiles(q, clubId) {
      const nq = normalize(q.trim());
      return (await users())
        .filter((u) => u.isPublic && (u.firstName || u.lastName))
        .filter((u) => (clubId ? u.clubId === clubId : true))
        .filter((u) => !nq || normalize(`${u.firstName} ${u.lastName}`).includes(nq))
        .sort((a, b) => a.lastName.localeCompare(b.lastName, 'cs'))
        .map((u) => (u.showBodyweight ? u : { ...u, bodyweight: null }));
    },
    async clubMemberCounts() {
      const out: Record<number, number> = {};
      for (const u of await users()) if (u.clubId && u.isPublic) out[u.clubId] = (out[u.clubId] ?? 0) + 1;
      return out;
    },
    async userStats(userId) {
      const vs = await hydrate((await videos()).filter((v) => v.userId === userId));
      const wins = (await backend.listWinners()).filter((w) => w.author.id === userId).length;
      return { videos: vs.length, likes: vs.reduce((a, v) => a + v.likesCount, 0), wins };
    },

    async getTheme(month) {
      return fallbackTheme(month);
    },
    async listVideos(month, sort) {
      const list = await hydrate((await videos()).filter((v) => v.month === month));
      if (sort === 'new') list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      else if (sort === 'random') list.sort(() => Math.random() - 0.5);
      else list.sort((a, b) => b.likesCount - a.likesCount || a.createdAt.localeCompare(b.createdAt));
      return list;
    },
    async listUserVideos(userId) {
      const list = await hydrate((await videos()).filter((v) => v.userId === userId));
      return list.sort((a, b) => b.month.localeCompare(a.month));
    },
    async uploadVideo(userId, input) {
      const month = currentMonthKey();
      const all = await videos();
      if (all.some((v) => v.userId === userId && v.month === month)) throw new Error('ONE_PER_MONTH');
      input.onProgress?.(0.5);
      const v: DemoVideo = {
        id: uuid(),
        userId,
        month,
        videoUrl: input.uri,
        thumbnailUrl: input.thumbnailUri ?? null,
        caption: input.caption || null,
        baseLikes: 0,
        createdAt: new Date().toISOString(),
      };
      await set(K.videos, [...all, v]);
      input.onProgress?.(1);
      return (await hydrate([v]))[0];
    },
    async deleteVideo(video) {
      await set(
        K.videos,
        (await videos()).filter((v) => v.id !== video.id),
      );
    },
    async setLike(videoId, liked) {
      const s = await session();
      if (!s) return;
      const v = (await videos()).find((x) => x.id === videoId);
      if (!v || v.userId === s.userId || v.month !== currentMonthKey()) return;
      const lk = await likes();
      const cur = new Set(lk[videoId] ?? []);
      if (liked) cur.add(s.userId);
      else cur.delete(s.userId);
      lk[videoId] = [...cur];
      await set(K.likes, lk);
    },
    async reportVideo() {},
    async listWinners(): Promise<MonthlyWinner[]> {
      const cur = currentMonthKey();
      const all = await hydrate(await videos());
      const byMonth = new Map<string, ChallengeVideo[]>();
      for (const v of all) if (v.month < cur) byMonth.set(v.month, [...(byMonth.get(v.month) ?? []), v]);
      return [...byMonth.entries()]
        .map(([month, vs]) => {
          const w = vs.sort((a, b) => b.likesCount - a.likesCount || a.createdAt.localeCompare(b.createdAt))[0];
          return {
            month,
            videoId: w.id,
            likes: w.likesCount,
            author: w.author,
            videoUrl: w.videoUrl,
            thumbnailUrl: w.thumbnailUrl,
          };
        })
        .sort((a, b) => b.month.localeCompare(a.month));
    },

    async friendsOverview(): Promise<FriendsOverview> {
      const me = (await session())?.userId;
      if (!me) return { friends: [], incoming: [], outgoing: [] };
      const [list, us] = await Promise.all([friendRows(me), users()]);
      const pick = (s: DemoFriend['status']) =>
        list
          .filter((f) => f.status === s)
          .map((f) => us.find((u) => u.id === f.other))
          .filter(Boolean) as Profile[];
      return { friends: pick('friends'), incoming: pick('incoming'), outgoing: pick('outgoing') };
    },
    async friendStatus(userId): Promise<FriendStatus> {
      const me = (await session())?.userId;
      if (!me || me === userId) return 'none';
      const f = (await friendRows(me)).find((x) => x.other === userId);
      return f ? (f.status === 'friends' ? 'friends' : f.status) : 'none';
    },
    async sendFriendRequest(userId) {
      const me = (await session())?.userId;
      if (!me) return;
      const list = await friendRows(me);
      if (list.some((f) => f.other === userId)) return;
      await set(K.friends(me), [...list, { other: userId, status: 'outgoing' }]);
    },
    async respondFriendRequest(userId, accept) {
      const me = (await session())?.userId;
      if (!me) return;
      const list = await friendRows(me);
      await set(
        K.friends(me),
        accept
          ? list.map((f) => (f.other === userId ? { ...f, status: 'friends' as const } : f))
          : list.filter((f) => f.other !== userId),
      );
    },
    async removeFriend(userId) {
      const me = (await session())?.userId;
      if (!me) return;
      await set(
        K.friends(me),
        (await friendRows(me)).filter((f) => f.other !== userId),
      );
    },

    async listConversations(): Promise<Conversation[]> {
      const me = (await session())?.userId;
      if (!me) return [];
      const [msgs, us, fr] = await Promise.all([messageRows(me), users(), friendRows(me)]);
      const friendIds = new Set(fr.filter((f) => f.status === 'friends').map((f) => f.other));
      const byUser = new Map<string, Message[]>();
      for (const m of msgs) {
        const other = m.senderId === me ? m.recipientId : m.senderId;
        byUser.set(other, [...(byUser.get(other) ?? []), m]);
      }
      return [...byUser.entries()]
        .map(([id, list]) => {
          const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          const user = us.find((u) => u.id === id);
          if (!user) return null;
          return {
            user,
            last: sorted[0],
            unread: list.filter((m) => m.recipientId === me && !m.readAt).length,
            isRequest: !friendIds.has(id) && !list.some((m) => m.senderId === me),
          } as Conversation;
        })
        .filter(Boolean)
        .sort((a, b) => b!.last.createdAt.localeCompare(a!.last.createdAt)) as Conversation[];
    },
    async listMessages(userId) {
      const me = (await session())?.userId;
      if (!me) return [];
      return (await messageRows(me))
        .filter((m) => m.senderId === userId || m.recipientId === userId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async sendMessage(userId, body) {
      const me = (await session())?.userId;
      if (!me) throw new Error('not signed in');
      const [msgs, fr] = await Promise.all([messageRows(me), friendRows(me)]);
      const isFriend = fr.some((f) => f.other === userId && f.status === 'friends');
      const theyReplied = msgs.some((m) => m.senderId === userId);
      const sent = msgs.filter((m) => m.senderId === me && m.recipientId === userId).length;
      if ((await blockedIds(me)).includes(userId)) throw new Error('BLOCKED');
      if (!isFriend && !theyReplied && sent >= 3) throw new Error('MESSAGE_REQUEST_LIMIT');
      const m: Message = {
        id: uuid(),
        senderId: me,
        recipientId: userId,
        body: body.trim(),
        createdAt: new Date().toISOString(),
        readAt: null,
      };
      await set(K.messages(me), [...msgs, m]);
      return m;
    },
    async markRead(userId) {
      const me = (await session())?.userId;
      if (!me) return;
      const now = new Date().toISOString();
      await set(
        K.messages(me),
        (await messageRows(me)).map((m) => (m.senderId === userId && !m.readAt ? { ...m, readAt: now } : m)),
      );
    },
    async unreadCount() {
      const me = (await session())?.userId;
      if (!me) return 0;
      return (await messageRows(me)).filter((m) => m.recipientId === me && !m.readAt).length;
    },

    async blockUser(userId) {
      const me = (await session())?.userId;
      if (!me) throw new Error('not signed in');
      const ids = await blockedIds(me);
      if (!ids.includes(userId)) await set(K.blocks(me), [...ids, userId]);
      await set(
        K.friends(me),
        (await friendRows(me)).filter((f) => f.other !== userId),
      );
    },
    async unblockUser(userId) {
      const me = (await session())?.userId;
      if (!me) return;
      await set(
        K.blocks(me),
        (await blockedIds(me)).filter((id) => id !== userId),
      );
    },
    async listBlocked() {
      const me = (await session())?.userId;
      if (!me) return [];
      const ids = await blockedIds(me);
      return (await users()).filter((u) => ids.includes(u.id));
    },
    async isBlockedByMe(userId) {
      const me = (await session())?.userId;
      return !!me && (await blockedIds(me)).includes(userId);
    },
    async reportUser(userId, reason) {
      await addReport('user', userId, null, reason);
    },
    async reportMessage(messageId, reason) {
      await addReport('message', null, messageId, reason);
    },
    async listReports(status) {
      const all = await get<ContentReport[]>(K.reports, []);
      return (status === 'open' ? all.filter((r) => r.status === 'open') : all).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
    },
    async resolveReport(reportId, action, reason) {
      const all = await get<ContentReport[]>(K.reports, []);
      const r = all.find((x) => x.id === reportId);
      if (!r) return;
      const now = new Date().toISOString();
      await set(
        K.reports,
        all.map((x) =>
          x.id === reportId || (action === 'ban' && x.status === 'open' && x.targetUserId === r.targetUserId)
            ? {
                ...x,
                status: action === 'dismiss' ? 'dismissed' : 'actioned',
                resolution: reason || action,
                handledAt: now,
                targetBanned: action === 'ban' || x.targetBanned,
              }
            : x,
        ),
      );
    },
    async unbanUser() {},
    async listNotices() {
      const me = (await session())?.userId;
      return me ? get<ModerationNotice[]>(K.notices(me), []) : [];
    },
    async markNoticesSeen() {
      const me = (await session())?.userId;
      if (me) await AsyncStorage.removeItem(K.notices(me));
    },
    async exportMyData() {
      const s = await session();
      if (!s) throw new Error('not signed in');
      return {
        exported_at: new Date().toISOString(),
        mode: 'demo',
        account: { email: s.email },
        profile: (await users()).find((u) => u.id === s.userId) ?? null,
        training: await get<TrainingData | null>(K.training(s.userId), null),
        videos: (await videos()).filter((v) => v.userId === s.userId),
        friendships: await friendRows(s.userId),
        messages: await messageRows(s.userId),
        blocked_users: await blockedIds(s.userId),
      };
    },

    async loadTraining(userId) {
      return get<TrainingData | null>(K.training(userId), null);
    },
    async saveTraining(userId, data) {
      await set(K.training(userId), data);
    },

    async fetchFeed(kind) {
      return (await fetchFeedCached(kind)).items;
    },
  };
  return backend;
}
