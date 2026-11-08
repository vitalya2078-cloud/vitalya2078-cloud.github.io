export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    count?: number;
    version?: number;
  };
}

export interface ApiHealth {
  ok: boolean;
  service: string;
  database: string;
  timestamp: string;
}

export interface CatalogLesson {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  order: number;
  estimatedMinutes: number | null;
  contentVersion: number;
}

export interface CatalogTopic {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order: number;
  lessons: CatalogLesson[];
}

export interface CatalogSection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order: number;
  topics: CatalogTopic[];
}

export interface CatalogLevel {
  id: string;
  code: string;
  title: string;
  order: number;
  sections: CatalogSection[];
}

export interface CatalogVersion {
  id: string;
  code: string;
  title: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  levels: CatalogLevel[];
}

export interface CatalogProgram {
  id: string;
  code: string;
  name: string;
  description: string | null;
  educationTrack: string;
  versions: CatalogVersion[];
}

export interface LessonBlock {
  id: string;
  type: string;
  title: string | null;
  content: Record<string, unknown>;
  order: number;
  optional: boolean;
}

export interface LessonDocument {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  estimatedMinutes: number | null;
  contentVersion: number;
  topic: {
    id: string;
    slug: string;
    title: string;
  };
  blocks: LessonBlock[];
}

const DEFAULT_API_URL =
  "https://vqiljksvsdjmwbbngimg.supabase.co/functions/v1/physics-api";

const API_URL = (
  import.meta.env.VITE_PHYSICS_API_URL || DEFAULT_API_URL
).replace(/\/+$/, "");

async function request<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const apiError = payload?.error as ApiError | undefined;
    throw new Error(
      apiError?.message || `PHYSICS API request failed (${response.status})`,
    );
  }

  return payload as T;
}

export function getApiHealth(signal?: AbortSignal): Promise<ApiHealth> {
  return request<ApiHealth>("/health", signal);
}

export function getCatalog(
  signal?: AbortSignal,
): Promise<ApiResponse<CatalogProgram[]>> {
  return request<ApiResponse<CatalogProgram[]>>("/v1/catalog", signal);
}

export function getLesson(
  lessonId: string,
  signal?: AbortSignal,
): Promise<ApiResponse<LessonDocument>> {
  if (!/^[0-9a-fA-F-]{36}$/.test(lessonId)) {
    throw new Error("Invalid lesson ID.");
  }

  return request<ApiResponse<LessonDocument>>(
    `/v1/lessons/${lessonId}`,
    signal,
  );
}
