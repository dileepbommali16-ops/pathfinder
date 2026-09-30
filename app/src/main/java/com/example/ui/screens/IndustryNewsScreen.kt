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
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.SuggestionChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.AmberWarning
import com.example.ui.theme.CardBorder
import com.example.ui.theme.CyanAccent
import com.example.ui.theme.DarkBackground
import com.example.ui.theme.DarkSurface
import com.example.ui.theme.DarkSurfaceVariant
import com.example.ui.theme.EmeraldPrimary
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.theme.VioletAccent
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

data class IndustryNewsArticle(
    val id: String,
    val title: String,
    val source: String,
    val pubDate: String,
    val snippet: String,
    val category: String,
    val keyTakeaway: String,
    val placementTip: String,
    val skills: List<String>
)

@Composable
fun IndustryNewsScreen(
    onConsultCoach: ((String) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val coroutineScope = rememberCoroutineScope()
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("All") }
    var isRefreshing by remember { mutableStateOf(false) }
    val savedIds = remember { mutableStateListOf<String>() }

    val categories = listOf(
        "All",
        "Campus Placements",
        "Tech Hiring",
        "DSA & Rounds",
        "Internships & PPOs",
        "AI & Cloud Skills"
    )

    val articles = remember {
        mutableStateListOf(
            IndustryNewsArticle(
                id = "art-1",
                title = "Engineering Colleges Report Surge in Product-Based Campus Placement Offers for 2025-2026 Batch",
                source = "The Economic Times",
                pubDate = "4h ago",
                snippet = "Tier-1 and Tier-2 engineering campuses observe an uptick in specialized technical roles with early pre-placement offers increasing by 28% across major branches.",
                category = "Campus Placements",
                keyTakeaway = "Early campus drives prioritize consistent problem-solving and open-source contributions over theoretical knowledge.",
                placementTip = "Begin mock technical interviews at least 6 weeks before campus drive season opens to build composure.",
                skills = listOf("DSA", "System Design", "Mock Interviews", "Algorithms")
            ),
            IndustryNewsArticle(
                id = "art-2",
                title = "Top IT Firms Elevate Fresher Salary Bands for Candidates Demonstrating Generative AI Competency",
                source = "Livemint",
                pubDate = "8h ago",
                snippet = "Recruiters report offering 30% higher compensation packages for engineering graduates who can demonstrate practical implementation of LLMs and cloud pipelines.",
                category = "AI & Cloud Skills",
                keyTakeaway = "Generic resume bullet points are being discarded in favor of demonstrable AI tooling and real-world system architecture projects.",
                placementTip = "Deploy at least one full-stack project utilizing modern LLM APIs (Gemini/Claude) with rate limiting and database caching.",
                skills = listOf("Generative AI", "Gemini API", "Python", "Docker", "Cloud APIs")
            ),
            IndustryNewsArticle(
                id = "art-3",
                title = "Online Assessment Trends: Top 5 DSA Patterns Dominating First-Round Technical Screenings",
                source = "GeeksforGeeks News",
                pubDate = "14h ago",
                snippet = "Analysis of 500+ campus screening tests reveals that Sliding Window, Binary Search variations, and Breadth-First Search comprise over 60% of test questions.",
                category = "DSA & Rounds",
                keyTakeaway = "Mastery of recurring algorithmic patterns is significantly more effective than randomly grinding hundreds of unrelated problems.",
                placementTip = "Group your DSA study by problem archetypes rather than individual problem numbers to quickly recognize patterns during timed OAs.",
                skills = listOf("Sliding Window", "Binary Search", "BFS/DFS", "HashMaps")
            ),
            IndustryNewsArticle(
                id = "art-4",
                title = "Startup Ecosystem Ramps Up Off-Campus Hiring for Full-Stack and DevOps Freshers",
                source = "YourStory",
                pubDate = "1d ago",
                snippet = "High-growth fintech and SaaS startups are bypassing rigid CGPA cutoffs to hire engineering graduates with verified GitHub project track records.",
                category = "Internships & PPOs",
                keyTakeaway = "Off-campus opportunities remain abundant for candidates with verifiable live deployments, clean codebases, and strong API fundamentals.",
                placementTip = "Publish live demo links for every resume project alongside well-documented GitHub READMEs and architectural diagrams.",
                skills = listOf("React", "Node.js", "PostgreSQL", "CI/CD", "Tailwind CSS")
            ),
            IndustryNewsArticle(
                id = "art-5",
                title = "Campus Recruiters Mandate Behavioral STAR Responses in HR and Managerial Interview Rounds",
                source = "NDTV Education",
                pubDate = "2d ago",
                snippet = "Interview panels emphasize that articulate communication, conflict resolution, and structured STAR storytelling account for up to 40% of final selection scores.",
                category = "Tech Hiring",
                keyTakeaway = "High coding skills alone are insufficient if you cannot clearly articulate technical trade-offs and team collaboration scenarios.",
                placementTip = "Prepare 4 structured STAR stories: technical failure, team conflict, deadline crunch, and leadership initiative.",
                skills = listOf("STAR Method", "HR Round", "Verbal Comm", "Teamwork")
            )
        )
    }

    val filteredArticles = articles.filter { article ->
        val matchesCategory = selectedCategory == "All" || article.category == selectedCategory
        val matchesQuery = searchQuery.isBlank() ||
                article.title.contains(searchQuery, ignoreCase = true) ||
                article.snippet.contains(searchQuery, ignoreCase = true) ||
                article.skills.any { it.contains(searchQuery, ignoreCase = true) }
        matchesCategory && matchesQuery
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(horizontal = 16.dp, vertical = 20.dp)
            .testTag("industry_news_screen"),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header Section
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(CyanAccent.copy(alpha = 0.12f))
                            .border(1.dp, CyanAccent.copy(alpha = 0.3f), RoundedCornerShape(20.dp))
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Public,
                            contentDescription = "Google Search",
                            tint = CyanAccent,
                            modifier = Modifier.size(13.dp)
                        )
                        Text(
                            text = "Google Search API & Live News Feed",
                            color = CyanAccent,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    IconButton(
                        onClick = {
                            coroutineScope.launch {
                                isRefreshing = true
                                delay(1200)
                                isRefreshing = false
                            }
                        },
                        modifier = Modifier.size(36.dp)
                    ) {
                        if (isRefreshing) {
                            CircularProgressIndicator(
                                strokeWidth = 2.dp,
                                color = CyanAccent,
                                modifier = Modifier.size(18.dp)
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Refresh",
                                tint = TextSecondary
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Industry Hiring Trends",
                    color = TextPrimary,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black
                )
                Text(
                    text = "Latest campus placement intelligence, recruiter requirements, and high-yield tips for BTech engineers.",
                    color = TextMuted,
                    fontSize = 12.sp,
                    lineHeight = 16.sp
                )
            }
        }

        // Search Bar
        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search trends, skills, or companies...", fontSize = 12.sp, color = TextMuted) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextMuted, modifier = Modifier.size(18.dp)) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .testTag("news_search_input"),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = CyanAccent,
                    unfocusedBorderColor = CardBorder,
                    focusedContainerColor = DarkSurface,
                    unfocusedContainerColor = DarkSurface,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                singleLine = true
            )
        }

        // Category Filter Chips
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                categories.forEach { category ->
                    val isSelected = selectedCategory == category
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isSelected) CyanAccent.copy(alpha = 0.2f) else DarkSurface)
                            .border(
                                width = 1.dp,
                                color = if (isSelected) CyanAccent else CardBorder,
                                shape = RoundedCornerShape(12.dp)
                            )
                            .clickable { selectedCategory = category }
                            .padding(horizontal = 12.dp, vertical = 7.dp)
                    ) {
                        Text(
                            text = category,
                            color = if (isSelected) CyanAccent else TextMuted,
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                        )
                    }
                }
            }
        }

        // Macro Highlight Barometer Card
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(DarkSurface)
                    .border(1.dp, EmeraldPrimary.copy(alpha = 0.25f), RoundedCornerShape(20.dp))
                    .padding(16.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.TrendingUp,
                            contentDescription = null,
                            tint = EmeraldPrimary,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = "2025/2026 Campus Hiring Barometer",
                            color = EmeraldPrimary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = "Recruiters are placing a 35% premium on candidates with deployed AI API projects and proven pattern mastery in DSA (Sliding Window, Binary Search, Trees) over pure CGPA memorization.",
                        color = TextPrimary,
                        fontSize = 12.sp,
                        lineHeight = 17.sp
                    )
                }
            }
        }

        // News Articles List
        items(filteredArticles) { article ->
            val isSaved = savedIds.contains(article.id)

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(DarkSurface)
                    .border(1.dp, CardBorder, RoundedCornerShape(20.dp))
                    .padding(16.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    // Source & Category Bar
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(CyanAccent.copy(alpha = 0.15f))
                                    .padding(horizontal = 7.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = article.category,
                                    color = CyanAccent,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Text(
                                text = "·  ${article.source}  ·  ${article.pubDate}",
                                color = TextMuted,
                                fontSize = 11.sp
                            )
                        }

                        IconButton(
                            onClick = {
                                if (isSaved) savedIds.remove(article.id) else savedIds.add(article.id)
                            },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(
                                imageVector = if (isSaved) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                                contentDescription = "Save",
                                tint = if (isSaved) AmberWarning else TextMuted,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    // Article Title & Snippet
                    Text(
                        text = article.title,
                        color = TextPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        lineHeight = 20.sp
                    )

                    Text(
                        text = article.snippet,
                        color = TextSecondary,
                        fontSize = 12.sp,
                        lineHeight = 16.sp
                    )

                    // Dual Insights: Takeaway & Tip
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(DarkSurfaceVariant)
                            .border(1.dp, CardBorder.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.Top,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Lightbulb,
                                contentDescription = null,
                                tint = AmberWarning,
                                modifier = Modifier.size(15.dp)
                            )
                            Column {
                                Text(
                                    text = "Key Takeaway",
                                    color = AmberWarning,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = article.keyTakeaway,
                                    color = TextPrimary,
                                    fontSize = 11.sp,
                                    lineHeight = 15.sp
                                )
                            }
                        }

                        Row(
                            verticalAlignment = Alignment.Top,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Code,
                                contentDescription = null,
                                tint = EmeraldPrimary,
                                modifier = Modifier.size(15.dp)
                            )
                            Column {
                                Text(
                                    text = "Actionable Placement Tip",
                                    color = EmeraldPrimary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = article.placementTip,
                                    color = TextPrimary,
                                    fontSize = 11.sp,
                                    lineHeight = 15.sp
                                )
                            }
                        }
                    }

                    // Skills Tags
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        article.skills.forEach { skill ->
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(DarkSurfaceVariant)
                                    .border(1.dp, CardBorder, RoundedCornerShape(6.dp))
                                    .padding(horizontal = 7.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = skill,
                                    color = TextMuted,
                                    fontSize = 10.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
