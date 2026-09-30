package com.example.data.model

data class PlacementRecord(
    val id: Int = 0,
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
)

data class PredictionResult(
    val probabilityScore: Int,
    val verdict: String,
    val profileBand: String,
    val strengths: List<String>,
    val actionItems: List<String>,
    val peerAverageCgpa: Double = 7.2,
    val peerAverageInternships: Double = 0.8
)

data class AnalyticsSummary(
    val totalRecords: Int,
    val placedCount: Int,
    val notPlacedCount: Int,
    val placementRate: Double,
    val averageCgpa: Double,
    val averageInternships: Double,
    val averageBacklogs: Double,
    val courseStats: Map<String, CourseStat>,
    val skillStats: Map<String, SkillStat>,
    val yearlyRates: Map<Int, Double>
)

data class CourseStat(
    val courseName: String,
    val totalStudents: Int,
    val placedStudents: Int,
    val placementRate: Double,
    val averageCgpa: Double
)

data class SkillStat(
    val skillCategory: String,
    val totalStudents: Int,
    val placedStudents: Int,
    val placementRate: Double
)
