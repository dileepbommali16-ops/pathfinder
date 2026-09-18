package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.AmberWarning
import com.example.ui.theme.CardBorder
import com.example.ui.theme.CyanAccent
import com.example.ui.theme.DarkBackground
import com.example.ui.theme.DarkSurface
import com.example.ui.theme.DarkSurfaceVariant
import com.example.ui.theme.EmeraldLight
import com.example.ui.theme.EmeraldPrimary
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary

@Composable
fun AICoachScreen(
    modifier: Modifier = Modifier
) {
    val resumeChecklist = remember {
        mutableStateMapOf(
            "Include live deployed links & GitHub repos for all projects" to true,
            "Quantify achievements using metrics (e.g. 'reduced latency by 35%')" to false,
            "Tailor technical skills section to match company job description" to false,
            "Keep resume format to a single-column, ATS-parseable PDF" to true,
            "List academic coursework relevant to developer role (DSA, OS, DBMS)" to false
        )
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .background(CyanAccent.copy(alpha = 0.15f), RoundedCornerShape(12.dp))
                        .border(1.dp, CyanAccent.copy(alpha = 0.3f), RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.AutoAwesome,
                        contentDescription = "Coach",
                        tint = CyanAccent,
                        modifier = Modifier.size(24.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "AI Placement Advisor",
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    )
                    Text(
                        text = "Strategic prep roadmap & interview coaching",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                }
            }
        }

        // Preparation Pillars
        item {
            Text(
                text = "Placement Preparation Pillars",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                PillarCard(
                    title = "DSA & Coding",
                    desc = "Arrays, DP, Trees",
                    icon = Icons.Default.Code,
                    color = EmeraldPrimary,
                    modifier = Modifier.weight(1f)
                )
                PillarCard(
                    title = "Core CS",
                    desc = "OS, DBMS, CN",
                    icon = Icons.Default.School,
                    color = CyanAccent,
                    modifier = Modifier.weight(1f)
                )
                PillarCard(
                    title = "Behavioral",
                    desc = "STAR interview",
                    icon = Icons.Default.Psychology,
                    color = AmberWarning,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // ATS Resume Checklist Card
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DarkSurface, RoundedCornerShape(16.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
                    .padding(16.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Description,
                            contentDescription = "Resume",
                            tint = EmeraldPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "ATS Resume Health Checklist",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = TextPrimary
                        )
                    }

                    resumeChecklist.keys.toList().forEach { item ->
                        val isChecked = resumeChecklist[item] ?: false
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { resumeChecklist[item] = !isChecked }
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = isChecked,
                                onCheckedChange = { resumeChecklist[item] = it },
                                colors = CheckboxDefaults.colors(
                                    checkedColor = EmeraldPrimary,
                                    uncheckedColor = TextMuted,
                                    checkmarkColor = DarkBackground
                                )
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = item,
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (isChecked) TextPrimary else TextSecondary
                            )
                        }
                    }
                }
            }
        }

        // High-Yield Technical Interview Topics
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DarkSurface, RoundedCornerShape(16.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
                    .padding(16.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "High-Yield Placement Interview Topics",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = TextPrimary
                    )

                    TopicItem(
                        topic = "Data Structures & Algorithms",
                        detail = "Two Pointers, Sliding Window, Binary Search, Graph BFS/DFS, Top K Frequent elements"
                    )
                    TopicItem(
                        topic = "Object-Oriented Programming (OOP)",
                        detail = "Polymorphism vs Inheritance, Abstract classes vs Interfaces, SOLID principles with code examples"
                    )
                    TopicItem(
                        topic = "Database Management (DBMS)",
                        detail = "ACID properties, Indexing (B-Tree), Normalization (1NF to BCNF), Complex JOIN queries"
                    )
                    TopicItem(
                        topic = "Operating Systems & Networking",
                        detail = "Process vs Thread, Deadlocks & Semaphores, TCP 3-way handshake, DNS resolution flow"
                    )
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun PillarCard(
    title: String,
    desc: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .background(DarkSurface, RoundedCornerShape(12.dp))
            .border(1.dp, CardBorder, RoundedCornerShape(12.dp))
            .padding(12.dp)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(color.copy(alpha = 0.15f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                color = TextPrimary,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
            Text(
                text = desc,
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                color = TextMuted,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }
    }
}

@Composable
private fun TopicItem(
    topic: String,
    detail: String
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(DarkSurfaceVariant, RoundedCornerShape(10.dp))
            .padding(12.dp)
    ) {
        Text(
            text = topic,
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
            color = CyanAccent
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = detail,
            style = MaterialTheme.typography.bodySmall,
            color = TextSecondary
        )
    }
}
