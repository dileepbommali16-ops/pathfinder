package com.pathfinder.backend;

import java.util.*;

/**
 * Pathfinder 2.0 — Java Enterprise Backend Service
 * High-performance Java placement intelligence microservice.
 */
public class PathfinderService {

    public static class PredictionRequest {
        public double cgpa;
        public String branch;
        public int internships;
        public int projects;
        public int dsaScore;
        public int backlogs;

        public PredictionRequest(double cgpa, String branch, int internships, int projects, int dsaScore, int backlogs) {
            this.cgpa = cgpa;
            this.branch = branch;
            this.internships = internships;
            this.projects = projects;
            this.dsaScore = dsaScore;
            this.backlogs = backlogs;
        }
    }

    public static class PredictionResult {
        public double probability;
        public String tier;
        public String salaryBand;
        public String serviceEngine;

        public PredictionResult(double probability, String tier, String salaryBand) {
            this.probability = probability;
            this.tier = tier;
            this.salaryBand = salaryBand;
            this.serviceEngine = "Java 17 / 21 Enterprise Core";
        }
    }

    public PredictionResult predictPlacement(PredictionRequest req) {
        // Validation checks
        if (req.cgpa < 0.0 || req.cgpa > 10.0) {
            throw new IllegalArgumentException("CGPA must be between 0.0 and 10.0");
        }
        if (req.backlogs < 0) {
            throw new IllegalArgumentException("Backlogs cannot be negative");
        }

        // Weighted placement scoring algorithm
        double rawScore = (req.cgpa * 9.5) + (req.internships * 5.0) + (req.projects * 3.5)
                        + (req.dsaScore * 0.15) - (req.backlogs * 12.0);

        double probability = Math.min(0.98, Math.max(0.20, rawScore / 100.0));

        String tier;
        String salaryBand;

        if (probability >= 0.85) {
            tier = "Tier 1 - Product & FAANG";
            salaryBand = "₹14.0 - ₹26.0 LPA";
        } else if (probability >= 0.65) {
            tier = "Tier 2 - Premium Product / High Growth";
            salaryBand = "₹8.0 - ₹14.0 LPA";
        } else {
            tier = "Tier 3 - IT Services / Core";
            salaryBand = "₹4.5 - ₹8.0 LPA";
        }

        return new PredictionResult(Math.round(probability * 1000.0) / 1000.0, tier, salaryBand);
    }

    public Map<String, Object> getHealthStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "healthy");
        status.put("runtime", "Java Enterprise Virtual Machine (JVM)");
        status.put("service", "Pathfinder 2.0 Java Microservice");
        status.put("active_threads", Thread.activeCount());
        status.put("timestamp", System.currentTimeMillis());
        return status;
    }

    public static void main(String[] args) {
        PathfinderService service = new PathfinderService();
        System.out.println("[Pathfinder Java Service] Initializing JVM Microservice...");
        PredictionResult res = service.predictPlacement(new PredictionRequest(8.8, "CSE", 2, 3, 85, 0));
        System.out.println("Java Placement Prediction: " + (res.probability * 100) + "% | " + res.tier + " | " + res.salaryBand);
    }
}
