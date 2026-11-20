import type { ChallengeTheme, ChallengeVideo, FeedItem, MonthlyWinner, Profile, TrainingData } from '../types';

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

export interface Backend {
  mode: 'supabase' | 'demo';

  // auth
  getSession(): Promise<Session | null>;
  onAuthChange(cb: (s: Session | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, firstName: string, lastName: string): Promise<{ needsConfirmation: boolean }>;
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

  // ČSV
  fetchFeed(kind: 'calendar' | 'news'): Promise<FeedItem[]>;
}
