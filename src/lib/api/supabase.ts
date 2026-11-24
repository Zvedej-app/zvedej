import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';
import { currentMonthKey } from '../date';
import { fallbackTheme } from '../../data/themes';
import type {
  AssignedPlan,
  TrainingPlan,
  TrainingVideo,
  WorkoutComment,
  ChallengeTheme,
  ChallengeVideo,
  ContentReport,
  Conversation,
  FriendsOverview,
  FriendStatus,
  Message,
  MonthlyWinner,
  Profile,
  TrainingData,
} from '../types';
import type { Backend, Session, UploadVideoInput, VideoSort } from './types';
import { fetchFeedCached } from './feeds';

type Row = Record<string, any>;

const AUTHOR_COLS = 'id, first_name, last_name, avatar_url, club_id';

function mapProfile(r: Row): Profile {
  return {
    id: r.id,
    firstName: r.first_name ?? '',
    lastName: r.last_name ?? '',
    avatarUrl: r.avatar_url,
    motto: r.motto,
    clubId: r.club_id,
    gender: r.gender,
    birthYear: r.birth_year,
    ageGroup: r.age_group,
    weightCategory: r.weight_category,
    prSnatch: r.pr_snatch === null || r.pr_snatch === undefined ? null : Number(r.pr_snatch),
    prCleanJerk: r.pr_clean_jerk === null || r.pr_clean_jerk === undefined ? null : Number(r.pr_clean_jerk),
    bodyweight: r.bodyweight === null || r.bodyweight === undefined ? null : Number(r.bodyweight),
    showBodyweight: !!r.show_bodyweight,
    isPublic: r.is_public ?? true,
    isAdmin: !!r.is_admin,
    isCoach: !!r.is_coach,
    bannedAt: r.banned_at ?? null,
    banReason: r.ban_reason ?? null,
    createdAt: r.created_at,
  };
}

function profileToRow(p: Partial<Profile>): Row {
  const map: [keyof Profile, string][] = [
    ['firstName', 'first_name'],
    ['lastName', 'last_name'],
    ['avatarUrl', 'avatar_url'],
    ['motto', 'motto'],
    ['clubId', 'club_id'],
    ['gender', 'gender'],
    ['birthYear', 'birth_year'],
    ['ageGroup', 'age_group'],
    ['weightCategory', 'weight_category'],
    ['prSnatch', 'pr_snatch'],
    ['prCleanJerk', 'pr_clean_jerk'],
    ['showBodyweight', 'show_bodyweight'],
    ['isCoach', 'is_coach'],
    ['isPublic', 'is_public'],
  ];
  const out: Row = {};
  for (const [k, col] of map) if (k in p) out[col] = p[k];
  return out;
}

function mapReport(r: Row): ContentReport {
  return {
    id: r.id,
    kind: r.kind,
    status: r.status,
    reason: r.reason,
    snapshot: r.snapshot,
    resolution: r.resolution,
    createdAt: r.created_at,
    handledAt: r.handled_at,
    reporterId: r.reporter_id,
    reporterName: r.reporter_name ?? '',
    targetUserId: r.target_user_id,
    targetName: r.target_name ?? '',
    targetBanned: !!r.target_banned,
    messageId: r.message_id,
    videoId: r.video_id,
    videoUrl: r.video_url,
    videoHidden: r.video_hidden,
    sameTargetReports: Number(r.same_target_reports ?? 0),
  };
}

function mapAssigned(r: Row): AssignedPlan {
  return {
    id: r.id,
    coachId: r.coach_id,
    coachName: r.coach ? `${r.coach.first_name ?? ''} ${r.coach.last_name ?? ''}`.trim() : '',
    athleteId: r.athlete_id,
    sourcePlanId: r.source_plan_id,
    plan: r.plan as TrainingPlan,
    updatedAt: r.updated_at,
    seenAt: r.seen_at,
  };
}

