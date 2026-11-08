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

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveProfile(profile: ProfileEntity)

    @Query("SELECT COUNT(*) FROM lesson_progress")
    fun observeProgressCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM test_attempts")
    fun observeAttemptCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM mistakes WHERE correctedAt IS NULL")
    fun observeOpenMistakeCount(): Flow<Int>

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

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveCatalogCache(cache: CatalogCacheEntity)

    @Query("SELECT * FROM catalog_cache WHERE id = 1 LIMIT 1")
    suspend fun getCatalogCache(): CatalogCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveMistake(mistake: MistakeEntity)
}
