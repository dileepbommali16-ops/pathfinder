package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.data.model.PlacementRecord

@Entity(tableName = "placement_records")
data class PlacementRecordEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val studentId: String,
    val year: Int,
    val gender: String,
    val course: String,
    val cgpa: Double,
    val backlogs: Int,
    val internships: Int,
    val communicationSkill: Int,
    val codingConfidence: Int,
    val skillCategory: String,
    val placementStatus: String
) {
    fun toDomain(): PlacementRecord {
        return PlacementRecord(
            id = id,
            studentId = studentId,
            year = year,
            gender = gender,
            course = course,
            cgpa = cgpa,
            backlogs = backlogs,
            internships = internships,
            communicationSkill = communicationSkill,
            codingConfidence = codingConfidence,
            skillCategory = skillCategory,
            placementStatus = placementStatus
        )
    }

    companion object {
        fun fromDomain(record: PlacementRecord): PlacementRecordEntity {
            return PlacementRecordEntity(
                id = record.id,
                studentId = record.studentId,
                year = record.year,
                gender = record.gender,
                course = record.course,
                cgpa = record.cgpa,
                backlogs = record.backlogs,
                internships = record.internships,
                communicationSkill = record.communicationSkill,
                codingConfidence = record.codingConfidence,
                skillCategory = record.skillCategory,
                placementStatus = record.placementStatus
            )
        }
    }
}
