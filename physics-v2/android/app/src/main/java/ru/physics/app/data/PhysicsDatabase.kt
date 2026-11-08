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
    ],
    version = 1,
    exportSchema = true,
)
abstract class PhysicsDatabase : RoomDatabase() {
    abstract fun physicsDao(): PhysicsDao

    companion object {
        @Volatile
        private var instance: PhysicsDatabase? = null

        fun getInstance(context: Context): PhysicsDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    PhysicsDatabase::class.java,
                    "physics-local.db",
                ).build().also { instance = it }
            }
    }
}
