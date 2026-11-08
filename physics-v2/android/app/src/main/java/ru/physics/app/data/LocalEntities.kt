package ru.physics.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "local_profile")
data class ProfileEntity(
    @PrimaryKey val id: Int = 1,
    val nickname: String,
    val birthYear: Int?,
    val updatedAt: Long,
)

@Entity(
    tableName = "lesson_progress",
    primaryKeys = ["contentType", "contentId"],
)
data class LessonProgressEntity(
    val contentType: String,
    val contentId: String,
    val status: String,
    val completionPercent: Int,
    val bestScore: Int?,
    val latestGrade: Int?,
    val updatedAt: Long,
)

@Entity(tableName = "test_attempts")
data class TestAttemptEntity(
    @PrimaryKey val id: String,
    val testId: String?,
    val mode: String,
    val scorePercent: Int?,
    val grade: Int?,
    val startedAt: Long,
    val completedAt: Long?,
    val answersJson: String,
)

@Entity(tableName = "favorites", primaryKeys = ["contentType", "contentId"])
data class FavoriteEntity(
    val contentType: String,
    val contentId: String,
    val createdAt: Long,
)

@Entity(tableName = "mistakes", primaryKeys = ["questionId"])
data class MistakeEntity(
    val questionId: String,
    val errorCount: Int,
    val firstSeenAt: Long,
    val lastSeenAt: Long,
    val correctedAt: Long?,
)

@Entity(tableName = "app_settings")
data class AppSettingEntity(
    @PrimaryKey val key: String,
    val value: String,
    val updatedAt: Long,
)

@Entity(tableName = "catalog_cache")
data class CatalogCacheEntity(
    @PrimaryKey val id: Int = 1,
    val payload: String,
    val cachedAt: Long,
)
