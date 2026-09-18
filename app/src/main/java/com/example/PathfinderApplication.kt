package com.example

import android.app.Application
import com.example.data.local.PathfinderDatabase
import com.example.data.repository.PlacementRepository

class PathfinderApplication : Application() {
    val database: PathfinderDatabase by lazy {
        PathfinderDatabase.getDatabase(this)
    }

    val repository: PlacementRepository by lazy {
        PlacementRepository(database, this)
    }
}
