import { HAS_BACKEND } from '../config';
import { createDemoBackend } from './demo';
import { createSupabaseBackend } from './supabase';
import type { Backend } from './types';

export const api: Backend = HAS_BACKEND ? createSupabaseBackend() : createDemoBackend();
export type { Backend, Session, VideoSort, UserStats } from './types';
