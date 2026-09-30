package com.example.data.model

data class PredictionHistory(
    val id: Int = 0,
    val timestamp: Long,
    val cgpa: Double,
    val backlogs: Int,
    val internships: Int,
    val communicationSkill: Int,
    val codingConfidence: Int,
    val probabilityScore: Int,
    val verdict: String,
    val profileBand: String
)
