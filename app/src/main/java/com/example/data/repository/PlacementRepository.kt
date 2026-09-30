package com.example.data.repository

import android.content.Context
import com.example.data.local.PathfinderDatabase
import com.example.data.local.PlacementRecordEntity
import com.example.data.local.PredictionHistoryEntity
import com.example.data.model.AnalyticsSummary
import com.example.data.model.CourseStat
import com.example.data.model.PlacementRecord
import com.example.data.model.PredictionHistory
import com.example.data.model.PredictionResult
import com.example.data.model.SkillStat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader

class PlacementRepository(
    private val database: PathfinderDatabase,
    private val context: Context
) {
    private val placementDao = database.placementDao()
    private val historyDao = database.predictionHistoryDao()

    val allRecords: Flow<List<PlacementRecord>> = placementDao.getAllRecords()
        .map { entities -> entities.map { it.toDomain() } }

    val allHistory: Flow<List<PredictionHistory>> = historyDao.getAllHistory()
        .map { entities -> entities.map { it.toDomain() } }

    suspend fun ensureDatabaseSeeded() = withContext(Dispatchers.IO) {
        val count = placementDao.getRecordCount()
        if (count == 0) {
            val records = loadRecordsFromCsv()
            if (records.isNotEmpty()) {
                placementDao.insertRecords(records.map { PlacementRecordEntity.fromDomain(it) })
            }
        }
    }

    private fun loadRecordsFromCsv(): List<PlacementRecord> {
        val records = mutableListOf<PlacementRecord>()
        try {
            val inputStream = context.assets.open("sample_placement.csv")
            val reader = BufferedReader(InputStreamReader(inputStream))
            var isFirstLine = true
            var line: String? = reader.readLine()
            while (line != null) {
                if (isFirstLine) {
                    isFirstLine = false
                    line = reader.readLine()
                    continue
                }
                val tokens = line.split(",")
                if (tokens.size >= 10) {
                    val studentId = tokens[0].trim()
                    val year = tokens[1].trim().toIntOrNull() ?: 2025
                    val gender = tokens[2].trim()
                    val course = tokens[3].trim()
                    val cgpa = tokens[4].trim().toDoubleOrNull() ?: 7.0
                    val backlogs = tokens[5].trim().toIntOrNull() ?: 0
                    val internships = tokens[6].trim().toIntOrNull() ?: 0
                    val comm = tokens[7].trim().toIntOrNull() ?: 3
                    val coding = tokens[8].trim().toIntOrNull() ?: 3
                    val skillCategory = tokens[9].trim()
                    val status = if (tokens.size > 10) tokens[10].trim() else "Not Placed"

                    records.add(
                        PlacementRecord(
                            studentId = studentId,
                            year = year,
                            gender = gender,
                            course = course,
                            cgpa = cgpa,
                            backlogs = backlogs,
                            internships = internships,
                            communicationSkill = comm,
                            codingConfidence = coding,
                            skillCategory = skillCategory,
                            placementStatus = status
                        )
                    )
                }
                line = reader.readLine()
            }
            reader.close()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return records
    }

    fun calculateReadiness(
        cgpa: Double,
        backlogs: Int,
        internships: Int,
        communicationSkill: Int,
        codingConfidence: Int
    ): PredictionResult {
        // CGPA: 0-10, weight up to 35 points
        val cgpaScore = (cgpa / 10.0) * 35.0

        // Backlogs penalty: -15 per active backlog
        val backlogPenalty = (backlogs * 15.0).coerceAtMost(40.0)

        // Internships: up to 20 points
        val internshipScore = (internships * 10.0).coerceAtMost(20.0)

        // Communication: 1-5, up to 20 points
        val commScore = (communicationSkill / 5.0) * 20.0

        // Coding confidence: 1-5, up to 25 points
        val codingScore = (codingConfidence / 5.0) * 25.0

        var rawTotal = (cgpaScore + internshipScore + commScore + codingScore - backlogPenalty).toInt()
        rawTotal = rawTotal.coerceIn(5, 98)

        val verdict = when {
            rawTotal >= 75 -> "High Placement Probability"
            rawTotal >= 50 -> "Moderate Placement Probability"
            else -> "Needs Focused Upskilling"
        }

        val profileBand = when {
            rawTotal >= 75 -> "Strong Profile"
            rawTotal >= 50 -> "Good Foundation"
            else -> "High Risk Profile"
        }

        val strengths = mutableListOf<String>()
        val actions = mutableListOf<String>()

        if (cgpa >= 8.0) {
            strengths.add("Strong academic standing with CGPA >= 8.0")
        } else if (cgpa < 7.0) {
            actions.add("Aim to raise CGPA above 7.0 for standard company eligibility cutoffs")
        }

        if (backlogs > 0) {
            actions.add("Priority: Clear $backlogs active backlog(s) before tier-1 on-campus drives start")
        } else {
            strengths.add("Clean academic record with 0 backlogs")
        }

        if (internships >= 2) {
            strengths.add("Excellent practical industry exposure ($internships internships)")
        } else if (internships == 0) {
            actions.add("Seek at least 1 summer internship or industry capstone project")
        }

        if (codingConfidence >= 4) {
            strengths.add("High coding confidence for technical problem-solving rounds")
        } else {
            actions.add("Practice LeetCode / HackerRank problems regularly (aim for 100+ easy/medium)")
        }

        if (communicationSkill >= 4) {
            strengths.add("Strong communication skills for HR and behavioral interviews")
        } else {
            actions.add("Participate in group discussions and mock technical presentations")
        }

        return PredictionResult(
            probabilityScore = rawTotal,
            verdict = verdict,
            profileBand = profileBand,
            strengths = strengths,
            actionItems = actions
        )
    }

    suspend fun savePrediction(
        cgpa: Double,
        backlogs: Int,
        internships: Int,
        communicationSkill: Int,
        codingConfidence: Int,
        result: PredictionResult
    ) = withContext(Dispatchers.IO) {
        val entity = PredictionHistoryEntity(
            timestamp = System.currentTimeMillis(),
            cgpa = cgpa,
            backlogs = backlogs,
            internships = internships,
            communicationSkill = communicationSkill,
            codingConfidence = codingConfidence,
            probabilityScore = result.probabilityScore,
            verdict = result.verdict,
            profileBand = result.profileBand
        )
        historyDao.insertHistory(entity)
    }

    suspend fun deleteHistory(id: Int) = withContext(Dispatchers.IO) {
        historyDao.deleteById(id)
    }

    suspend fun clearAllHistory() = withContext(Dispatchers.IO) {
        historyDao.clearHistory()
    }

    fun computeAnalytics(
        records: List<PlacementRecord>,
        filterYear: Int? = null,
        filterCourse: String? = null,
        filterGender: String? = null,
        filterSkill: String? = null
    ): AnalyticsSummary {
        val filtered = records.filter { record ->
            (filterYear == null || record.year == filterYear) &&
            (filterCourse == null || record.course == filterCourse) &&
            (filterGender == null || record.gender == filterGender) &&
            (filterSkill == null || record.skillCategory == filterSkill)
        }

        val total = filtered.size
        if (total == 0) {
            return AnalyticsSummary(
                totalRecords = 0,
                placedCount = 0,
                notPlacedCount = 0,
                placementRate = 0.0,
                averageCgpa = 0.0,
                averageInternships = 0.0,
                averageBacklogs = 0.0,
                courseStats = emptyMap(),
                skillStats = emptyMap(),
                yearlyRates = emptyMap()
            )
        }

        val placed = filtered.count { it.placementStatus.equals("Placed", ignoreCase = true) }
        val notPlaced = total - placed
        val placementRate = (placed.toDouble() / total.toDouble()) * 100.0
        val avgCgpa = filtered.map { it.cgpa }.average()
        val avgInternships = filtered.map { it.internships }.average()
        val avgBacklogs = filtered.map { it.backlogs }.average()

        val courseStats = filtered.groupBy { it.course }.mapValues { (_, list) ->
            val cTotal = list.size
            val cPlaced = list.count { it.placementStatus.equals("Placed", ignoreCase = true) }
            CourseStat(
                courseName = list.first().course,
                totalStudents = cTotal,
                placedStudents = cPlaced,
                placementRate = if (cTotal > 0) (cPlaced.toDouble() / cTotal.toDouble()) * 100.0 else 0.0,
                averageCgpa = list.map { it.cgpa }.average()
            )
        }

        val skillStats = filtered.groupBy { it.skillCategory }.mapValues { (_, list) ->
            val sTotal = list.size
            val sPlaced = list.count { it.placementStatus.equals("Placed", ignoreCase = true) }
            SkillStat(
                skillCategory = list.first().skillCategory,
                totalStudents = sTotal,
                placedStudents = sPlaced,
                placementRate = if (sTotal > 0) (sPlaced.toDouble() / sTotal.toDouble()) * 100.0 else 0.0
            )
        }

        val yearlyRates = filtered.groupBy { it.year }.mapValues { (_, list) ->
            val yTotal = list.size
            val yPlaced = list.count { it.placementStatus.equals("Placed", ignoreCase = true) }
            if (yTotal > 0) (yPlaced.toDouble() / yTotal.toDouble()) * 100.0 else 0.0
        }

        return AnalyticsSummary(
            totalRecords = total,
            placedCount = placed,
            notPlacedCount = notPlaced,
            placementRate = placementRate,
            averageCgpa = avgCgpa,
            averageInternships = avgInternships,
            averageBacklogs = avgBacklogs,
            courseStats = courseStats,
            skillStats = skillStats,
            yearlyRates = yearlyRates
        )
    }
}
