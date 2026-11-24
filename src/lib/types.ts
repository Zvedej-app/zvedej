export type Region = 'cechy' | 'morava';

export interface Club {
  id: number;
  /** logo klubu (URL), pokud ho svaz uvádí */
  logo?: string | null;
  name: string;
  region: Region;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  web: string | null;
  facebook: string | null;
  instagram: string | null;
}

export type Gender = 'M' | 'F';

/** Věková skupina – děti do 15 let záměrně nejsou zahrnuty. */
export type AgeGroupId =
  | 'U17'
  | 'U20'
  | 'U23'
  | 'SENIOR'
  | 'M35'
  | 'M40'
  | 'M45'
  | 'M50'
  | 'M55'
  | 'M60'
  | 'M65'
  | 'M70'
  | 'M75'
  | 'M80'
  | 'M85';

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  motto: string | null;
  clubId: number | null;
  gender: Gender | null;
  birthYear: number | null;
  ageGroup: AgeGroupId | null;
  /** Např. "81" nebo "+109" */
  weightCategory: string | null;
  /** Osobní rekordy ze závodů v kg */
  prSnatch: number | null;
  prCleanJerk: number | null;
  /** Tělesná hmotnost pro výpočet Sinclaira (kg) */
  bodyweight: number | null;
  /** Hmotnost (a Sinclair) vidí i ostatní – výchozí ne */
  showBodyweight: boolean;
  isPublic: boolean;
  /** Trenér: má záložku Tým */
  isCoach?: boolean;
  /** Správce: vidí přehled nahlášení */
  isAdmin?: boolean;
  /** Účet zablokovaný moderátorem (nemůže psát ani nahrávat) */
  bannedAt?: string | null;
  banReason?: string | null;
  createdAt: string;
}

export type ReportKind = 'user' | 'message' | 'video';
export type ReportStatus = 'open' | 'dismissed' | 'actioned';
export type ModerationAction = 'dismiss' | 'remove' | 'ban';

export interface ContentReport {
  id: string;
  kind: ReportKind;
  status: ReportStatus;
  reason: string | null;
  snapshot: string | null;
  resolution: string | null;
  createdAt: string;
  handledAt: string | null;
  reporterId: string | null;
  reporterName: string;
  targetUserId: string | null;
  targetName: string;
  targetBanned: boolean;
  messageId: string | null;
  videoId: string | null;
  videoUrl: string | null;
  videoHidden: boolean | null;
  /** Počet otevřených nahlášení stejného uživatele */
  sameTargetReports: number;
}

export interface ModerationNotice {
  id: string;
  kind: 'content_removed' | 'banned' | 'unbanned';
  reason: string | null;
  createdAt: string;
}

export interface ChallengeTheme {
  /** YYYY-MM */
  month: string;
  title: Record<'cs' | 'en' | 'sk', string>;
  description?: Record<'cs' | 'en' | 'sk', string>;
}

export interface ChallengeVideo {
  id: string;
  userId: string;
  month: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  likesCount: number;
  likedByMe: boolean;
  createdAt: string;
  author: Pick<Profile, 'id' | 'firstName' | 'lastName' | 'avatarUrl' | 'clubId'>;
}

export interface MonthlyWinner {
  month: string;
  videoId: string;
  likes: number;
  author: Pick<Profile, 'id' | 'firstName' | 'lastName' | 'avatarUrl' | 'clubId'>;
  videoUrl: string;
  thumbnailUrl: string | null;
}

export type EventCategory = 'mcr' | 'liga' | 'other';

export interface ResultItem {
  id: string;
  title: string;
  link: string;
  /** ISO čas poslední aktualizace */
  updated: string | null;
}

export interface FeedItem {
  id: string;
  title: string;
  link: string;
  /** ISO date (news: publish date; calendar: start date) */
  date: string | null;
  endDate?: string | null;
  place?: string | null;
  kind?: string | null;
  /** MČR / liga / ostatní – podle toho se barevně odlišují karty */
  category?: EventCategory;
  excerpt?: string | null;
  image?: string | null;
  attachments?: { title: string; url: string }[];
}

/* ------------------------------ Tréninky ------------------------------ */

export type LoadSpec =
  | { type: 'percent'; value: number; of: string }
  | { type: 'kg'; value: number }
  | { type: 'rpe'; value: number }
  | { type: 'none' };

