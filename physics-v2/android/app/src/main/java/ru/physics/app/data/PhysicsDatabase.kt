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
    ],
    version = 3,
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

        @Volatile
        private var instance: PhysicsDatabase? = null

        fun getInstance(context: Context): PhysicsDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    PhysicsDatabase::class.java,
                    "physics-local.db",
                ).addMigrations(MIGRATION_1_2, MIGRATION_2_3).build().also { instance = it }
            }
    }
}
