package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.SuggestionChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.components.HorizontalProgressBar
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
import com.example.ui.theme.VioletAccent
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

data class ChatMessage(
    val isUser: Boolean,
    val text: String,
    val timestamp: String = "Just now"
)

@Composable
fun AICoachScreen(
    modifier: Modifier = Modifier
) {
    val coroutineScope = rememberCoroutineScope()
    var inputQuery by remember { mutableStateOf("") }
    var isGenerating by remember { mutableStateOf(false) }

    val chatMessages = remember {
        mutableStateListOf(
            ChatMessage(
                isUser = false,
                text = "Hello! I am your AI Placement Coach powered by Gemini LLM. Ask me anything about Data Structures & Algorithms, behavioral STAR questions, improving your placement probability score, or optimizing your ATS resume."
            )
        )
    }

    val resumeChecklist = remember {
        mutableStateMapOf(
            "Include live deployed links & GitHub repos for all projects" to true,
            "Quantify achievements using metrics (e.g. 'reduced latency by 35%')" to false,
            "Tailor technical skills section to match target job role (SDE, Data, Cloud)" to false,
            "Keep format to a single-column, ATS-parseable layout without tables" to true,
            "List academic coursework relevant to developer role (DSA, OS, DBMS, CN)" to false
        )
    }

    val completedCount = resumeChecklist.values.count { it }
    val totalCount = resumeChecklist.size
    val resumeScore = if (totalCount > 0) (completedCount * 100 / totalCount) else 0

    val suggestedQuestions = listOf(
        "How do I raise my chance from 65% to 85%?",
        "Top 5 DSA patterns for campus technical rounds",
        "STAR answer for 'Tell me about a challenging bug'",
        "ATS resume bullet formula with examples"
    )

    fun sendQuery(query: String) {
        if (query.isBlank() || isGenerating) return
        chatMessages.add(ChatMessage(isUser = true, text = query))
        inputQuery = ""
        isGenerating = true

        coroutineScope.launch {
            delay(1200) // Simulated fast Gemini 3.5 response
            val reply = when {
                query.contains("65%", ignoreCase = true) || query.contains("raise", ignoreCase = true) ->
                    "To jump from 65% to 85%+:\n1. Academic Hygiene: Clear any backlogs immediately; zero active backlogs raises employer shortlist eligibility by ~40%.\n2. Projects: Upgrade basic tutorials to full-stack applications with user auth, Redis caching, and live cloud deployment.\n3. Coding Practice: Focus on Blind 75 / LeetCode medium questions with time constraints.\n4. Mock Interviews: Conduct at least 2 mock behavioral sessions weekly."

                query.contains("DSA", ignoreCase = true) || query.contains("algorithm", ignoreCase = true) ->
                    "Top 5 High-Yield DSA Patterns for Campus Tests:\n1. Two Pointers & Sliding Window: Trapping rain water, longest substring without repeats.\n2. Fast & Slow Pointers: Cycle detection in linked lists.\n3. BFS / DFS on Graphs & Trees: Level-order traversal, number of connected components.\n4. Dynamic Programming: 0/1 Knapsack, Coin Change, Longest Increasing Subsequence.\n5. Monotonic Stack: Next Greater Element, Largest Rectangle in Histogram."

                query.contains("STAR", ignoreCase = true) || query.contains("bug", ignoreCase = true) ->
                    "STAR Framework Response:\n• Situation: In my semester capstone project, our REST API crashed under concurrent test users.\n• Task: I took ownership of diagnosing memory leaks and optimizing database connections.\n• Action: Used profiler tools to trace unindexed SQL queries and implemented connection pooling with HikariCP.\n• Result: Reduced response latency from 850ms to 92ms and handled 500+ concurrent requests without errors."

                query.contains("resume", ignoreCase = true) || query.contains("bullet", ignoreCase = true) ->
                    "The Google X-Y-Z Resume Formula:\n'Accomplished [X] as measured by [Y], by doing [Z]'\n\nExample for SDE:\n'Engineered a real-time collaborative code editor serving 2,000+ monthly active users, reducing sync latency by 45% using WebSockets and CRDT algorithms.'"

                else ->
                    "Great question! For engineering placements, recruiters look for strong problem solving fundamentals (DSA), hands-on technical architecture (clean GitHub projects with README & live demos), and confident communication using the STAR method. Let me know if you want to drill down into technical or behavioral prep."
            }

            chatMessages.add(ChatMessage(isUser = false, text = reply))
            isGenerating = false
        }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .background(CyanAccent.copy(alpha = 0.15f), RoundedCornerShape(12.dp))
                            .border(1.dp, CyanAccent.copy(alpha = 0.35f), RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = "AI Coach",
                            tint = CyanAccent,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "AI Placement Coach",
                                style = MaterialTheme.typography.headlineMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .background(EmeraldPrimary.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = "Gemini 3.5",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = EmeraldPrimary,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 10.sp
                                    )
                                )
                            }
                        }
                        Text(
                            text = "Intelligent mentor for technical & HR interviews",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary
                        )
                    }
                }
            }
        }

        // Preparation Pillars
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                PillarCard(
                    title = "DSA & Coding",
                    desc = "Arrays, DP, Graphs",
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
                    desc = "STAR Method",
                    icon = Icons.Default.Psychology,
                    color = VioletAccent,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Interactive Gemini LLM Chat Card
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DarkSurface, RoundedCornerShape(20.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(20.dp))
                    .padding(16.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.AutoAwesome,
                                contentDescription = "Coach",
                                tint = CyanAccent,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Ask Placement Mentor",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                color = TextPrimary
                            )
                        }
                    }

                    // Suggested Prompts horizontal carousel
                    Text(
                        text = "Quick Topics:",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextMuted
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        suggestedQuestions.forEach { prompt ->
                            SuggestionChip(
                                onClick = { sendQuery(prompt) },
                                label = { Text(prompt, fontSize = 12.sp) },
                                colors = SuggestionChipDefaults.suggestionChipColors(
                                    containerColor = DarkSurfaceVariant,
                                    labelColor = CyanAccent
                                ),
                                border = SuggestionChipDefaults.suggestionChipBorder(
                                    borderColor = CardBorder
                                )
                            )
                        }
                    }

                    // Conversation thread
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(DarkBackground, RoundedCornerShape(14.dp))
                            .border(1.dp, CardBorder, RoundedCornerShape(14.dp))
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        chatMessages.takeLast(4).forEach { msg ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = if (msg.isUser) Arrangement.End else Arrangement.Start
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth(0.92f)
                                        .background(
                                            if (msg.isUser) EmeraldPrimary.copy(alpha = 0.18f) else DarkSurfaceVariant,
                                            RoundedCornerShape(12.dp)
                                        )
                                        .border(
                                            1.dp,
                                            if (msg.isUser) EmeraldPrimary.copy(alpha = 0.4f) else CardBorder,
                                            RoundedCornerShape(12.dp)
                                        )
                                        .padding(12.dp)
                                ) {
                                    Column {
                                        Text(
                                            text = if (msg.isUser) "You" else "Gemini Placement Coach",
                                            style = MaterialTheme.typography.labelSmall.copy(
                                                fontWeight = FontWeight.Bold,
                                                color = if (msg.isUser) EmeraldLight else CyanAccent
                                            )
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = msg.text,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = TextPrimary
                                        )
                                    }
                                }
                            }
                        }

                        if (isGenerating) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(vertical = 4.dp)
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(16.dp),
                                    color = CyanAccent,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Analyzing placement strategy...",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = TextMuted
                                )
                            }
                        }
                    }

                    // Text Input
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = inputQuery,
                            onValueChange = { inputQuery = it },
                            placeholder = { Text("Ask anything about placements...", color = TextMuted, fontSize = 13.sp) },
                            modifier = Modifier
                                .weight(1f)
                                .testTag("coach_input_field"),
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = CyanAccent,
                                unfocusedBorderColor = CardBorder,
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedContainerColor = DarkBackground,
                                unfocusedContainerColor = DarkBackground
                            ),
                            singleLine = true
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        IconButton(
                            onClick = { sendQuery(inputQuery) },
                            modifier = Modifier
                                .size(48.dp)
                                .background(CyanAccent, RoundedCornerShape(12.dp))
                                .testTag("coach_send_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Send,
                                contentDescription = "Send",
                                tint = DarkBackground,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }
        }

        // ATS Resume Health Checklist Card
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DarkSurface, RoundedCornerShape(20.dp))
                    .border(1.dp, CardBorder, RoundedCornerShape(20.dp))
                    .padding(20.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Description,
                                contentDescription = "Resume",
                                tint = EmeraldPrimary,
                                modifier = Modifier.size(22.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "ATS Resume Health Score",
                                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                                color = TextPrimary
                            )
                        }
                        Text(
                            text = "$resumeScore%",
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.ExtraBold,
                                color = if (resumeScore >= 80) EmeraldPrimary else AmberWarning
                            )
                        )
                    }

                    HorizontalProgressBar(
                        label = "Checklist Completion ($completedCount / $totalCount items)",
                        value = resumeScore.toDouble(),
                        maxValue = 100.0,
                        unit = "%",
                        accentColor = if (resumeScore >= 80) EmeraldPrimary else AmberWarning
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    resumeChecklist.keys.toList().forEach { item ->
                        val isChecked = resumeChecklist[item] ?: false
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .clickable { resumeChecklist[item] = !isChecked }
                                .background(if (isChecked) EmeraldPrimary.copy(alpha = 0.08f) else DarkSurfaceVariant.copy(alpha = 0.5f))
                                .border(1.dp, if (isChecked) EmeraldPrimary.copy(alpha = 0.25f) else CardBorder, RoundedCornerShape(10.dp))
                                .padding(12.dp),
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
                            Spacer(modifier = Modifier.width(8.dp))
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

        // High Yield Placement Topics
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
                        text = "High-Yield Placement Interview Topics",
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                        color = TextPrimary
                    )

                    TopicItem(
                        topic = "Data Structures & Algorithms",
                        detail = "Two Pointers, Sliding Window, Binary Search, Graph BFS/DFS, Top K Frequent elements",
                        accent = CyanAccent
                    )
                    TopicItem(
                        topic = "Object-Oriented Programming (OOP)",
                        detail = "Polymorphism vs Inheritance, Abstract classes vs Interfaces, SOLID principles with code examples",
                        accent = EmeraldPrimary
                    )
                    TopicItem(
                        topic = "Database Management (DBMS)",
                        detail = "ACID properties, Indexing (B-Tree), Normalization (1NF to BCNF), Complex JOIN queries",
                        accent = VioletAccent
                    )
                    TopicItem(
                        topic = "Operating Systems & Networking",
                        detail = "Process vs Thread, Deadlocks & Semaphores, TCP 3-way handshake, DNS resolution flow",
                        accent = AmberWarning
                    )
                }
            }
            Spacer(modifier = Modifier.height(28.dp))
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
            .background(DarkSurface, RoundedCornerShape(16.dp))
            .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
            .padding(14.dp)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(color.copy(alpha = 0.15f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = color,
                    modifier = Modifier.size(22.dp)
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
    detail: String,
    accent: androidx.compose.ui.graphics.Color
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(DarkSurfaceVariant, RoundedCornerShape(12.dp))
            .border(1.dp, CardBorder, RoundedCornerShape(12.dp))
            .padding(14.dp)
    ) {
        Text(
            text = topic,
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
            color = accent
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = detail,
            style = MaterialTheme.typography.bodySmall,
            color = TextSecondary
        )
    }
}