export interface SetScheme {
  id: string;
  sets: number;
  reps: number;
  load: LoadSpec;
}

export interface PlanExercise {
  id: string;
  exerciseId: string;
  /** vlastní název (pro vlastní cviky) */
  customName?: string;
  schemes: SetScheme[];
  restSec?: number;
  note?: string;
}

export interface PlanDay {
  id: string;
  name: string;
  /** 0 = pondělí … 6 = neděle */
  weekdays: number[];
  /** true = název se řídí dnem v týdnu (Pondělí, Čtvrtek …) a mění se podle dne, kdy trénink otevřeš */
  nameAuto?: boolean;
  exercises: PlanExercise[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  /** YYYY-MM-DD */
  startDate: string;
  endDate: string | null;
  status: 'active' | 'archived' | 'draft';
  days: PlanDay[];
  note?: string;
  /** Plánovaná délka bloku v týdnech (volitelné) */
  weeks?: number | null;
  /** Automatická progrese procent za týden (např. 2.5) */
  weeklyIncrementPct?: number;
  /** Plán poslal trenér – svěřenec ho nemůže upravovat */
  fromCoach?: { coachId: string; coachName: string; assignmentId: string };
  createdAt: string;
  updatedAt: string;
}

export interface LoggedSet {
  reps: number;
  kg: number;
  done: boolean;
}

export interface LoggedExercise {
  id: string;
  exerciseId: string;
  customName?: string;
  sets: LoggedSet[];
  note?: string;
}

export interface WorkoutLog {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  planId: string | null;
  dayId: string | null;
  title: string;
  exercises: LoggedExercise[];
  notes?: string;
  /** Subjektivní náročnost 1–10 */
  rpe?: number | null;
  /** Rychlá reakce na trénink (klíč: easy | ok | hard | bad) */
  feeling?: 'easy' | 'ok' | 'hard' | 'bad' | null;
  bodyweight?: number | null;
  durationMin?: number | null;
  createdAt: string;
}

export interface TrainingData {
  version: 1;
  plans: TrainingPlan[];
  logs: WorkoutLog[];
  /** tréninková maxima v kg dle exerciseId */
  maxes: Record<string, number>;
  customExercises: { id: string; name: string }[];
  /** cviky přidané uživatelem do sekce „Moje maxima“ (i bez zadané hodnoty) */
  maxLifts?: string[];
  /** historie zapsaných maxim (pro graf vývoje) */
  maxHistory?: { exerciseId: string; kg: number; date: string }[];
  updatedAt: string;
}

/* ------------------------------ Přátelé a zprávy ------------------------------ */

export type FriendStatus = 'none' | 'friends' | 'outgoing' | 'incoming';

export interface FriendsOverview {
  friends: Profile[];
  /** žádosti, které čekají na moje přijetí */
  incoming: Profile[];
  /** žádosti, které jsem poslal já */
  outgoing: Profile[];
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface Conversation {
  user: Profile;
  last: Message;
  unread: number;
  /** zpráva od někoho, kdo není přítel, a ještě jsem neodpověděl */
  isRequest: boolean;
}

/* ------------------------------ Trenér ------------------------------ */

export type CoachLinkStatus = 'pending' | 'accepted';

/** Svěřenec v týmu trenéra */
export interface TeamMember {
  profile: Profile;
  status: CoachLinkStatus;
  shareBodyweight: boolean;
  createdAt: string;
  maxes: Record<string, number>;
  /** tréninky za posledních ~60 dní */
  recentLogs: WorkoutLog[];
}

/** Trenér z pohledu svěřence */
export interface MyCoach {
  profile: Profile;
  status: CoachLinkStatus;
  shareBodyweight: boolean;
  createdAt: string;
}

export interface CoachGroup {
  id: string;
  name: string;
  memberIds: string[];
}

export interface AssignedPlan {
  id: string;
  coachId: string;
  coachName: string;
  athleteId: string;
  sourcePlanId: string;
  plan: TrainingPlan;
  updatedAt: string;
  seenAt: string | null;
}

export interface WorkoutComment {
  id: string;
  athleteId: string;
  logId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface TrainingVideo {
  id: string;
  athleteId: string;
  logId: string;
  url: string;
  caption: string | null;
  createdAt: string;
}
