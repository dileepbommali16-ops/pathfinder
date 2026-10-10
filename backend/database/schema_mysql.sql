-- =====================================================================
-- Pathfinder 2.0 — Production MySQL Relational Database Schema
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =====================================================================

CREATE DATABASE IF NOT EXISTS pathfinder_production
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pathfinder_production;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(128) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(32) NOT NULL DEFAULT 'student',
    auth_provider VARCHAR(32) NOT NULL DEFAULT 'credentials',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    branch VARCHAR(64) NOT NULL,
    year INT NOT NULL,
    cgpa DECIMAL(4, 2) NOT NULL,
    backlogs INT NOT NULL DEFAULT 0,
    technical_skills TEXT,
    career_goals TEXT,
    target_tier VARCHAR(64) DEFAULT 'Tier 1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_profile_branch_year (branch, year),
    INDEX idx_profile_cgpa (cgpa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Historical Cohort Placements (972 Student Records)
CREATE TABLE IF NOT EXISTS cohort_placements (
    student_id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    branch VARCHAR(64) NOT NULL,
    grad_year INT NOT NULL,
    cgpa DECIMAL(4, 2) NOT NULL,
    internships INT NOT NULL DEFAULT 0,
    projects INT NOT NULL DEFAULT 0,
    dsa_score INT NOT NULL DEFAULT 70,
    placement_status ENUM('Placed', 'In-Process', 'Opted-Out') NOT NULL DEFAULT 'Placed',
    company_name VARCHAR(128),
    ctc_lpa DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    tier VARCHAR(64) NOT NULL DEFAULT 'Tier 2',
    INDEX idx_cohort_branch (branch),
    INDEX idx_cohort_year (grad_year),
    INDEX idx_cohort_filter (branch, grad_year, placement_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Session & Token Revocation Store
CREATE TABLE IF NOT EXISTS revoked_tokens (
    token_hash VARCHAR(64) PRIMARY KEY,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_token_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
