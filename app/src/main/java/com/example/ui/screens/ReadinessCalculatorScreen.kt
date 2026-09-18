package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BookmarkAdd
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.ui.components.HorizontalProgressBar
import com.example.ui.components.ScoreGauge
import com.example.ui.theme.AmberWarning
import com.example.ui.theme.CardBorder
import com.example.ui.theme.CyanAccent
import com.example.ui.theme.DarkBackground
import com.example.ui.theme.DarkSurface
import com.example.ui.theme.DarkSurfaceVariant
import com.example.ui.theme.EmeraldLight
import com.example.ui.theme.EmeraldPrimary
import com.example.ui.theme.RedDanger
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.viewmodel.PlacementViewModel

@Composable
fun ReadinessCalculatorScreen(
    viewModel: PlacementViewModel,
    modifier: Modifier = Modifier
) {
    val cgpa by viewModel.cgpa.collectAsStateWithLifecycle()
    val backlogs by viewModel.backlogs.collectAsStateWithLifecycle()
    val internships by viewModel.internships.collectAsStateWithLifecycle()
    val communicationSkill by viewModel.communicationSkill.collectAsStateWithLifecycle()
    val codingConfidence by viewModel.codingConfidence.collectAsStateWithLifecycle()
    val predictionResult by viewModel.predictionResult.collectAsStateWithLifecycle()
    val statusMessage by viewModel.saveStatusMessage.collectAsStateWithLifecycle()

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(statusMessage) {
        statusMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearStatusMessage()
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DarkBackground)
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
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
                            text = "Pathfinder",
                            style = MaterialTheme.typography.headlineMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        )
                        Text(
                            text = "Placement Readiness Assessment",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary
                        )
                    }
                    OutlinedButton(
                        onClick = { viewModel.resetToDefaults() },
                        modifier = Modifier.testTag("reset_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Reset",
                            modifier = Modifier.size(16.dp),
                            tint = EmeraldPrimary
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Reset", color = EmeraldPrimary)
                    }
                }
            }

            // Gauge Card
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(DarkSurface, RoundedCornerShape(20.dp))
                        .border(1.dp, CardBorder, RoundedCornerShape(20.dp))
                        .padding(20.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        ScoreGauge(
                            score = predictionResult.probabilityScore,
                            verdict = predictionResult.profileBand
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = predictionResult.verdict,
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                            color = TextPrimary
                        )
                    }
                }
            }

            // Student Input Parameters
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(DarkSurface, RoundedCornerShape(20.dp))
                        .border(1.dp, CardBorder, RoundedCornerShape(20.dp))
                        .padding(20.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Text(
                            text = "Student Academic & Skill Parameters",
                            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                            color = TextPrimary
                        )

                        // CGPA Slider
                        SliderItem(
                            label = "Cumulative CGPA",
                            displayValue = String.format("%.2f", cgpa),
                            value = cgpa.toFloat(),
                            valueRange = 4.0f..10.0f,
                            steps = 59,
                            onValueChange = { viewModel.updateCgpa(it.toDouble()) },
                            activeColor = EmeraldPrimary
                        )

                        // Backlogs Slider
                        SliderItem(
                            label = "Active Backlogs",
                            displayValue = "$backlogs",
                            value = backlogs.toFloat(),
                            valueRange = 0f..6f,
                            steps = 5,
                            onValueChange = { viewModel.updateBacklogs(it.toInt()) },
                            activeColor = if (backlogs == 0) EmeraldPrimary else RedDanger
                        )

                        // Internships Slider
                        SliderItem(
                            label = "Internships Completed",
                            displayValue = "$internships",
                            value = internships.toFloat(),
                            valueRange = 0f..4f,
                            steps = 3,
                            onValueChange = { viewModel.updateInternships(it.toInt()) },
                            activeColor = CyanAccent
                        )

                        // Communication Skill
                        SliderItem(
                            label = "Communication Skill (1–5)",
                            displayValue = "$communicationSkill / 5",
                            value = communicationSkill.toFloat(),
                            valueRange = 1f..5f,
                            steps = 3,
                            onValueChange = { viewModel.updateCommunication(it.toInt()) },
                            activeColor = EmeraldLight
                        )

                        // Coding Confidence
                        SliderItem(
                            label = "Coding Confidence (1–5)",
                            displayValue = "$codingConfidence / 5",
                            value = codingConfidence.toFloat(),
                            valueRange = 1f..5f,
                            steps = 3,
                            onValueChange = { viewModel.updateCoding(it.toInt()) },
                            activeColor = CyanAccent
                        )
                    }
                }
            }

            // Benchmark Comparison Card
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(DarkSurface, RoundedCornerShape(20.dp))
                        .border(1.dp, CardBorder, RoundedCornerShape(20.dp))
                        .padding(20.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = "Benchmark",
                                tint = CyanAccent,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Benchmark vs 2024–2026 Cohort",
                                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                                color = TextPrimary
                            )
                        }

                        HorizontalProgressBar(
                            label = "Your CGPA (${String.format("%.1f", cgpa)}) vs Peer Average (7.2)",
                            value = cgpa,
                            maxValue = 10.0,
                            unit = "",
                            accentColor = if (cgpa >= 7.2) EmeraldPrimary else AmberWarning,
                            subtext = if (cgpa >= 7.2) "Above cohort average (+${String.format("%.1f", cgpa - 7.2)})" else "Below average (-${String.format("%.1f", 7.2 - cgpa)})"
                        )

                        HorizontalProgressBar(
                            label = "Internships ($internships) vs Peer Average (0.8)",
                            value = internships.toDouble(),
                            maxValue = 4.0,
                            unit = "",
                            accentColor = if (internships >= 1) CyanAccent else AmberWarning,
                            subtext = if (internships >= 1) "Above cohort average" else "Below cohort average"
                        )
                    }
                }
            }

            // Actionable Recommendations Card
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(DarkSurface, RoundedCornerShape(20.dp))
                        .border(1.dp, CardBorder, RoundedCornerShape(20.dp))
                        .padding(20.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            text = "Targeted Action Items & Strengths",
                            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                            color = TextPrimary
                        )

                        // Strengths
                        predictionResult.strengths.forEach { item ->
                            Row(
                                verticalAlignment = Alignment.Top
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = "Strength",
                                    tint = EmeraldPrimary,
                                    modifier = Modifier
                                        .size(18.dp)
                                        .padding(top = 2.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = item,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = TextPrimary
                                )
                            }
                        }

                        // Actions
                        predictionResult.actionItems.forEach { item ->
                            Row(
                                verticalAlignment = Alignment.Top
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Warning,
                                    contentDescription = "Action",
                                    tint = AmberWarning,
                                    modifier = Modifier
                                        .size(18.dp)
                                        .padding(top = 2.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = item,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = AmberWarning
                                )
                            }
                        }
                    }
                }
            }

            // Save assessment button
            item {
                Button(
                    onClick = { viewModel.saveCurrentPrediction() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .testTag("save_prediction_button"),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = EmeraldPrimary,
                        contentColor = DarkBackground
                    ),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.BookmarkAdd,
                        contentDescription = "Save",
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Save Assessment to History",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                    )
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 16.dp)
        )
    }
}

@Composable
private fun SliderItem(
    label: String,
    displayValue: String,
    value: Float,
    valueRange: ClosedFloatingPointRange<Float>,
    steps: Int,
    onValueChange: (Float) -> Unit,
    activeColor: androidx.compose.ui.graphics.Color
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = TextPrimary
            )
            Box(
                modifier = Modifier
                    .background(activeColor.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 8.dp, vertical = 2.dp)
            ) {
                Text(
                    text = displayValue,
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                    color = activeColor
                )
            }
        }
        Slider(
            value = value,
            onValueChange = onValueChange,
            valueRange = valueRange,
            steps = steps,
            colors = SliderDefaults.colors(
                thumbColor = activeColor,
                activeTrackColor = activeColor,
                inactiveTrackColor = DarkSurfaceVariant
            )
        )
    }
}
