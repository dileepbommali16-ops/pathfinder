package com.example.ui.viewmodel

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.AnalyticsSummary
import com.example.data.model.PlacementRecord
import com.example.data.model.PredictionHistory
import com.example.data.model.PredictionResult
import com.example.data.repository.PlacementRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileWriter

class PlacementViewModel(
    private val repository: PlacementRepository
) : ViewModel() {

    private val _cgpa = MutableStateFlow(7.5)
    val cgpa: StateFlow<Double> = _cgpa.asStateFlow()

    private val _backlogs = MutableStateFlow(0)
    val backlogs: StateFlow<Int> = _backlogs.asStateFlow()

    private val _internships = MutableStateFlow(1)
    val internships: StateFlow<Int> = _internships.asStateFlow()

    private val _communicationSkill = MutableStateFlow(3)
    val communicationSkill: StateFlow<Int> = _communicationSkill.asStateFlow()

    private val _codingConfidence = MutableStateFlow(3)
    val codingConfidence: StateFlow<Int> = _codingConfidence.asStateFlow()

    private val _saveStatusMessage = MutableStateFlow<String?>(null)
    val saveStatusMessage: StateFlow<String?> = _saveStatusMessage.asStateFlow()

    // Analytics Filters
    private val _selectedYear = MutableStateFlow<Int?>(null)
    val selectedYear: StateFlow<Int?> = _selectedYear.asStateFlow()

    private val _selectedCourse = MutableStateFlow<String?>(null)
    val selectedCourse: StateFlow<String?> = _selectedCourse.asStateFlow()

    private val _selectedGender = MutableStateFlow<String?>(null)
    val selectedGender: StateFlow<String?> = _selectedGender.asStateFlow()

    private val _selectedSkill = MutableStateFlow<String?>(null)
    val selectedSkill: StateFlow<String?> = _selectedSkill.asStateFlow()

    init {
        viewModelScope.launch {
            repository.ensureDatabaseSeeded()
        }
    }

    val predictionResult: StateFlow<PredictionResult> = combine(
        _cgpa,
        _backlogs,
        _internships,
        _communicationSkill,
        _codingConfidence
    ) { cgpaVal, backlogsVal, internshipsVal, commVal, codingVal ->
        repository.calculateReadiness(
            cgpa = cgpaVal,
            backlogs = backlogsVal,
            internships = internshipsVal,
            communicationSkill = commVal,
            codingConfidence = codingVal
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = repository.calculateReadiness(7.5, 0, 1, 3, 3)
    )

    val records: StateFlow<List<PlacementRecord>> = repository.allRecords
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val historyList: StateFlow<List<PredictionHistory>> = repository.allHistory
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val analyticsSummary: StateFlow<AnalyticsSummary> = combine(
        records,
        _selectedYear,
        _selectedCourse,
        _selectedGender,
        _selectedSkill
    ) { recordList, year, course, gender, skill ->
        repository.computeAnalytics(
            records = recordList,
            filterYear = year,
            filterCourse = course,
            filterGender = gender,
            filterSkill = skill
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = repository.computeAnalytics(emptyList())
    )

    fun updateCgpa(value: Double) {
        _cgpa.value = (Math.round(value * 100.0) / 100.0).coerceIn(0.0, 10.0)
    }

    fun updateBacklogs(value: Int) {
        _backlogs.value = value.coerceIn(0, 10)
    }

    fun updateInternships(value: Int) {
        _internships.value = value.coerceIn(0, 5)
    }

    fun updateCommunication(value: Int) {
        _communicationSkill.value = value.coerceIn(1, 5)
    }

    fun updateCoding(value: Int) {
        _codingConfidence.value = value.coerceIn(1, 5)
    }

    fun resetToDefaults() {
        _cgpa.value = 7.5
        _backlogs.value = 0
        _internships.value = 1
        _communicationSkill.value = 3
        _codingConfidence.value = 3
    }

    fun saveCurrentPrediction() {
        viewModelScope.launch {
            val result = predictionResult.value
            repository.savePrediction(
                cgpa = _cgpa.value,
                backlogs = _backlogs.value,
                internships = _internships.value,
                communicationSkill = _communicationSkill.value,
                codingConfidence = _codingConfidence.value,
                result = result
            )
            _saveStatusMessage.value = "Assessment saved to history!"
        }
    }

    fun clearStatusMessage() {
        _saveStatusMessage.value = null
    }

    fun deleteHistoryItem(id: Int) {
        viewModelScope.launch {
            repository.deleteHistory(id)
        }
    }

    fun clearAllHistory() {
        viewModelScope.launch {
            repository.clearAllHistory()
        }
    }

    fun setYearFilter(year: Int?) {
        _selectedYear.value = year
    }

    fun setCourseFilter(course: String?) {
        _selectedCourse.value = course
    }

    fun setGenderFilter(gender: String?) {
        _selectedGender.value = gender
    }

    fun setSkillFilter(skill: String?) {
        _selectedSkill.value = skill
    }

    fun clearFilters() {
        _selectedYear.value = null
        _selectedCourse.value = null
        _selectedGender.value = null
        _selectedSkill.value = null
    }

    fun exportCohortCsv(context: Context) {
        val currentRecords = records.value
        if (currentRecords.isEmpty()) return

        try {
            val exportDir = File(context.cacheDir, "exports")
            if (!exportDir.exists()) exportDir.mkdirs()
            val file = File(exportDir, "pathfinder_placement_data.csv")
            val writer = FileWriter(file)
            writer.append("StudentID,Year,Gender,Course,CGPA,Backlogs,Internships,Communication,Coding,SkillCategory,Status\n")
            for (r in currentRecords) {
                writer.append("${r.studentId},${r.year},${r.gender},${r.course},${r.cgpa},${r.backlogs},${r.internships},${r.communicationSkill},${r.codingConfidence},${r.skillCategory},${r.placementStatus}\n")
            }
            writer.flush()
            writer.close()

            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file
            )
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/csv"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(Intent.createChooser(intent, "Share Placement CSV").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
