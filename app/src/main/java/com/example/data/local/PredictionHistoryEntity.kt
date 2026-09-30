package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.data.model.PredictionHistory

@Entity(tableName = "prediction_history")
data class PredictionHistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val timestamp: Long,
    val cgpa: Double,
    val backlogs: Int,
    val internships: Int,
    val communicationSkill: Int,
    val codingConfidence: Int,
    val probabilityScore: Int,
    val verdict: String,
    val profileBand: String
) {
    fun toDomain(): PredictionHistory {
        return PredictionHistory(
            id = id,
            timestamp = timestamp,
            cgpa = cgpa,
            backlogs = backlogs,
            internships = internships,
            communicationSkill = communicationSkill,
            codingConfidence = codingConfidence,
            probabilityScore = probabilityScore,
            verdict = verdict,
            profileBand = profileBand
        )
    }

    companion object {
        fun fromDomain(history: PredictionHistory): PredictionHistoryEntity {
            return PredictionHistoryEntity(
                id = history.id,
                timestamp = history.timestamp,
                cgpa = history.cgpa,
                backlogs = history.backlogs,
                internships = history.internships,
                communicationSkill = history.communicationSkill,
                codingConfidence = history.codingConfidence,
                probabilityScore = history.probabilityScore,
                verdict = history.verdict,
                profileBand = history.profileBand
            )
        }
    }
}
