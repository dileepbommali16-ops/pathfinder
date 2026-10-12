package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface PlacementDao {
    @Query("SELECT * FROM placement_records ORDER BY id ASC")
    fun getAllRecords(): Flow<List<PlacementRecordEntity>>

    @Query("SELECT COUNT(*) FROM placement_records")
    suspend fun getRecordCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecords(records: List<PlacementRecordEntity>)

    @Query("SELECT DISTINCT year FROM placement_records ORDER BY year DESC")
    fun getDistinctYears(): Flow<List<Int>>

    @Query("SELECT DISTINCT course FROM placement_records ORDER BY course ASC")
    fun getDistinctCourses(): Flow<List<String>>

    @Query("DELETE FROM placement_records")
    suspend fun clearAll()
}
