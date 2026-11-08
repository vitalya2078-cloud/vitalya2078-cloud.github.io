import Dexie, { type EntityTable } from 'dexie';

export interface LocalProfile {
  id: string;
  nickname: string;
  birthYear?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocalProgress {
  id: string;
  entityType: 'section' | 'topic' | 'lesson' | 'lesson_block';
  entityId: string;
  status: 'not_started' | 'in_progress' | 'mastered';
  completionPercent: number;
  bestScore?: number;
  bestGrade?: number;
  latestGrade?: number;
  updatedAt: string;
}

export interface LocalAttempt {
  id: string;
  testId?: string;
  mode: 'training' | 'final' | 'exam' | 'diagnostic';
  status: 'in_progress' | 'completed' | 'abandoned';
  scorePercent?: number;
  grade?: number;
  startedAt: string;
  completedAt?: string;
  answers: Array<{
    questionId: string;
    selectedOptionIds: string[];
    isCorrect?: boolean;
  }>;
}

export interface LocalFavorite {
  id: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}

export interface LocalError {
  id: string;
  questionId: string;
  errorCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  correctedAt?: string;
}

export interface SyncOperation {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'insert' | 'update' | 'delete';
  payload: unknown;
  createdAt: string;
  status: 'pending' | 'synced' | 'failed';
  attempts?: number;
  lastError?: string;
}

export interface CachedCatalog {
  id: 'published';
  payload: unknown;
  cachedAt: string;
}

export interface CachedLesson {
  id: string;
  payload: unknown;
  cachedAt: string;
}

export interface LocalSetting {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface LocalSyncMetadata {
  key: string;
  value: unknown;
  updatedAt: string;
}

class PhysicsDatabase extends Dexie {
  profiles!: EntityTable<LocalProfile, 'id'>;
  progress!: EntityTable<LocalProgress, 'id'>;
  attempts!: EntityTable<LocalAttempt, 'id'>;
  favorites!: EntityTable<LocalFavorite, 'id'>;
  errors!: EntityTable<LocalError, 'id'>;
  syncQueue!: EntityTable<SyncOperation, 'id'>;
  catalogCache!: EntityTable<CachedCatalog, 'id'>;
  lessonCache!: EntityTable<CachedLesson, 'id'>;
  settings!: EntityTable<LocalSetting, 'key'>;
  syncMetadata!: EntityTable<LocalSyncMetadata, 'key'>;

  constructor() {
    super('physics-local');

    this.version(1).stores({
      profiles: 'id, nickname',
      progress: 'id, entityType, entityId, status, updatedAt, [entityType+entityId]',
      attempts: 'id, testId, mode, status, startedAt, completedAt',
      favorites: 'id, targetType, targetId, createdAt, [targetType+targetId]',
      errors: 'id, questionId, lastSeenAt',
      syncQueue: 'id, entityType, entityId, status, createdAt',
    });

    this.version(2).stores({
      profiles: 'id, nickname, updatedAt',
      progress: 'id, entityType, entityId, status, updatedAt, [entityType+entityId]',
      attempts: 'id, testId, mode, status, startedAt, completedAt',
      favorites: 'id, targetType, targetId, createdAt, [targetType+targetId]',
      errors: 'id, questionId, lastSeenAt',
      syncQueue: 'id, entityType, entityId, status, createdAt',
      catalogCache: 'id, cachedAt',
      lessonCache: 'id, cachedAt',
      settings: 'key, updatedAt',
      syncMetadata: 'key, updatedAt',
    });

    this.version(3).stores({
      profiles: 'id, nickname, updatedAt',
      progress: 'id, entityType, entityId, status, updatedAt, [entityType+entityId]',
      attempts: 'id, testId, mode, status, startedAt, completedAt',
      favorites: 'id, targetType, targetId, createdAt, [targetType+targetId]',
      errors: 'id, questionId, lastSeenAt',
      syncQueue: 'id, entityType, entityId, status, createdAt',
      catalogCache: 'id, cachedAt',
      lessonCache: 'id, cachedAt',
      settings: 'key, updatedAt',
      syncMetadata: 'key, updatedAt',
    });
  }
}

export const localDb = new PhysicsDatabase();

export function createLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  }

  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function queueOperation(
  entityType: string,
  entityId: string,
  operation: SyncOperation['operation'],
  payload: unknown,
): Promise<void> {
  await localDb.syncQueue.add({
    id: createLocalId(),
    entityType,
    entityId,
    operation,
    payload,
    createdAt: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
  });
}

export async function saveLocalProfile(profile: LocalProfile): Promise<void> {
  await localDb.transaction('rw', localDb.profiles, localDb.syncQueue, async () => {
    await localDb.profiles.put(profile);
    await queueOperation('profile', profile.id, 'update', profile);
  });
}

export async function saveLocalProgress(progress: LocalProgress): Promise<void> {
  await localDb.transaction('rw', localDb.progress, localDb.syncQueue, async () => {
    await localDb.progress.put(progress);
    await queueOperation('progress', progress.id, 'update', progress);
  });
}

export async function saveLocalAttempt(attempt: LocalAttempt): Promise<void> {
  await localDb.transaction('rw', localDb.attempts, localDb.syncQueue, async () => {
    await localDb.attempts.add(attempt);
    await queueOperation('attempt', attempt.id, 'insert', attempt);
  });
}

export async function saveLocalFavorite(favorite: LocalFavorite): Promise<void> {
  await localDb.transaction('rw', localDb.favorites, localDb.syncQueue, async () => {
    await localDb.favorites.put(favorite);
    await queueOperation('favorite', favorite.id, 'update', favorite);
  });
}

export async function removeLocalFavorite(favoriteId: string): Promise<void> {
  await localDb.transaction('rw', localDb.favorites, localDb.syncQueue, async () => {
    await localDb.favorites.delete(favoriteId);
    await queueOperation('favorite', favoriteId, 'delete', null);
  });
}

export async function cachePublishedCatalog(payload: unknown): Promise<void> {
  await localDb.catalogCache.put({
    id: 'published',
    payload,
    cachedAt: new Date().toISOString(),
  });
}

export async function readCachedCatalog(): Promise<CachedCatalog | undefined> {
  return localDb.catalogCache.get('published');
}

export async function cachePublishedLesson(
  lessonId: string,
  payload: unknown,
): Promise<void> {
  await localDb.lessonCache.put({
    id: lessonId,
    payload,
    cachedAt: new Date().toISOString(),
  });
}

export async function readCachedLesson(
  lessonId: string,
): Promise<CachedLesson | undefined> {
  return localDb.lessonCache.get(lessonId);
}

export async function saveLocalSetting(key: string, value: unknown): Promise<void> {
  await localDb.settings.put({
    key,
    value,
    updatedAt: new Date().toISOString(),
  });
}

export async function readLocalSetting<T>(key: string): Promise<T | undefined> {
  const setting = await localDb.settings.get(key);
  return setting?.value as T | undefined;
}

export async function getLocalStorageHealth(): Promise<{
  database: 'ready' | 'unavailable';
  profileCount: number;
  pendingSyncCount: number;
}> {
  try {
    await localDb.open();
    const [profileCount, pendingSyncCount] = await Promise.all([
      localDb.profiles.count(),
      localDb.syncQueue.where('status').equals('pending').count(),
    ]);

    return { database: 'ready', profileCount, pendingSyncCount };
  } catch {
    return { database: 'unavailable', profileCount: 0, pendingSyncCount: 0 };
  }
}
