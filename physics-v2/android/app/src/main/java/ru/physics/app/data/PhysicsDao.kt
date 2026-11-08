package ru.physics.app.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface PhysicsDao {
    @Query("SELECT * FROM local_profile WHERE id = 1 LIMIT 1")
    fun observeProfile(): Flow<ProfileEntity?>

    @Query("SELECT * FROM local_profile WHERE id = 1 LIMIT 1")
    suspend fun getProfile(): ProfileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveProfile(profile: ProfileEntity)

    @Query("SELECT COUNT(*) FROM lesson_progress")
    fun observeProgressCount(): Flow<Int>

    @Query("SELECT * FROM lesson_progress WHERE contentType = :type AND contentId = :id LIMIT 1")
    suspend fun getProgress(type: String, id: String): LessonProgressEntity?

    @Query("SELECT COUNT(*) FROM test_attempts")
    fun observeAttemptCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM mistakes WHERE correctedAt IS NULL")
    fun observeOpenMistakeCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM sync_operations WHERE status = 'pending'")
    fun observePendingSyncCount(): Flow<Int>

    @Query("SELECT * FROM sync_operations WHERE status = 'pending' ORDER BY createdAt ASC LIMIT :limit")
    suspend fun getPendingSyncOperations(limit: Int = 100): List<SyncOperationEntity>

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun enqueueSyncOperation(operation: SyncOperationEntity)

    @Query("UPDATE sync_operations SET status = 'synced', lastError = NULL WHERE id = :operationId")
    suspend fun markSyncOperationSynced(operationId: String)

    @Query("UPDATE sync_operations SET status = 'failed', attemptCount = attemptCount + 1, lastError = :error WHERE id = :operationId")
    suspend fun markSyncOperationFailed(operationId: String, error: String)

    @Query("UPDATE sync_operations SET status = 'pending', lastError = NULL WHERE status = 'failed'")
    suspend fun retryFailedSyncOperations()

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun appendAttempt(attempt: TestAttemptEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveProgress(progress: LessonProgressEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveFavorite(favorite: FavoriteEntity)

    @Query("DELETE FROM favorites WHERE contentType = :type AND contentId = :id")
    suspend fun removeFavorite(type: String, id: String)

    @Query("SELECT * FROM favorites ORDER BY createdAt DESC")
    fun observeFavorites(): Flow<List<FavoriteEntity>>

    @Query("SELECT * FROM favorites WHERE contentType = :type AND contentId = :id LIMIT 1")
    suspend fun getFavorite(type: String, id: String): FavoriteEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveCatalogCache(cache: CatalogCacheEntity)

    @Query("SELECT * FROM catalog_cache WHERE id = 1 LIMIT 1")
    suspend fun getCatalogCache(): CatalogCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveMistake(mistake: MistakeEntity)

    @Query("SELECT * FROM mistakes WHERE questionId = :questionId LIMIT 1")
    suspend fun getMistake(questionId: String): MistakeEntity?
}
