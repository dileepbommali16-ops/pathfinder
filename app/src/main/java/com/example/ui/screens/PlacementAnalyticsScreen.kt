package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.ui.components.HorizontalProgressBar
import com.example.ui.components.MetricCard
import com.example.ui.components.PlacementDonutChart
import com.example.ui.theme.AmberWarning
import com.example.ui.theme.CardBorder
import com.example.ui.theme.CyanAccent
import com.example.ui.theme.DarkBackground
import com.example.ui.theme.DarkSurface
import com.example.ui.theme.EmeraldLight
import com.example.ui.theme.EmeraldPrimary
import com.example.ui.theme.PlacedGreen
import com.example.ui.theme.RedDanger
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.viewmodel.PlacementViewModel

@Composable
fun PlacementAnalyticsScreen(
    viewModel: PlacementViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val summary by viewModel.analyticsSummary.collectAsStateWithLifecycle()
    val selectedYear by viewModel.selectedYear.collectAsStateWithLifecycle()
    val selectedCourse by viewModel.selectedCourse.collectAsStateWithLifecycle()
    val selectedGender by viewModel.selectedGender.collectAsStateWithLifecycle()
    val selectedSkill by viewModel.selectedSkill.collectAsStateWithLifecycle()

    val years = listOf(2024, 2025, 2026)
    val courses = listOf("Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil")
    val genders = listOf("Male", "Female")
    val skills = listOf("High", "Medium", "Low")

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Cohort Analytics",
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    )
                    Text(
                        text = "Historical trends & branch insights (650 students)",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                }
                Button(
                    onClick = { viewModel.exportCohortCsv(context) },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CyanAccent,
                        contentColor = DarkBackground
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.testTag("export_csv_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.FileDownload,
                        contentDescription = "Export",
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Export", style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold))
                }
            }
        }

        // Filters Section
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DarkSurface, RoundedCornerShape(16.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
                    .padding(14.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Filter Cohort View",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = TextPrimary
                        )
                        if (selectedYear != null || selectedCourse != null || selectedGender != null || selectedSkill != null) {
                            IconButton(
                                onClick = { viewModel.clearFilters() },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Clear,
                                    contentDescription = "Clear Filters",
                                    tint = TextMuted
                                )
                            }
                        }
                    }

                    // Year Filter Chips
                    Text(text = "Graduation Year", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = selectedYear == null,
                            onClick = { viewModel.setYearFilter(null) },
                            label = { Text("All Years") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = EmeraldPrimary,
                                selectedLabelColor = DarkBackground
                            )
                        )
                        years.forEach { year ->
                            FilterChip(
                                selected = selectedYear == year,
                                onClick = { viewModel.setYearFilter(year) },
                                label = { Text("$year") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = EmeraldPrimary,
                                    selectedLabelColor = DarkBackground
                                )
                            )
                        }
                    }

                    // Course Filter Chips
                    Text(text = "Engineering Branch", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = selectedCourse == null,
                            onClick = { viewModel.setCourseFilter(null) },
                            label = { Text("All Branches") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = CyanAccent,
                                selectedLabelColor = DarkBackground
                            )
                        )
                        courses.forEach { course ->
                            FilterChip(
                                selected = selectedCourse == course,
                                onClick = { viewModel.setCourseFilter(course) },
                                label = { Text(course.replace("Computer Science", "CSE").replace("Information Technology", "IT").replace("Electronics", "ECE")) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = CyanAccent,
                                    selectedLabelColor = DarkBackground
                                )
                            )
                        }
                    }

                    // Skill Category Chips
                    Text(text = "Skill Tier", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = selectedSkill == null,
                            onClick = { viewModel.setSkillFilter(null) },
                            label = { Text("All Tiers") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = EmeraldLight,
                                selectedLabelColor = DarkBackground
                            )
                        )
                        skills.forEach { skill ->
                            FilterChip(
                                selected = selectedSkill == skill,
                                onClick = { viewModel.setSkillFilter(skill) },
                                label = { Text("$skill Tier") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = EmeraldLight,
                                    selectedLabelColor = DarkBackground
                                )
                            )
                        }
                    }
                }
            }
        }

        // Summary Metric Cards (2x2 grid in Columns)
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MetricCard(
                    title = "Filtered Students",
                    value = "${summary.totalRecords}",
                    subtitle = "of 650 total",
                    icon = Icons.Default.People,
                    accentColor = CyanAccent,
                    modifier = Modifier.weight(1f)
                )
                MetricCard(
                    title = "Placement Rate",
                    value = String.format("%.1f%%", summary.placementRate),
                    subtitle = "${summary.placedCount} Placed",
                    icon = Icons.Default.CheckCircle,
                    accentColor = PlacedGreen,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MetricCard(
                    title = "Average CGPA",
                    value = String.format("%.2f", summary.averageCgpa),
                    subtitle = "Scale of 10.0",
                    icon = Icons.Default.School,
                    accentColor = EmeraldPrimary,
                    modifier = Modifier.weight(1f)
                )
                MetricCard(
                    title = "Avg Backlogs",
                    value = String.format("%.2f", summary.averageBacklogs),
                    subtitle = "per candidate",
                    icon = Icons.Default.Warning,
                    accentColor = if (summary.averageBacklogs > 0.5) AmberWarning else EmeraldLight,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Placement Donut Chart
        item {
            Text(
                text = "Placement Distribution",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(6.dp))
            PlacementDonutChart(
                placedCount = summary.placedCount,
                notPlacedCount = summary.notPlacedCount
            )
        }

        // Branch-wise Placement Rate
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DarkSurface, RoundedCornerShape(16.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
                    .padding(16.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Branch-wise Placement Success",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = TextPrimary
                    )

                    summary.courseStats.values.sortedByDescending { it.placementRate }.forEach { course ->
                        HorizontalProgressBar(
                            label = course.courseName,
                            value = course.placementRate,
                            maxValue = 100.0,
                            unit = "%",
                            accentColor = if (course.placementRate >= 70.0) EmeraldPrimary else if (course.placementRate >= 50.0) CyanAccent else AmberWarning,
                            subtext = "${course.placedStudents} of ${course.totalStudents} placed | Avg CGPA: ${String.format("%.2f", course.averageCgpa)}"
                        )
                    }
                }
            }
        }

        // Skill-tier Placement Rate
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DarkSurface, RoundedCornerShape(16.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
                    .padding(16.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Skill Tier Impact on Hiring",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = TextPrimary
                    )

                    summary.skillStats.values.sortedByDescending { it.placementRate }.forEach { skill ->
                        HorizontalProgressBar(
                            label = "${skill.skillCategory} Skill Tier",
                            value = skill.placementRate,
                            maxValue = 100.0,
                            unit = "%",
                            accentColor = when (skill.skillCategory) {
                                "High" -> EmeraldPrimary
                                "Medium" -> CyanAccent
                                else -> RedDanger
                            },
                            subtext = "${skill.placedStudents} of ${skill.totalStudents} students placed"
                        )
                    }
                }
            }
        }

        // Year-over-Year Trend
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DarkSurface, RoundedCornerShape(16.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
                    .padding(16.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Year-over-Year Cohort Trend",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = TextPrimary
                    )

                    summary.yearlyRates.entries.sortedBy { it.key }.forEach { entry ->
                        HorizontalProgressBar(
                            label = "Class of ${entry.key}",
                            value = entry.value,
                            maxValue = 100.0,
                            unit = "%",
                            accentColor = CyanAccent,
                            subtext = String.format("Campus placement rate: %.1f%%", entry.value)
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
