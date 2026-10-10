/**
 * Pathfinder 2.0 — Production MongoDB Collection Schemas & Validators
 * MongoDB NoSQL Document Collections Definition with $jsonSchema validation.
 */

// 1. User Profiles Collection
db.createCollection("user_profiles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "name", "email", "branch", "cgpa"],
      properties: {
        user_id: {
          bsonType: "string",
          description: "Must be a unique user identifier (usr_...)"
        },
        name: {
          bsonType: "string",
          description: "Full student name"
        },
        email: {
          bsonType: "string",
          pattern: "^.+@.+$",
          description: "Valid email address format"
        },
        branch: {
          enum: ["CSE", "ECE", "IT", "MECH", "CIVIL", "EEE", "AIDS"],
          description: "Engineering branch code"
        },
        cgpa: {
          bsonType: ["double", "int"],
          minimum: 0.0,
          maximum: 10.0,
          description: "Cumulative GPA bounded between 0.0 and 10.0"
        },
        backlogs: {
          bsonType: "int",
          minimum: 0,
          description: "Non-negative active backlogs"
        },
        skills: {
          bsonType: "array",
          items: { bsonType: "string" },
          description: "Array of verified technical competencies"
        }
      }
    }
  }
});

// Indexing on User Profiles
db.user_profiles.createIndex({ user_id: 1 }, { unique: true });
db.user_profiles.createIndex({ branch: 1, cgpa: -1 });

// 2. Cohort Placements Collection (972 Historical Records)
db.createCollection("cohort_placements");
db.cohort_placements.createIndex({ student_id: 1 }, { unique: true });
db.cohort_placements.createIndex({ branch: 1, grad_year: 1 });
db.cohort_placements.createIndex({ ctc_lpa: -1 });

// 3. Prediction Telemetry Logs Collection
db.createCollection("prediction_logs", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "minutes"
  }
});
