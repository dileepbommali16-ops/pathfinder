package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        PlacementRecordEntity::class,
        PredictionHistoryEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class PathfinderDatabase : RoomDatabase() {
    abstract fun placementDao(): PlacementDao
    abstract fun predictionHistoryDao(): PredictionHistoryDao

    companion object {
        @Volatile
        private var INSTANCE: PathfinderDatabase? = null

        fun getDatabase(context: Context): PathfinderDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    PathfinderDatabase::class.java,
                    "pathfinder_db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
