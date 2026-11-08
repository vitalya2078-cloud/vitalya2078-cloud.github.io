package ru.physics.app.data

import androidx.room.withTransaction
import org.json.JSONObject
import ru.physics.app.domain.ProgressSnapshot
import ru.physics.app.domain.mergeProgress
import java.util.UUID

class LocalActivityRepository(
    private val database: PhysicsDatabase,
) {
    private val dao = database.physicsDao()

    suspend fun saveProfile(profile: ProfileEntity) {
        database.withTransaction {
            val existing = dao.getProfile()
            dao.saveProfile(profile)
            enqueue(
                entityType = "profile",
                entityId = profile.id.toString(),
                operation = if (existing == null) "insert" else "update",
                payload = JSONObject()
                    .put("id", profile.id)
                    .put("nickname", profile.nickname)
                    .put("birthYear", profile.birthYear)
                    .put("educationTracks", profile.educationTracks)
                    .put("gradeLevel", profile.gradeLevel)
                    .put("updatedAt", profile.updatedAt),
            )
        }
    }

    suspend fun saveAttempt(attempt: TestAttemptEntity) {
        database.withTransaction {
            dao.appendAttempt(attempt)
            enqueue(
                entityType = "attempt",
                entityId = attempt.id,
                operation = "insert",
                payload = JSONObject()
                    .put("id", attempt.id)
                    .put("testId", attempt.testId)
                    .put("mode", attempt.mode)
                    .put("scorePercent", attempt.scorePercent)
                    .put("grade", attempt.grade)
                    .put("startedAt", attempt.startedAt)
                    .put("completedAt", attempt.completedAt)
                    .put("answersJson", attempt.answersJson),
            )
        }
    }

    suspend fun saveProgress(incoming: LessonProgressEntity) {
        database.withTransaction {
            val existing = dao.getProgress(incoming.contentType, incoming.contentId)
            val merged = mergeProgress(
                existing = existing?.toSnapshot(),
                incoming = incoming.toSnapshot(),
            )
            val normalized = incoming.copy(
                status = merged.status,
                completionPercent = merged.completionPercent,
                bestScore = merged.bestScore,
                bestGrade = merged.bestGrade,
                latestGrade = merged.latestGrade,
            )
            dao.saveProgress(normalized)

            enqueue(
                entityType = "progress",
                entityId = "${incoming.contentType}:${incoming.contentId}",
                operation = if (existing == null) "insert" else "update",
                payload = JSONObject()
                    .put("contentType", normalized.contentType)
                    .put("contentId", normalized.contentId)
                    .put("status", normalized.status)
                    .put("completionPercent", normalized.completionPercent)
                    .put("bestScore", normalized.bestScore)
                    .put("bestGrade", normalized.bestGrade)
                    .put("latestGrade", normalized.latestGrade)
                    .put("updatedAt", normalized.updatedAt),
            )
        }
    }

    suspend fun saveFavorite(favorite: FavoriteEntity): Boolean =
        database.withTransaction {
            if (dao.getFavorite(favorite.contentType, favorite.contentId) != null) {
                return@withTransaction false
            }

            dao.saveFavorite(favorite)
            enqueue(
                entityType = "favorite",
                entityId = "${favorite.contentType}:${favorite.contentId}",
                operation = "insert",
                payload = JSONObject()
                    .put("contentType", favorite.contentType)
                    .put("contentId", favorite.contentId)
                    .put("createdAt", favorite.createdAt),
            )
            true
        }

    suspend fun removeFavorite(contentType: String, contentId: String) {
        database.withTransaction {
            val existing = dao.getFavorite(contentType, contentId) ?: return@withTransaction
            dao.removeFavorite(contentType, contentId)

            enqueue(
                entityType = "favorite",
                entityId = "${existing.contentType}:${existing.contentId}",
                operation = "delete",
                payload = JSONObject()
                    .put("contentType", existing.contentType)
                    .put("contentId", existing.contentId)
                    .put("deletedAt", System.currentTimeMillis()),
            )
        }
    }

    suspend fun recordMistake(questionId: String) {
        database.withTransaction {
            val now = System.currentTimeMillis()
            val existing = dao.getMistake(questionId)
            val updated = MistakeEntity(
                questionId = questionId,
                errorCount = (existing?.errorCount ?: 0) + 1,
                firstSeenAt = existing?.firstSeenAt ?: now,
                lastSeenAt = now,
                correctedAt = null,
            )
            dao.saveMistake(updated)

            enqueue(
                entityType = "mistake",
                entityId = questionId,
                operation = if (existing == null) "insert" else "update",
                payload = JSONObject()
                    .put("questionId", updated.questionId)
                    .put("errorCount", updated.errorCount)
                    .put("firstSeenAt", updated.firstSeenAt)
                    .put("lastSeenAt", updated.lastSeenAt),
            )
        }
    }

    private suspend fun enqueue(
        entityType: String,
        entityId: String,
        operation: String,
        payload: JSONObject,
    ) {
        dao.enqueueSyncOperation(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                entityType = entityType,
                entityId = entityId,
                operation = operation,
                payloadJson = payload.toString(),
                createdAt = System.currentTimeMillis(),
                status = "pending",
                attemptCount = 0,
                lastError = null,
            ),
        )
    }

    private fun LessonProgressEntity.toSnapshot() = ProgressSnapshot(
        contentType = contentType,
        contentId = contentId,
        status = status,
        completionPercent = completionPercent,
        bestScore = bestScore,
        bestGrade = bestGrade,
        latestGrade = latestGrade,
    )
}
