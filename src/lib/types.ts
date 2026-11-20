export type Region = 'cechy' | 'morava';

export interface Club {
  id: number;
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
  isPublic: boolean;
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

export interface FeedItem {
  id: string;
  title: string;
  link: string;
  /** ISO date (news: publish date; calendar: start date) */
  date: string | null;
  endDate?: string | null;
  place?: string | null;
  kind?: string | null;
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
  updatedAt: string;
}
