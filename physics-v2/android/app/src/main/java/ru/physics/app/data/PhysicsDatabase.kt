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
    version = 2,
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

        @Volatile
        private var instance: PhysicsDatabase? = null

        fun getInstance(context: Context): PhysicsDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    PhysicsDatabase::class.java,
                    "physics-local.db",
                ).addMigrations(MIGRATION_1_2).build().also { instance = it }
            }
    }
}
