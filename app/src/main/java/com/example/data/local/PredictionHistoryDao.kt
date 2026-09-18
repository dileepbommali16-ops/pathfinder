package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface PredictionHistoryDao {
    @Query("SELECT * FROM prediction_history ORDER BY timestamp DESC")
    fun getAllHistory(): Flow<List<PredictionHistoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHistory(entry: PredictionHistoryEntity)

    @Query("DELETE FROM prediction_history WHERE id = :id")
    suspend fun deleteById(id: Int)

    @Query("DELETE FROM prediction_history")
    suspend fun clearHistory()
}