function mapComment(r: Row): WorkoutComment {
  return {
    id: r.id,
    athleteId: r.athlete_id,
    logId: r.log_id,
    authorId: r.author_id,
    authorName: r.author ? `${r.author.first_name ?? ''} ${r.author.last_name ?? ''}`.trim() : '',
    authorAvatar: r.author?.avatar_url ?? null,
    body: r.body,
    createdAt: r.created_at,
    readAt: r.read_at,
  };
}

function mapAuthor(r: Row | null) {
  return {
    id: r?.id ?? '',
    firstName: r?.first_name ?? '',
    lastName: r?.last_name ?? '',
    avatarUrl: r?.avatar_url ?? null,
    clubId: r?.club_id ?? null,
  };
}

function mapMessage(r: Row): Message {
  return {
    id: r.id,
    senderId: r.sender_id,
    recipientId: r.recipient_id,
    body: r.body,
    createdAt: r.created_at,
    readAt: r.read_at,
  };
}

const monthDate = (key: string) => `${key}-01`;
const monthKey = (date: string) => date.slice(0, 7);

function mapVideo(r: Row, likedIds: Set<string>): ChallengeVideo {
  return {
    id: r.id,
    userId: r.user_id,
    month: monthKey(r.month),
    videoUrl: r.video_url,
    thumbnailUrl: r.thumbnail_url,
    caption: r.caption,
    likesCount: r.likes_count,
    likedByMe: likedIds.has(r.id),
    createdAt: r.created_at,
    author: mapAuthor(r.author),
  };
}

async function readAsArrayBuffer(uri: string) {
  const res = await fetch(uri);
  return await res.arrayBuffer();
}

function extFromMime(mime: string, fallback: string) {
  const m = mime.split('/')[1];
  if (!m) return fallback;
  if (m === 'quicktime') return 'mov';
  if (m === 'jpeg') return 'jpg';
  return m;
}

