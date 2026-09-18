package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.example.ui.screens.MainAppScreen
import com.example.ui.theme.PathfinderTheme
import com.example.ui.viewmodel.PlacementViewModel
import com.example.ui.viewmodel.PlacementViewModelFactory

class MainActivity : ComponentActivity() {
    private val viewModel: PlacementViewModel by viewModels {
        val app = application as PathfinderApplication
        PlacementViewModelFactory(app.repository)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PathfinderTheme {
                MainAppScreen(viewModel = viewModel)
            }
        }
    }
}
