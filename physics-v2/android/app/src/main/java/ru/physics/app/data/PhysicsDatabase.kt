package ru.physics.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        ProfileEntity::class,
        LessonProgressEntity::class,
        TestAttemptEntity::class,
        FavoriteEntity::class,
        MistakeEntity::class,
        AppSettingEntity::class,
        CatalogCacheEntity::class,
        SyncOperationEntity::class,
    ],
    version = 4,
    exportSchema = true,
)
abstract class PhysicsDatabase : RoomDatabase() {
    abstract fun physicsDao(): PhysicsDao

    companion object {
        private val MIGRATION_1_2 = object : androidx.room.migration.Migration(1, 2) {
            override fun migrate(database: androidx.sqlite.db.SupportSQLiteDatabase) {
                database.execSQL(
                    "CREATE TABLE IF NOT EXISTS catalog_cache (id INTEGER NOT NULL PRIMARY KEY, payload TEXT NOT NULL, cachedAt INTEGER NOT NULL)",
                )
            }
        }

        private val MIGRATION_2_3 = object : androidx.room.migration.Migration(2, 3) {
            override fun migrate(database: androidx.sqlite.db.SupportSQLiteDatabase) {
                database.execSQL(
                    "ALTER TABLE local_profile ADD COLUMN educationTracks TEXT NOT NULL DEFAULT ''",
                )
                database.execSQL(
                    "ALTER TABLE local_profile ADD COLUMN gradeLevel TEXT",
                )
            }
        }

        private val MIGRATION_3_4 = object : androidx.room.migration.Migration(3, 4) {
            override fun migrate(database: androidx.sqlite.db.SupportSQLiteDatabase) {
                database.execSQL(
                    "CREATE TABLE IF NOT EXISTS sync_operations (id TEXT NOT NULL PRIMARY KEY, entityType TEXT NOT NULL, entityId TEXT NOT NULL, operation TEXT NOT NULL, payloadJson TEXT NOT NULL, createdAt INTEGER NOT NULL, status TEXT NOT NULL, attemptCount INTEGER NOT NULL, lastError TEXT)",
                )
                database.execSQL(
                    "CREATE INDEX IF NOT EXISTS index_sync_operations_status_createdAt ON sync_operations(status, createdAt)",
                )
            }
        }

        @Volatile
        private var instance: PhysicsDatabase? = null

        fun getInstance(context: Context): PhysicsDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    PhysicsDatabase::class.java,
                    "physics-local.db",
                ).addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4).build().also { instance = it }
            }
    }
}
