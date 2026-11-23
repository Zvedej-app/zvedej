import type {
  ChallengeTheme,
  ChallengeVideo,
  ContentReport,
  Conversation,
  FeedItem,
  FriendsOverview,
  FriendStatus,
  Message,
  ModerationAction,
  ModerationNotice,
  MonthlyWinner,
  Profile,
  TrainingData,
} from '../types';

export interface Session {
  userId: string;
  email: string | null;
}

export type VideoSort = 'top' | 'new' | 'random';

export interface UploadVideoInput {
  uri: string;
  mimeType: string;
  caption: string;
  thumbnailUri?: string | null;
  onProgress?: (p: number) => void;
}

export interface UserStats {
  videos: number;
  likes: number;
  wins: number;
}

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** YYYY-MM-DD */
  birthDate: string;
  /** ISO čas souhlasu s podmínkami a zásadami */
  termsAcceptedAt: string;
}

export interface Backend {
  mode: 'supabase' | 'demo';

  // auth
  getSession(): Promise<Session | null>;
  onAuthChange(cb: (s: Session | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(input: SignUpInput): Promise<{ needsConfirmation: boolean }>;
  signInDemo?(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;

  // profily
  getProfile(id: string): Promise<Profile | null>;
  updateProfile(id: string, patch: Partial<Profile>): Promise<Profile>;
  uploadAvatar(userId: string, uri: string, mimeType: string): Promise<string>;
  searchProfiles(q: string, clubId?: number | null): Promise<Profile[]>;
  clubMemberCounts(): Promise<Record<number, number>>;
  userStats(userId: string): Promise<UserStats>;

  // výzva
  getTheme(month: string): Promise<ChallengeTheme>;
  listVideos(month: string, sort: VideoSort): Promise<ChallengeVideo[]>;
  listUserVideos(userId: string): Promise<ChallengeVideo[]>;
  uploadVideo(userId: string, input: UploadVideoInput): Promise<ChallengeVideo>;
  deleteVideo(video: ChallengeVideo): Promise<void>;
  setLike(videoId: string, liked: boolean): Promise<void>;
  reportVideo(videoId: string, reason: string): Promise<void>;
  listWinners(): Promise<MonthlyWinner[]>;

  // tréninky
  loadTraining(userId: string): Promise<TrainingData | null>;
  saveTraining(userId: string, data: TrainingData): Promise<void>;

  // přátelé
  friendsOverview(): Promise<FriendsOverview>;
  friendStatus(userId: string): Promise<FriendStatus>;
  sendFriendRequest(userId: string): Promise<void>;
  respondFriendRequest(userId: string, accept: boolean): Promise<void>;
  removeFriend(userId: string): Promise<void>;

  // zprávy
  listConversations(): Promise<Conversation[]>;
  listMessages(userId: string): Promise<Message[]>;
  sendMessage(userId: string, body: string): Promise<Message>;
  markRead(userId: string): Promise<void>;
  unreadCount(): Promise<number>;

  // bezpečnost a moderace
  blockUser(userId: string): Promise<void>;
  unblockUser(userId: string): Promise<void>;
  listBlocked(): Promise<Profile[]>;
  /** Je mezi mnou a uživatelem blokace (v libovolném směru)? Zjistíme jen tu moji. */
  isBlockedByMe(userId: string): Promise<boolean>;
  reportUser(userId: string, reason: string): Promise<void>;
  reportMessage(messageId: string, reason: string): Promise<void>;
  listReports(status: 'open' | 'all'): Promise<ContentReport[]>;
  resolveReport(reportId: string, action: ModerationAction, reason: string): Promise<void>;
  unbanUser(userId: string): Promise<void>;
  listNotices(): Promise<ModerationNotice[]>;
  markNoticesSeen(): Promise<void>;
  /** Všechna moje data jako JSON (GDPR) */
  exportMyData(): Promise<unknown>;

  // ČSV
  fetchFeed(kind: 'calendar' | 'news'): Promise<FeedItem[]>;
}
