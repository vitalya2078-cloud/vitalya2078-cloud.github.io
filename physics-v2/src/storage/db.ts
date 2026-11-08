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
}

class PhysicsDatabase extends Dexie {
  profiles!: EntityTable<LocalProfile, 'id'>;
  progress!: EntityTable<LocalProgress, 'id'>;
  attempts!: EntityTable<LocalAttempt, 'id'>;
  favorites!: EntityTable<LocalFavorite, 'id'>;
  errors!: EntityTable<LocalError, 'id'>;
  syncQueue!: EntityTable<SyncOperation, 'id'>;

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
  }
}

export const localDb = new PhysicsDatabase();

export async function saveLocalAttempt(attempt: LocalAttempt): Promise<void> {
  await localDb.transaction('rw', localDb.attempts, localDb.syncQueue, async () => {
    await localDb.attempts.put(attempt);
    await localDb.syncQueue.put({
      id: crypto.randomUUID(),
      entityType: 'attempt',
      entityId: attempt.id,
      operation: 'insert',
      payload: attempt,
      createdAt: new Date().toISOString(),
      status: 'pending',
    });
  });
}