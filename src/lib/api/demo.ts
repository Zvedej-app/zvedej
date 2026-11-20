import AsyncStorage from '@react-native-async-storage/async-storage';
import { currentMonthKey, prevMonthKey } from '../date';
import { uuid } from '../id';
import { fallbackTheme } from '../../data/themes';
import type { ChallengeVideo, MonthlyWinner, Profile, TrainingData } from '../types';
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

const listeners = new Set<(s: Session | null) => void>();
const emit = (s: Session | null) => listeners.forEach((l) => l(s));

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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
  async function videos() {
    await ensureSeed();
    return get<DemoVideo[]>(K.videos, []);
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
    async signUp(email, _pw, firstName, lastName) {
      const s = { userId: `local-${normalize(email).replace(/[^a-z0-9]/g, '')}`, email };
      const us = (await users()).filter((u) => u.id !== s.userId);
      await set(K.users, [...us, demoProfile({ id: s.userId, firstName, lastName })]);
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
      return (await users()).find((u) => u.id === id) ?? null;
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
        .sort((a, b) => a.lastName.localeCompare(b.lastName, 'cs'));
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
