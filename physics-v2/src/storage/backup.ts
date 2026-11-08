import {
  localDb,
  type CachedCatalog,
  type CachedLesson,
  type LocalAttempt,
  type LocalError,
  type LocalFavorite,
  type LocalProfile,
  type LocalProgress,
  type LocalSetting,
  type LocalSyncMetadata,
  type SyncOperation,
} from './db';

const BACKUP_FORMAT = 'physics-local-backup';
const BACKUP_VERSION = 2;
const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

export interface PhysicsBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: {
    profiles: LocalProfile[];
    progress: LocalProgress[];
    attempts: LocalAttempt[];
    favorites: LocalFavorite[];
    errors: LocalError[];
    syncQueue: SyncOperation[];
    catalogCache: CachedCatalog[];
    lessonCache: CachedLesson[];
    settings: LocalSetting[];
    syncMetadata: LocalSyncMetadata[];
  };
}

export async function createLocalBackup(): Promise<Blob> {
  await localDb.open();

  const [
    profiles,
    progress,
    attempts,
    favorites,
    errors,
    syncQueue,
    catalogCache,
    lessonCache,
    settings,
    syncMetadata,
  ] = await Promise.all([
    localDb.profiles.toArray(),
    localDb.progress.toArray(),
    localDb.attempts.toArray(),
    localDb.favorites.toArray(),
    localDb.errors.toArray(),
    localDb.syncQueue.toArray(),
    localDb.catalogCache.toArray(),
    localDb.lessonCache.toArray(),
    localDb.settings.toArray(),
    localDb.syncMetadata.toArray(),
  ]);

  const backup: PhysicsBackup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      profiles,
      progress,
      attempts,
      favorites,
      errors,
      syncQueue,
      catalogCache,
      lessonCache,
      settings,
      syncMetadata,
    },
  };

  return new Blob([JSON.stringify(backup)], {
    type: 'application/json;charset=utf-8',
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecords<T>(
  data: Record<string, unknown>,
  tableName: string,
  keyName: string,
): T[] {
  const value = data[tableName];

  if (!Array.isArray(value)) {
    throw new Error(`Backup is missing the "${tableName}" collection.`);
  }

  for (const item of value) {
    if (!isRecord(item) || typeof item[keyName] !== 'string') {
      throw new Error(`Backup contains an invalid record in "${tableName}".`);
    }
  }

  return value as T[];
}

function recordTimestamp(value: unknown): number {
  if (!isRecord(value)) return 0;

  const timestamp =
    value.updatedAt ??
    value.cachedAt ??
    value.lastSeenAt ??
    value.createdAt ??
    value.exportedAt;

  if (typeof timestamp !== 'string') return 0;

  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergeByKey<T>(
  existing: T[],
  incoming: T[],
  keyName: keyof T,
  keepNewest: boolean,
): T[] {
  const records = new Map<unknown, T>();

  for (const item of existing) {
    records.set(item[keyName], item);
  }

  for (const item of incoming) {
    const key = item[keyName];
    const current = records.get(key);

    if (
      !current ||
      (keepNewest && recordTimestamp(item) > recordTimestamp(current))
    ) {
      records.set(key, item);
    }
  }

  return [...records.values()];
}

export async function restoreLocalBackup(file: File): Promise<{
  imported: number;
  preservedAttempts: number;
}> {
  if (file.size > MAX_BACKUP_BYTES) {
    throw new Error('Backup file is too large (maximum 25 MB).');
  }

  const parsed: unknown = JSON.parse(await file.text());

  if (
    !isRecord(parsed) ||
    parsed.format !== BACKUP_FORMAT ||
    parsed.version !== BACKUP_VERSION ||
    !isRecord(parsed.data)
  ) {
    throw new Error('Unsupported or invalid PHYSICS backup file.');
  }

  const data = parsed.data;
  const profiles = readRecords<LocalProfile>(data, 'profiles', 'id');
  const progress = readRecords<LocalProgress>(data, 'progress', 'id');
  const attempts = readRecords<LocalAttempt>(data, 'attempts', 'id');
  const favorites = readRecords<LocalFavorite>(data, 'favorites', 'id');
  const errors = readRecords<LocalError>(data, 'errors', 'id');
  const syncQueue = readRecords<SyncOperation>(data, 'syncQueue', 'id');
  const catalogCache = readRecords<CachedCatalog>(data, 'catalogCache', 'id');
  const lessonCache = readRecords<CachedLesson>(data, 'lessonCache', 'id');
  const settings = readRecords<LocalSetting>(data, 'settings', 'key');
  const syncMetadata = readRecords<LocalSyncMetadata>(
    data,
    'syncMetadata',
    'key',
  );

  await localDb.open();

  let importedAttempts = 0;
  let preservedAttempts = 0;

  await localDb.transaction(
    'rw',
    [
      localDb.profiles,
      localDb.progress,
      localDb.attempts,
      localDb.favorites,
      localDb.errors,
      localDb.syncQueue,
      localDb.catalogCache,
      localDb.lessonCache,
      localDb.settings,
      localDb.syncMetadata,
    ],
    async () => {
      const [
        currentProfiles,
        currentProgress,
        currentAttempts,
        currentFavorites,
        currentErrors,
        currentQueue,
        currentCatalog,
        currentLessons,
        currentSettings,
        currentMetadata,
      ] = await Promise.all([
        localDb.profiles.toArray(),
        localDb.progress.toArray(),
        localDb.attempts.toArray(),
        localDb.favorites.toArray(),
        localDb.errors.toArray(),
        localDb.syncQueue.toArray(),
        localDb.catalogCache.toArray(),
        localDb.lessonCache.toArray(),
        localDb.settings.toArray(),
        localDb.syncMetadata.toArray(),
      ]);

      const mergedAttempts = mergeByKey(
        currentAttempts,
        attempts,
        'id',
        false,
      );
      importedAttempts = mergedAttempts.length - currentAttempts.length;
      preservedAttempts = currentAttempts.length;

      await Promise.all([
        localDb.profiles.bulkPut(mergeByKey(currentProfiles, profiles, 'id', true)),
        localDb.progress.bulkPut(mergeByKey(currentProgress, progress, 'id', true)),
        localDb.attempts.bulkPut(mergedAttempts),
        localDb.favorites.bulkPut(mergeByKey(currentFavorites, favorites, 'id', true)),
        localDb.errors.bulkPut(mergeByKey(currentErrors, errors, 'id', true)),
        localDb.syncQueue.bulkPut(mergeByKey(currentQueue, syncQueue, 'id', false)),
        localDb.catalogCache.bulkPut(mergeByKey(currentCatalog, catalogCache, 'id', true)),
        localDb.lessonCache.bulkPut(mergeByKey(currentLessons, lessonCache, 'id', true)),
        localDb.settings.bulkPut(mergeByKey(currentSettings, settings, 'key', true)),
        localDb.syncMetadata.bulkPut(mergeByKey(currentMetadata, syncMetadata, 'key', true)),
      ]);
    },
  );

  return {
    imported:
      profiles.length +
      progress.length +
      importedAttempts +
      favorites.length +
      errors.length +
      syncQueue.length +
      catalogCache.length +
      lessonCache.length +
      settings.length +
      syncMetadata.length,
    preservedAttempts,
  };
}

export function downloadLocalBackup(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);

  anchor.href = url;
  anchor.download = `physics-backup-${date}.json`;
  anchor.click();

  URL.revokeObjectURL(url);
}
