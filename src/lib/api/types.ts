import type {
  Country,
  ModerationAppeal,
  AssignedPlan,
  CoachGroup,
  MyCoach,
  TeamMember,
  TrainingPlan,
  TrainingVideo,
  WorkoutComment,
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
  /** host bez registrace (anonymní přihlášení) */
  isAnonymous?: boolean;
  /** host potvrdil e-mail, ale ještě si nenastavil heslo */
  needsPassword?: boolean;
}

export interface UpgradeInput {
  email: string;
  firstName: string;
  lastName: string;
  /** YYYY-MM-DD */
  birthDate: string;
  country: Country;
  termsVersion: string;
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
  country: Country;
  termsVersion: string;
}

export interface Backend {
  mode: 'supabase' | 'demo';

  // auth
  getSession(): Promise<Session | null>;
  onAuthChange(cb: (s: Session | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(input: SignUpInput): Promise<{ needsConfirmation: boolean }>;
  signInDemo?(): Promise<void>;
  /** vyzkoušet bez registrace */
  signInGuest(): Promise<void>;
  /** převod hosta na účet: uloží údaje a pošle potvrzovací e-mail; data zůstanou */
  upgradeGuest(input: UpgradeInput): Promise<{ needsConfirmation: boolean }>;
  /** nastaví heslo (po potvrzení e-mailu u převedeného hosta) */
  setPassword(password: string): Promise<void>;
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

  // trenér
  /** svěřenci a čekající pozvánky */
  coachTeam(): Promise<TeamMember[]>;
  inviteAthlete(athleteId: string): Promise<void>;
  /** zruší spojení (trenér i svěřenec) */
  removeCoachLink(coachId: string, athleteId: string): Promise<void>;
  /** celá tréninková data svěřence */
  athleteTraining(athleteId: string): Promise<TrainingData | null>;
  listGroups(): Promise<CoachGroup[]>;
  saveGroup(group: CoachGroup): Promise<CoachGroup>;
  deleteGroup(id: string): Promise<void>;
  /** pošle (nebo aktualizuje) plán svěřencům */
  assignPlan(plan: TrainingPlan, athleteIds: string[]): Promise<void>;
  /** komu je plán poslaný */
  planAssignees(sourcePlanId: string): Promise<string[]>;
  unassignPlan(sourcePlanId: string, athleteId: string): Promise<void>;
  /** aktualizuje už poslaný plán u všech svěřenců */
  updateAssignedPlan(plan: TrainingPlan): Promise<void>;
  // svěřenec
  myCoaches(): Promise<MyCoach[]>;
  acceptCoach(coachId: string, shareBodyweight: boolean): Promise<void>;
  setCoachShare(coachId: string, shareBodyweight: boolean): Promise<void>;
  /** profil trenéra pro připojení odkazem */
  getCoach(coachId: string): Promise<Profile | null>;
  myAssignedPlans(): Promise<AssignedPlan[]>;
  markAssignedPlansSeen(): Promise<void>;
  // komentáře a videa k tréninkům
  listComments(athleteId: string, logId: string): Promise<WorkoutComment[]>;
  addComment(athleteId: string, logId: string, body: string): Promise<WorkoutComment>;
  deleteComment(id: string): Promise<void>;
  markCommentsRead(athleteId: string, logId: string): Promise<void>;
  /** nepřečtené komentáře: klíč `${athleteId}:${logId}` → počet */
  unreadComments(): Promise<Record<string, number>>;
  listTrainingVideos(athleteId: string, logId: string): Promise<TrainingVideo[]>;
  uploadTrainingVideo(athleteId: string, logId: string, uri: string, mimeType: string): Promise<TrainingVideo>;
  deleteTrainingVideo(video: TrainingVideo): Promise<void>;

  // souhlas rodičů, podmínky, odvolání
  /** dítě požádá rodiče o souhlas: vrátí odkaz pro rodiče a zda šel e-mail */
  requestParentConsent(parentEmail: string): Promise<{ link: string; emailed: boolean }>;
  parentConsentInfo(token: string): Promise<{ childFirstName: string; birthYear: number | null; confirmed: boolean } | null>;
  confirmParentConsent(token: string, parentName: string, parentEmail: string): Promise<boolean>;
  acceptTerms(version: string): Promise<void>;
  fileAppeal(noticeId: string, body: string): Promise<void>;
  listAppeals(status: 'open' | 'all'): Promise<ModerationAppeal[]>;
  resolveAppeal(id: string, grant: boolean, decision: string): Promise<void>;

  // ČSV
  fetchFeed(kind: 'calendar' | 'news'): Promise<FeedItem[]>;
}
