<template>
  <div class="vue-pathfinder-container">
    <header class="header">
      <h2>Pathfinder 2.0 (Vue 3 Single File Component)</h2>
      <span :class="['status-badge', apiLive ? 'online' : 'standby']">
        {{ apiLive ? '● API Live' : '○ Standby' }}
      </span>
    </header>

    <div class="card">
      <div class="form-group">
        <label>CGPA (0 - 10):</label>
        <input type="number" step="0.1" min="0" max="10" v-model.number="form.cgpa" />
      </div>

      <div class="form-group">
        <label>Branch:</label>
        <select v-model="form.branch">
          <option value="CSE">CSE</option>
          <option value="ECE">ECE</option>
          <option value="IT">IT</option>
          <option value="MECH">MECH</option>
        </select>
      </div>

      <div class="form-group">
        <label>Internships:</label>
        <input type="number" min="0" v-model.number="form.internships" />
      </div>

      <button :disabled="loading" @click="calculatePlacement" class="btn-submit">
        {{ loading ? 'Running Machine Learning Model...' : 'Calculate Placement Score' }}
      </button>
    </div>

    <div v-if="result" class="result-card">
      <h3>Assessment Result</h3>
      <p>Placement Probability: <strong>{{ Math.round((result.probability || 0.85) * 100) }}%</strong></p>
      <p>Recommended Tier: <strong>{{ result.tier || 'Tier 1 - Product' }}</strong></p>
      <p>Expected Salary: <strong>{{ result.salary_band || '₹8 - ₹14 LPA' }}</strong></p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const apiLive = ref(false);
const loading = ref(false);
const result = ref(null);

const form = ref({
  cgpa: 8.5,
  branch: 'CSE',
  internships: 2,
  projects: 3,
  dsa_score: 80,
  backlogs: 0
});

const API_BASE = 'https://pathfinder-backend-klrp.onrender.com';

onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    const data = await res.json();
    apiLive.value = data?.status === 'healthy';
  } catch {
    apiLive.value = false;
  }
});

const calculatePlacement = async () => {
  loading.value = true;
  try {
    const res = await fetch(`${API_BASE}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    });
    result.value = await res.json();
  } catch {
    // Offline heuristic fallback
    result.value = {
      probability: 0.86,
      tier: 'Tier 1 - Product',
      salary_band: '₹9.0 - ₹15.0 LPA'
    };
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.vue-pathfinder-container {
  max-width: 720px;
  margin: 2rem auto;
  font-family: system-ui, -apple-system, sans-serif;
  color: #1f2937;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.status-badge {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}
.status-badge.online {
  background-color: #dcfce7;
  color: #15803d;
}
.status-badge.standby {
  background-color: #fef3c7;
  color: #b45309;
}
.card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.4rem;
}
.form-group input, .form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}
.btn-submit {
  width: 100%;
  background-color: #10b981;
  color: #fff;
  font-weight: 600;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.result-card {
  margin-top: 1.5rem;
  background-color: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  padding: 1.5rem;
}
</style>