export function createSupabaseBackend(): Backend {
  const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });

  const toSession = (
    s: { user: { id: string; email?: string | null; is_anonymous?: boolean; user_metadata?: Record<string, unknown> } } | null,
  ): Session | null =>
    s
      ? {
          userId: s.user.id,
          email: s.user.email ?? null,
          isAnonymous: !!s.user.is_anonymous,
          needsPassword: !s.user.is_anonymous && s.user.user_metadata?.needs_password === true,
        }
      : null;

  async function myId() {
    const { data } = await sb.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async function likedSet(videoIds: string[]) {
    const me = await myId();
    if (!me || videoIds.length === 0) return new Set<string>();
    const { data } = await sb.from('video_likes').select('video_id').eq('user_id', me).in('video_id', videoIds);
    return new Set((data ?? []).map((r: Row) => r.video_id as string));
  }

  return {
    mode: 'supabase',

    async getSession() {
      const { data } = await sb.auth.getSession();
      return toSession(data.session);
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => cb(toSession(s)));
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    },
    async signUp({ email, password, firstName, lastName, birthDate, termsAcceptedAt }) {
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            birth_date: birthDate,
            terms_accepted_at: termsAcceptedAt,
          },
        },
      });
      if (error) throw error;
      return { needsConfirmation: !data.session };
    },
    async signInGuest() {
      const { error } = await sb.auth.signInAnonymously();
      if (error) throw error;
    },
    async upgradeGuest({ email, firstName, lastName, birthDate }) {
      const { error: e1 } = await sb.rpc('complete_registration', {
        p_first: firstName.trim(),
        p_last: lastName.trim(),
        p_birth: birthDate,
      });
      if (e1) throw e1;
      const redirect =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.origin + (window.location.pathname.startsWith('/zvedej') ? '/zvedej/' : '/')
          : undefined;
      const { error } = await sb.auth.updateUser(
        { email: email.trim(), data: { first_name: firstName.trim(), last_name: lastName.trim(), needs_password: true } },
        redirect ? { emailRedirectTo: redirect } : undefined,
      );
      if (error) throw error;
      return { needsConfirmation: true };
    },
    async setPassword(password) {
      const { error } = await sb.auth.updateUser({ password, data: { needs_password: false } });
      if (error) throw error;
      await sb.auth.refreshSession();
    },
    async resetPassword(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async deleteAccount() {
      const me = await myId();
      if (me) {
        for (const bucket of ['avatars', 'challenge-videos']) {
          const { data } = await sb.storage.from(bucket).list(me, { limit: 1000 });
          if (data?.length) await sb.storage.from(bucket).remove(data.map((f) => `${me}/${f.name}`));
        }
      }
      const { error } = await sb.rpc('delete_my_account');
      if (error) throw error;
      await sb.auth.signOut();
    },

    async getProfile(id) {
      const { data, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const p = mapProfile(data);
      // vlastní hmotnost je v soukromé tabulce (veřejná kopie jen se souhlasem)
      if (id === (await myId())) {
        const { data: priv } = await sb.from('profile_private').select('bodyweight').eq('user_id', id).maybeSingle();
        p.bodyweight = priv?.bodyweight === null || priv?.bodyweight === undefined ? null : Number(priv.bodyweight);
      }
      return p;
    },
    async updateProfile(id, patch) {
      if ('bodyweight' in patch) {
        const { error: e } = await sb.from('profile_private').upsert({ user_id: id, bodyweight: patch.bodyweight ?? null });
        if (e) throw e;
      }
      const { error } = await sb.from('profiles').upsert({ id, ...profileToRow(patch) });
      if (error) throw error;
      const p = await this.getProfile(id);
      if (!p) throw new Error('profile not found');
      return p;
    },
    async uploadAvatar(userId, uri, mimeType) {
      const body = await readAsArrayBuffer(uri);
      const path = `${userId}/avatar-${Date.now()}.${extFromMime(mimeType, 'jpg')}`;
      const { error } = await sb.storage.from('avatars').upload(path, body, { contentType: mimeType, upsert: true });
      if (error) throw error;
      return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    },
    async searchProfiles(q, clubId) {
      const { data, error } = await sb.rpc('search_profiles', { q: q || null, p_club: clubId ?? null, p_limit: 40 });
      if (error) throw error;
      return (data ?? []).map(mapProfile);
    },
    async clubMemberCounts() {
      const { data, error } = await sb.rpc('club_member_counts');
      if (error) throw error;
      const out: Record<number, number> = {};
      for (const r of data ?? []) out[r.club_id] = Number(r.members);
      return out;
    },
    async userStats(userId) {
      const { data, error } = await sb.rpc('user_stats', { p_user: userId });
      if (error) throw error;
      const r = (data ?? [])[0] ?? {};
      return { videos: Number(r.videos ?? 0), likes: Number(r.likes ?? 0), wins: Number(r.wins ?? 0) };
    },

    async getTheme(month): Promise<ChallengeTheme> {
      const { data } = await sb.from('monthly_challenges').select('*').eq('month', monthDate(month)).maybeSingle();
      if (!data) return fallbackTheme(month);
      return {
        month,
        title: { cs: data.title_cs, en: data.title_en || data.title_cs, sk: data.title_sk || data.title_cs },
        description: data.description_cs
          ? {
              cs: data.description_cs,
              en: data.description_en || data.description_cs,
              sk: data.description_sk || data.description_cs,
            }
          : undefined,
      };
    },
    async listVideos(month, sort: VideoSort) {
      let q = sb
        .from('challenge_videos')
        .select(`*, author:profiles!challenge_videos_user_id_fkey(${AUTHOR_COLS})`)
        .eq('month', monthDate(month))
        .eq('hidden', false)
        .limit(200);
      q =
        sort === 'new'
          ? q.order('created_at', { ascending: false })
          : q.order('likes_count', { ascending: false }).order('created_at');
      const { data, error } = await q;
      if (error) throw error;
      const liked = await likedSet((data ?? []).map((r: Row) => r.id));
      const list = (data ?? []).map((r: Row) => mapVideo(r, liked));
      if (sort === 'random') list.sort(() => Math.random() - 0.5);
      return list;
    },
    async listUserVideos(userId) {
      const { data, error } = await sb
        .from('challenge_videos')
        .select(`*, author:profiles!challenge_videos_user_id_fkey(${AUTHOR_COLS})`)
        .eq('user_id', userId)
        .order('month', { ascending: false });
      if (error) throw error;
      const liked = await likedSet((data ?? []).map((r: Row) => r.id));
      return (data ?? []).map((r: Row) => mapVideo(r, liked));
    },
    async uploadVideo(userId, input: UploadVideoInput) {
      const month = currentMonthKey();
      const ext = extFromMime(input.mimeType, 'mp4');
      const base = `${userId}/${month}-${Date.now()}`;
      input.onProgress?.(0.05);
      const body = await readAsArrayBuffer(input.uri);
      input.onProgress?.(0.2);
      const up = await sb.storage
        .from('challenge-videos')
        .upload(`${base}.${ext}`, body, { contentType: input.mimeType, upsert: false });
      if (up.error) throw up.error;
      input.onProgress?.(0.85);
      let thumbUrl: string | null = null;
      if (input.thumbnailUri) {
        try {
          const tb = await readAsArrayBuffer(input.thumbnailUri);
          const tu = await sb.storage.from('challenge-videos').upload(`${base}.jpg`, tb, { contentType: 'image/jpeg' });
          if (!tu.error) thumbUrl = sb.storage.from('challenge-videos').getPublicUrl(`${base}.jpg`).data.publicUrl;
        } catch {}
      }
      const videoUrl = sb.storage.from('challenge-videos').getPublicUrl(`${base}.${ext}`).data.publicUrl;
      const { data, error } = await sb
        .from('challenge_videos')
        .insert({
          user_id: userId,
          storage_path: `${base}.${ext}`,
          video_url: videoUrl,
          thumbnail_url: thumbUrl,
          caption: input.caption.trim() || null,
        })
        .select(`*, author:profiles!challenge_videos_user_id_fkey(${AUTHOR_COLS})`)
        .single();
      if (error) {
        await sb.storage.from('challenge-videos').remove([`${base}.${ext}`, `${base}.jpg`]);
        throw error;
      }
      input.onProgress?.(1);
      return mapVideo(data, new Set());
    },
    async deleteVideo(video) {
      const { data } = await sb.from('challenge_videos').select('storage_path').eq('id', video.id).maybeSingle();
      const { error } = await sb.from('challenge_videos').delete().eq('id', video.id);
      if (error) throw error;
      if (data?.storage_path) {
        const p = data.storage_path as string;
        await sb.storage.from('challenge-videos').remove([p, p.replace(/\.[^.]+$/, '.jpg')]);
      }
    },
    async setLike(videoId, liked) {
      const me = await myId();
      if (!me) throw new Error('not signed in');
      if (liked) {
        const { error } = await sb.from('video_likes').insert({ video_id: videoId, user_id: me });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await sb.from('video_likes').delete().eq('video_id', videoId).eq('user_id', me);
        if (error) throw error;
      }
    },
    async reportVideo(videoId, reason) {
      const me = await myId();
      if (!me) return;
      const { error } = await sb.from('video_reports').insert({ video_id: videoId, reporter_id: me, reason });
      if (error && error.code !== '23505') throw error;
    },
    async listWinners(): Promise<MonthlyWinner[]> {
      const { data, error } = await sb
        .from('monthly_winners')
        .select(
          `month, likes, video_id, video:challenge_videos!monthly_winners_video_id_fkey(video_url, thumbnail_url), author:profiles!monthly_winners_user_id_fkey(${AUTHOR_COLS})`,
        )
        .order('month', { ascending: false })
        .limit(36);
      if (error) throw error;
      return (data ?? []).map((r: Row) => ({
        month: monthKey(r.month),
        videoId: r.video_id,
        likes: r.likes,
        author: mapAuthor(r.author),
        videoUrl: r.video?.video_url ?? '',
        thumbnailUrl: r.video?.thumbnail_url ?? null,
      }));
    },

    async friendsOverview(): Promise<FriendsOverview> {
      const me = await myId();
      if (!me) return { friends: [], incoming: [], outgoing: [] };
      const { data, error } = await sb.from('friendships').select('*').or(`requester_id.eq.${me},addressee_id.eq.${me}`);
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      const ids = Array.from(new Set(rows.flatMap((r) => [r.requester_id, r.addressee_id]).filter((id: string) => id !== me)));
      const { data: ps } = ids.length ? await sb.from('profiles').select('*').in('id', ids) : { data: [] as Row[] };
      const byId = new Map((ps ?? []).map((p: Row) => [p.id as string, mapProfile(p)]));
      const out: FriendsOverview = { friends: [], incoming: [], outgoing: [] };
      for (const r of rows) {
        const other = byId.get(r.requester_id === me ? r.addressee_id : r.requester_id);
        if (!other) continue;
        if (r.status === 'accepted') out.friends.push(other);
        else if (r.addressee_id === me) out.incoming.push(other);
        else out.outgoing.push(other);
      }
      return out;
    },
    async friendStatus(userId): Promise<FriendStatus> {
      const me = await myId();
      if (!me || me === userId) return 'none';
      const { data } = await sb
        .from('friendships')
        .select('*')
        .or(`and(requester_id.eq.${me},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${me})`)
        .maybeSingle();
      if (!data) return 'none';
      if (data.status === 'accepted') return 'friends';
      return data.requester_id === me ? 'outgoing' : 'incoming';
    },
    async sendFriendRequest(userId) {
      const me = await myId();
      if (!me) throw new Error('not signed in');
      const { error } = await sb.from('friendships').insert({ requester_id: me, addressee_id: userId });
      if (error && error.code !== '23505') throw error;
    },
    async respondFriendRequest(userId, accept) {
      const me = await myId();
      if (!me) throw new Error('not signed in');
      const q = accept
        ? sb.from('friendships').update({ status: 'accepted' }).eq('requester_id', userId).eq('addressee_id', me)
        : sb.from('friendships').delete().eq('requester_id', userId).eq('addressee_id', me);
      const { error } = await q;
      if (error) throw error;
    },
    async removeFriend(userId) {
      const me = await myId();
      if (!me) return;
      const { error } = await sb
        .from('friendships')
        .delete()
        .or(`and(requester_id.eq.${me},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${me})`);
      if (error) throw error;
    },

    async listConversations(): Promise<Conversation[]> {
      const me = await myId();
      if (!me) return [];
      const { data, error } = await sb
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const msgs = (data ?? []).map(mapMessage);
      const byUser = new Map<string, Message[]>();
      for (const m of msgs) {
        const other = m.senderId === me ? m.recipientId : m.senderId;
        byUser.set(other, [...(byUser.get(other) ?? []), m]);
      }
      const ids = [...byUser.keys()];
      if (!ids.length) return [];
      const [{ data: ps }, overview] = await Promise.all([sb.from('profiles').select('*').in('id', ids), this.friendsOverview()]);
      const friendIds = new Set(overview.friends.map((f) => f.id));
      return (ps ?? [])
        .map((p: Row) => {
          const list = byUser.get(p.id)!;
          const iReplied = list.some((m) => m.senderId === me);
          return {
            user: mapProfile(p),
            last: list[0],
            unread: list.filter((m) => m.recipientId === me && !m.readAt).length,
            isRequest: !friendIds.has(p.id) && !iReplied,
          };
        })
        .sort((a, b) => b.last.createdAt.localeCompare(a.last.createdAt));
    },
    async listMessages(userId) {
      const me = await myId();
      if (!me) return [];
      const { data, error } = await sb
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${me},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${me})`)
        .order('created_at', { ascending: true })
        .limit(300);
      if (error) throw error;
      return (data ?? []).map(mapMessage);
    },
    async sendMessage(userId, body) {
      const me = await myId();
      if (!me) throw new Error('not signed in');
      const { data, error } = await sb
        .from('messages')
        .insert({ sender_id: me, recipient_id: userId, body: body.trim() })
        .select('*')
        .single();
      if (error) throw error;
      return mapMessage(data);
    },
    async markRead(userId) {
      const me = await myId();
      if (!me) return;
      await sb
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', userId)
        .eq('recipient_id', me)
        .is('read_at', null);
    },
    async unreadCount() {
      const me = await myId();
      if (!me) return 0;
      const { count } = await sb
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', me)
        .is('read_at', null);
      return count ?? 0;
    },

    async blockUser(userId) {
      const me = await myId();
      if (!me) throw new Error('not signed in');
      const { error } = await sb.from('user_blocks').insert({ blocker_id: me, blocked_id: userId });
      if (error && error.code !== '23505') throw error;
    },
    async unblockUser(userId) {
      const me = await myId();
      if (!me) return;
      const { error } = await sb.from('user_blocks').delete().eq('blocker_id', me).eq('blocked_id', userId);
      if (error) throw error;
    },
    async listBlocked() {
      const me = await myId();
      if (!me) return [];
      const { data, error } = await sb.from('user_blocks').select('blocked_id').eq('blocker_id', me);
      if (error) throw error;
      const ids = (data ?? []).map((r: Row) => r.blocked_id as string);
      if (!ids.length) return [];
      const { data: ps } = await sb.from('profiles').select('*').in('id', ids);
      return (ps ?? []).map(mapProfile);
    },
    async isBlockedByMe(userId) {
      const me = await myId();
      if (!me) return false;
      const { data } = await sb
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', me)
        .eq('blocked_id', userId)
        .maybeSingle();
      return !!data;
    },
    async reportUser(userId, reason) {
      const me = await myId();
      if (!me) throw new Error('not signed in');
      const { error } = await sb
        .from('content_reports')
        .insert({ reporter_id: me, kind: 'user', target_user_id: userId, reason });
      if (error) throw error;
    },
    async reportMessage(messageId, reason) {
      const me = await myId();
      if (!me) throw new Error('not signed in');
      const { error } = await sb
        .from('content_reports')
        .insert({ reporter_id: me, kind: 'message', message_id: messageId, reason });
      if (error) throw error;
    },
    async listReports(status) {
      const { data, error } = await sb.rpc('admin_list_reports', { p_status: status === 'open' ? 'open' : null });
      if (error) throw error;
      return (data ?? []).map(mapReport);
    },
    async resolveReport(reportId, action, reason) {
      const { error } = await sb.rpc('admin_resolve_report', { p_report: reportId, p_action: action, p_reason: reason || null });
      if (error) throw error;
    },
    async unbanUser(userId) {
      const { error } = await sb.rpc('admin_unban', { p_user: userId });
      if (error) throw error;
    },
    async listNotices() {
      const me = await myId();
      if (!me) return [];
      const { data, error } = await sb
        .from('moderation_notices')
        .select('*')
        .eq('user_id', me)
        .is('seen_at', null)
        .order('created_at', { ascending: true });
      if (error) return []; // starší databáze bez tabulky – neblokuj aplikaci
      return (data ?? []).map((r: Row) => ({ id: r.id, kind: r.kind, reason: r.reason, createdAt: r.created_at }));
    },
    async markNoticesSeen() {
      await sb.rpc('mark_notices_seen');
    },
    async exportMyData() {
      const { data, error } = await sb.rpc('export_my_data');
      if (error) throw error;
      return data;
    },

    async coachTeam() {
      const { data, error } = await sb.rpc('coach_team');
      if (error) throw error;
      return (data ?? []).map((r: Row) => ({
        profile: mapProfile(r.profile),
        status: r.status,
        shareBodyweight: !!r.share_bodyweight,
        createdAt: r.created_at,
        maxes: r.maxes ?? {},
        recentLogs: r.recent_logs ?? [],
      }));
    },
    async inviteAthlete(athleteId) {
      const me = await myId();
      if (!me) throw new Error('not signed in');
      const { error } = await sb.from('coach_links').insert({ coach_id: me, athlete_id: athleteId });
      if (error && error.code !== '23505') throw error;
    },
    async removeCoachLink(coachId, athleteId) {
      const { error } = await sb.from('coach_links').delete().eq('coach_id', coachId).eq('athlete_id', athleteId);
      if (error) throw error;
    },
    async athleteTraining(athleteId) {
      const { data, error } = await sb.rpc('coach_athlete_training', { p_athlete: athleteId });
      if (error) throw error;
      return (data as TrainingData) ?? null;
    },
    async listGroups() {
      const { data, error } = await sb
        .from('coach_groups')
        .select('id, name, members:coach_group_members(athlete_id)')
        .order('name');
      if (error) throw error;
      return (data ?? []).map((g: Row) => ({
        id: g.id,
        name: g.name,
        memberIds: (g.members ?? []).map((m: Row) => m.athlete_id),
      }));
    },
    async saveGroup(group) {
      const me = await myId();
      if (!me) throw new Error('not signed in');
      let id = group.id;
      if (id.startsWith('new')) {
        const { data, error } = await sb
          .from('coach_groups')
          .insert({ coach_id: me, name: group.name.trim() })
          .select('id')
          .single();
        if (error) throw error;
        id = data.id;
      } else {
        const { error } = await sb.from('coach_groups').update({ name: group.name.trim() }).eq('id', id);
        if (error) throw error;
        await sb.from('coach_group_members').delete().eq('group_id', id);
      }
      if (group.memberIds.length) {
        const { error } = await sb
          .from('coach_group_members')
          .insert(group.memberIds.map((a) => ({ group_id: id, athlete_id: a })));
        if (error) throw error;
      }
      return { ...group, id };
    },
    async deleteGroup(id) {
      const { error } = await sb.from('coach_groups').delete().eq('id', id);
      if (error) throw error;
    },
    async assignPlan(plan, athleteIds) {
      const me = await myId();
      if (!me || !athleteIds.length) return;
      const { error } = await sb.from('assigned_plans').upsert(
        athleteIds.map((a) => ({ coach_id: me, athlete_id: a, source_plan_id: plan.id, plan })),
        { onConflict: 'coach_id,athlete_id,source_plan_id' },
      );
      if (error) throw error;
    },
    async planAssignees(sourcePlanId) {
      const me = await myId();
      if (!me) return [];
      const { data } = await sb.from('assigned_plans').select('athlete_id').eq('coach_id', me).eq('source_plan_id', sourcePlanId);
      return (data ?? []).map((r: Row) => r.athlete_id as string);
    },
    async unassignPlan(sourcePlanId, athleteId) {
      const me = await myId();
      if (!me) return;
      const { error } = await sb
        .from('assigned_plans')
        .delete()
        .eq('coach_id', me)
        .eq('source_plan_id', sourcePlanId)
        .eq('athlete_id', athleteId);
      if (error) throw error;
    },
    async updateAssignedPlan(plan) {
      const me = await myId();
      if (!me) return;
      await sb.from('assigned_plans').update({ plan }).eq('coach_id', me).eq('source_plan_id', plan.id);
    },
    async myCoaches() {
      const { data, error } = await sb.rpc('my_coaches');
      if (error) return [];
      return (data ?? []).map((r: Row) => ({
        profile: mapProfile(r.profile),
        status: r.status,
        shareBodyweight: !!r.share_bodyweight,
        createdAt: r.created_at,
      }));
    },
    async acceptCoach(coachId, shareBodyweight) {
      const { error } = await sb.rpc('accept_coach', { p_coach: coachId, p_share_bodyweight: shareBodyweight });
      if (error) throw error;
    },
    async setCoachShare(coachId, shareBodyweight) {
      const { error } = await sb.rpc('set_coach_share', { p_coach: coachId, p_share_bodyweight: shareBodyweight });
      if (error) throw error;
    },
    async getCoach(coachId) {
      const { data } = await sb.from('profiles').select('*').eq('id', coachId).maybeSingle();
      return data && data.is_coach ? mapProfile(data) : null;
    },
    async myAssignedPlans() {
      const me = await myId();
      if (!me) return [];
      const { data, error } = await sb
        .from('assigned_plans')
        .select('*, coach:profiles!assigned_plans_coach_id_fkey(first_name, last_name)')
        .eq('athlete_id', me);
      if (error) return [];
      return (data ?? []).map(mapAssigned);
    },
    async markAssignedPlansSeen() {
      await sb.rpc('mark_assigned_plans_seen');
    },
    async listComments(athleteId, logId) {
      const { data, error } = await sb
        .from('workout_comments')
        .select('*, author:profiles!workout_comments_author_id_fkey(first_name, last_name, avatar_url)')
        .eq('athlete_id', athleteId)
        .eq('log_id', logId)
        .order('created_at');
      if (error) throw error;
      return (data ?? []).map(mapComment);
    },
    async addComment(athleteId, logId, body) {
      const me = await myId();
      if (!me) throw new Error('not signed in');
      const { data, error } = await sb
        .from('workout_comments')
        .insert({ athlete_id: athleteId, log_id: logId, author_id: me, body: body.trim() })
        .select('*, author:profiles!workout_comments_author_id_fkey(first_name, last_name, avatar_url)')
        .single();
      if (error) throw error;
      return mapComment(data);
    },
    async deleteComment(id) {
      const { error } = await sb.from('workout_comments').delete().eq('id', id);
      if (error) throw error;
    },
    async markCommentsRead(athleteId, logId) {
      await sb.rpc('mark_comments_read', { p_athlete: athleteId, p_log: logId });
    },
    async unreadComments() {
      const { data, error } = await sb.rpc('unread_comments');
      if (error) return {};
      const out: Record<string, number> = {};
      for (const r of data ?? []) out[`${r.athlete_id}:${r.log_id}`] = Number(r.unread);
      return out;
    },
    async listTrainingVideos(athleteId, logId) {
      const { data, error } = await sb
        .from('training_videos')
        .select('*')
        .eq('athlete_id', athleteId)
        .eq('log_id', logId)
        .order('created_at');
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      if (!rows.length) return [];
      const { data: signed } = await sb.storage.from('training-videos').createSignedUrls(
        rows.map((r) => r.storage_path),
        60 * 60,
      );
      return rows.map(
        (r, i): TrainingVideo => ({
          id: r.id,
          athleteId: r.athlete_id,
          logId: r.log_id,
          url: signed?.[i]?.signedUrl ?? '',
          caption: r.caption,
          createdAt: r.created_at,
        }),
      );
    },
    async uploadTrainingVideo(athleteId, logId, uri, mimeType) {
      const path = `${athleteId}/${logId}-${Date.now()}.${extFromMime(mimeType, 'mp4')}`;
      const body = await readAsArrayBuffer(uri);
      const up = await sb.storage.from('training-videos').upload(path, body, { contentType: mimeType });
      if (up.error) throw up.error;
      const { data, error } = await sb
        .from('training_videos')
        .insert({ athlete_id: athleteId, log_id: logId, storage_path: path })
        .select('*')
        .single();
      if (error) {
        await sb.storage.from('training-videos').remove([path]);
        throw error;
      }
      const { data: s1 } = await sb.storage.from('training-videos').createSignedUrl(path, 60 * 60);
      return { id: data.id, athleteId, logId, url: s1?.signedUrl ?? '', caption: null, createdAt: data.created_at };
    },
    async deleteTrainingVideo(video) {
      const { data } = await sb.from('training_videos').select('storage_path').eq('id', video.id).maybeSingle();
      const { error } = await sb.from('training_videos').delete().eq('id', video.id);
      if (error) throw error;
      if (data?.storage_path) await sb.storage.from('training-videos').remove([data.storage_path]);
    },

    async loadTraining(userId) {
      const { data, error } = await sb.from('user_training').select('data').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return (data?.data as TrainingData) ?? null;
    },
    async saveTraining(userId, data) {
      const { error } = await sb.from('user_training').upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
      if (error) throw error;
    },

    async fetchFeed(kind) {
      return (await fetchFeedCached(kind)).items;
    },
  };
}
