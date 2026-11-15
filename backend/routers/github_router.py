"""
APIs & Fraud Shield: Authentic GitHub Repository & Profile Auditor
Audits real GitHub repositories (specific project URLs) and user profiles via the
official GitHub REST API with Senior Engineering Manager calibration.
Never fabricates fake green scores when a repository is small or GitHub is unreachable.
"""

import os
import re
import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Body, HTTPException

github_router = APIRouter(tags=["GitHub Verification & Fraud Shield"])


def parse_github_target(raw_input: str) -> Tuple[str, str, Optional[str]]:
    """
    Parses a GitHub username, profile URL, owner/repo shorthand, or repository URL.
    Returns: (mode: "repo" | "profile", owner: str, repo: Optional[str])
    """
    cleaned = (raw_input or "").strip()
    if not cleaned:
        raise ValueError("Please enter a GitHub username, profile URL, or repository URL.")

    if cleaned.startswith("@"):
        cleaned = cleaned[1:].strip()

    # Handle full URLs (with or without scheme)
    if "github.com" in cleaned.lower():
        if not re.match(r"^https?://", cleaned, flags=re.IGNORECASE):
            cleaned = f"https://{cleaned}"
        parsed = urlparse(cleaned)
        if "github.com" not in (parsed.netloc or "").lower():
            raise ValueError("Please enter a valid github.com URL or username.")
        parts = [p for p in parsed.path.split("/") if p]
        if not parts:
            raise ValueError("GitHub URL must include a username or owner/repository path.")
        owner = parts[0]
        reserved = {"topics", "explore", "marketplace", "settings", "orgs", "features", "pricing", "login", "signup"}
        if owner.lower() in reserved:
            raise ValueError("Please enter your personal GitHub profile or project repository URL.")
        if len(parts) >= 2:
            repo_name = re.sub(r"\.git$", "", parts[1], flags=re.IGNORECASE)
            if repo_name and repo_name.lower() not in {"repositories", "stars", "followers", "following", "projects"}:
                return "repo", owner, repo_name
        return "profile", owner, None

    # Handle owner/repo shorthand
    if "/" in cleaned:
        parts = [p for p in cleaned.split("/") if p]
        if len(parts) >= 2 and re.match(r"^[A-Za-z0-9_.-]+$", parts[0]):
            repo_name = re.sub(r"\.git$", "", parts[1], flags=re.IGNORECASE)
            return "repo", parts[0], repo_name

    # Plain username
    if not re.match(r"^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$", cleaned):
        raise ValueError("Invalid GitHub handle format. Enter a username or https://github.com/user/repo URL.")

    return "profile", cleaned, None


def _github_headers() -> Dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "Pathfinder-Senior-Audit/2.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = (os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _days_since(iso_ts: Optional[str]) -> Optional[int]:
    if not iso_ts:
        return None
    try:
        dt = datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
        delta = datetime.now(timezone.utc) - dt
        return max(0, delta.days)
    except Exception:
        return None


def _analyze_commit_messages(commits: List[Dict[str, Any]]) -> Tuple[int, int, float]:
    """Returns (commit_count, distinct_active_days, trivial_ratio)."""
    if not isinstance(commits, list) or not commits:
        return 0, 0, 1.0

    trivial_patterns = re.compile(
        r"^(initial\s*commit|first\s*commit|init|update|updates|fix|fixed|test|upload|add\s+files?\s+via\s+upload|create\s+\S+|update\s+\S+|delete\s+\S+|readme)$",
        re.IGNORECASE,
    )
    active_days = set()
    trivial = 0
    for c in commits:
        msg = ((c.get("commit") or {}).get("message") or "").splitlines()[0].strip()
        if not msg or len(msg) < 8 or trivial_patterns.match(msg):
            trivial += 1
        date_str = ((c.get("commit") or {}).get("author") or {}).get("date") or ""
        if len(date_str) >= 10:
            active_days.add(date_str[:10])

    return len(commits), len(active_days), round(trivial / max(len(commits), 1), 2)


async def _audit_single_repo(client: httpx.AsyncClient, owner: str, repo: str) -> Dict[str, Any]:
    repo_resp = await client.get(f"https://api.github.com/repos/{owner}/{repo}")
    if repo_resp.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail=f"Repository '{owner}/{repo}' was not found or is private. Public repositories are required for technical audit.",
        )
    if repo_resp.status_code in (403, 429):
        raise HTTPException(
            status_code=503,
            detail="GitHub API rate limit reached while inspecting repository. Please retry in a minute (no fake score generated).",
        )
    if repo_resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"GitHub returned HTTP {repo_resp.status_code} while inspecting '{owner}/{repo}'.",
        )

    repo_data = repo_resp.json()
    is_fork = bool(repo_data.get("fork"))
    size_kb = int(repo_data.get("size") or 0)
    stars = int(repo_data.get("stargazers_count") or 0)
    forks = int(repo_data.get("forks_count") or 0)
    pushed_days = _days_since(repo_data.get("pushed_at"))
    created_at = repo_data.get("created_at") or ""
    description = (repo_data.get("description") or "").strip()
    topics = repo_data.get("topics") or []
    owner_info = repo_data.get("owner") or {}

    # Parallel real inspection calls
    import asyncio
    lang_task = client.get(f"https://api.github.com/repos/{owner}/{repo}/languages")
    commits_task = client.get(f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=30")
    contents_task = client.get(f"https://api.github.com/repos/{owner}/{repo}/contents")
    readme_task = client.get(f"https://api.github.com/repos/{owner}/{repo}/readme")

    lang_resp, commits_resp, contents_resp, readme_resp = await asyncio.gather(
        lang_task, commits_task, contents_task, readme_task, return_exceptions=True
    )

    # 1. Real Language Bytes Breakdown
    top_languages: List[Dict[str, Any]] = []
    if isinstance(lang_resp, httpx.Response) and lang_resp.status_code == 200:
        lang_bytes = lang_resp.json() or {}
        total_bytes = sum(v for v in lang_bytes.values() if isinstance(v, (int, float)))
        if total_bytes > 0:
            top_languages = [
                {"name": k, "percentage": max(1, round((v / total_bytes) * 100))}
                for k, v in sorted(lang_bytes.items(), key=lambda x: x[1], reverse=True)[:5]
            ]
    if not top_languages and repo_data.get("language"):
        top_languages = [{"name": repo_data["language"], "percentage": 100}]

    # 2. Real Commits & Active Days
    commits_sampled = 0
    distinct_days = 0
    trivial_ratio = 1.0
    if isinstance(commits_resp, httpx.Response) and commits_resp.status_code == 200:
        commits_sampled, distinct_days, trivial_ratio = _analyze_commit_messages(commits_resp.json())

    # 3. Root Directory Structure & Engineering Signals
    root_files: List[str] = []
    if isinstance(contents_resp, httpx.Response) and contents_resp.status_code == 200:
        raw_contents = contents_resp.json()
        if isinstance(raw_contents, list):
            root_files = [str(item.get("name", "")).lower() for item in raw_contents if item.get("name")]

    has_readme = any(f.startswith("readme") for f in root_files)
    has_tests = any(
        any(tok in f for tok in ("test", "tests", "spec", "__tests__", "pytest", "vitest", "jest", "cypress"))
        for f in root_files
    )
    has_docker = any("docker" in f for f in root_files)
    has_ci = ".github" in root_files or any(f in root_files for f in (".gitlab-ci.yml", ".travis.yml", "jenkinsfile"))
    has_manifest = any(
        f in root_files
        for f in (
            "package.json",
            "requirements.txt",
            "pyproject.toml",
            "setup.py",
            "pom.xml",
            "build.gradle",
            "go.mod",
            "cargo.toml",
        )
    )
    is_notebook_or_streamlit_only = (
        size_kb < 120
        and len(root_files) <= 6
        and not has_tests
        and not has_docker
        and (
            any(f.endswith(".ipynb") for f in root_files)
            or any(l["name"].lower() in ("jupyter notebook", "python", "html") for l in top_languages)
        )
    )

    # 4. README Word Count
    readme_words = 0
    if isinstance(readme_resp, httpx.Response) and readme_resp.status_code == 200:
        has_readme = True
        import base64
        content_b64 = (readme_resp.json() or {}).get("content") or ""
        try:
            decoded = base64.b64decode(content_b64).decode("utf-8", errors="ignore")
            readme_words = len(re.findall(r"\b\w+\b", decoded))
        except Exception:
            readme_words = 0

    # --- Senior Engineering Manager Rubric (0-100, Zero Flattery) ---
    score = 12
    strengths: List[str] = []
    gaps: List[str] = []

    if not is_fork:
        score += 10
        strengths.append(f"Original repository owned by @{owner} (not a blind fork).")
    else:
        gaps.append("Repository is a fork — recruiters weigh original architecture far higher than forked starter repos.")

    # Scope & Modularity
    if size_kb >= 500 and len(root_files) >= 6:
        score += 18
        strengths.append(f"Multi-file codebase ({len(root_files)} root entries, {size_kb} KB) showing structured modular separation.")
    elif size_kb >= 80 and len(root_files) >= 4:
        score += 11
        strengths.append(f"Moderate project scope ({len(root_files)} root files, {size_kb} KB).")
    elif size_kb >= 15:
        score += 5
        gaps.append(f"Small prototype footprint ({size_kb} KB, {len(root_files)} root entries) — insufficient architectural depth for Tier-1 SDE evaluation.")
    else:
        score += 1
        gaps.append(f"Tiny/starter script footprint ({size_kb} KB, {len(root_files)} root items) — resembles a single-script demo or incomplete upload.")

    # Commit Discipline
    if commits_sampled >= 15 and distinct_days >= 4 and trivial_ratio < 0.65:
        score += 16
        strengths.append(f"Iterative commit hygiene ({commits_sampled} recent commits across {distinct_days} active days).")
    elif commits_sampled >= 5 and distinct_days >= 2:
        score += 8
        if trivial_ratio >= 0.65:
            gaps.append(f"{int(trivial_ratio * 100)}% of sampled commits use generic messages ('Add files via upload'/'update') — adopt feature branches and atomic commits.")
    else:
        score += 2
        gaps.append(f"Minimal commit history ({commits_sampled} commit(s) across {max(1, distinct_days)} day) — web-uploaded/single-commit repos raise authenticity doubts.")

    # Documentation
    if has_readme and readme_words >= 180:
        score += 12
        strengths.append(f"Comprehensive README documentation ({readme_words} words) aiding reviewer onboarding.")
    elif has_readme and readme_words >= 40:
        score += 6
        gaps.append(f"Thin README ({readme_words} words) — add architecture diagram, API endpoints, setup steps, and benchmark metrics.")
    else:
        gaps.append("Missing or empty README.md — hiring managers typically skip undocumented repositories within 10 seconds.")

    # Engineering Hygiene (Tests, Docker, CI, Dependencies)
    if has_tests:
        score += 13
        strengths.append("Includes automated test suite/specs in repository root.")
    else:
        gaps.append("No automated unit/integration test folder (`tests/` or `*.spec.*`) found — major deduction in Senior Engineering review.")

    if has_docker:
        score += 7
        strengths.append("Containerized with Dockerfile/Compose for reproducible deployment.")
    else:
        gaps.append("No Dockerfile or container setup — add Dockerization + deployed live demo URL to prove production readiness.")

    if has_ci:
        score += 6
        strengths.append("Automated CI workflow configuration detected (`.github/workflows`).")
    else:
        gaps.append("Missing CI pipeline (GitHub Actions lint + test workflow).")

    if has_manifest:
        score += 4
    else:
        gaps.append("Missing pinned dependency manifest (`requirements.txt`, `pyproject.toml`, or `package.json`).")

    if stars >= 10 or forks >= 3:
        score += 8
        strengths.append(f"External developer validation ({stars} stars, {forks} forks).")
    elif stars > 0:
        score += 3

    if is_notebook_or_streamlit_only:
        score = min(score, 48)
        gaps.append("Structured as a lightweight notebook/Streamlit prototype rather than a scalable API + typed frontend + test-backed service.")

    if not description:
        gaps.append("Missing GitHub repository description and topic tags.")

    authenticity_score = max(12, min(96, int(round(score))))
    is_verified = authenticity_score >= 62 and not is_fork and commits_sampled >= 4

    if authenticity_score >= 78:
        verdict = (
            f"Production-Caliber Repository ({owner}/{repo}): Strong multi-file architecture, test/build hygiene, "
            "and verifiable commit discipline suitable for Tier-1 interviews."
        )
    elif authenticity_score >= 55:
        verdict = (
            f"Developing Engineering Project ({owner}/{repo}): Real source repo detected, but missing key production signals "
            "(automated tests, Docker/CI, or deeper commit cadence) needed for senior shortlists."
        )
    else:
        verdict = (
            f"Starter / Small Prototype Audit ({owner}/{repo}): Honest Tier-1 verdict — too small or light on engineering rigor "
            "(tests, modular API architecture, README depth, multi-day commits) to carry a technical resume alone."
        )

    return {
        "mode": "repo",
        "username": owner,
        "repoName": repo,
        "repoFullName": repo_data.get("full_name") or f"{owner}/{repo}",
        "repoUrl": repo_data.get("html_url") or f"https://github.com/{owner}/{repo}",
        "avatarUrl": owner_info.get("avatar_url") or f"https://github.com/{owner}.png",
        "name": repo_data.get("full_name") or f"{owner}/{repo}",
        "bio": description or f"Repository in @{owner}'s GitHub portfolio (no description provided).",
        "publicRepos": 1,
        "totalStars": stars,
        "forks": forks,
        "followers": 0,
        "topLanguages": top_languages,
        "authenticityScore": authenticity_score,
        "isVerified": is_verified,
        "verdict": verdict,
        "accountAgeYears": max(1, (datetime.now().year - int(created_at[:4])) if created_at[:4].isdigit() else 1),
        "strengths": strengths or ["Repository exists publicly and code languages were verified directly from GitHub."],
        "gaps": gaps,
        "repoMetrics": {
            "sizeKb": size_kb,
            "commitsSampled": commits_sampled,
            "distinctCommitDays": distinct_days,
            "fileCount": len(root_files),
            "readmeWords": readme_words,
            "hasTests": has_tests,
            "hasDocker": has_docker,
            "hasCi": has_ci,
            "hasManifest": has_manifest,
            "isFork": is_fork,
            "lastPushedDaysAgo": pushed_days,
            "topicsCount": len(topics),
        },
    }


async def _audit_user_profile(client: httpx.AsyncClient, username: str) -> Dict[str, Any]:
    user_resp = await client.get(f"https://api.github.com/users/{username}")
    if user_resp.status_code == 404:
        raise HTTPException(status_code=404, detail=f"GitHub user '@{username}' was not found.")
    if user_resp.status_code in (403, 429):
        raise HTTPException(
            status_code=503,
            detail="GitHub API rate limit reached right now. Please wait a minute and retry — no fake score generated.",
        )
    if user_resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"GitHub returned HTTP {user_resp.status_code} for '@{username}'.")

    user_data = user_resp.json()
    repos_resp = await client.get(f"https://api.github.com/users/{username}/repos?per_page=30&sort=pushed")
    repos_data = repos_resp.json() if repos_resp.status_code == 200 and isinstance(repos_resp.json(), list) else []

    total_stars = 0
    non_fork_repos = []
    nontrivial_repos = 0
    documented_repos = 0
    recent_pushes = 0
    lang_counts: Dict[str, int] = {}

    for repo in repos_data:
        total_stars += int(repo.get("stargazers_count") or 0)
        if not repo.get("fork"):
            non_fork_repos.append(repo)
            if int(repo.get("size") or 0) >= 35:
                nontrivial_repos += 1
            if (repo.get("description") or "").strip():
                documented_repos += 1
            days_ago = _days_since(repo.get("pushed_at"))
            if days_ago is not None and days_ago <= 120:
                recent_pushes += 1
        lang = repo.get("language")
        if lang and not repo.get("fork"):
            lang_counts[lang] = lang_counts.get(lang, 0) + max(1, int(repo.get("size") or 1))

    total_lang_weight = sum(lang_counts.values())
    top_languages = (
        [
            {"name": k, "percentage": max(1, round((v / total_lang_weight) * 100))}
            for k, v in sorted(lang_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
        if total_lang_weight > 0
        else []
    )

    # Check commit activity of top pushed non-fork repo (honest signal!)
    top_repo_commits = 0
    top_repo_days = 0
    top_repo_name = ""
    if non_fork_repos:
        candidate = max(non_fork_repos, key=lambda r: int(r.get("size") or 0))
        top_repo_name = candidate.get("name") or ""
        try:
            c_resp = await client.get(f"https://api.github.com/repos/{username}/{top_repo_name}/commits?per_page=20")
            if c_resp.status_code == 200:
                top_repo_commits, top_repo_days, _ = _analyze_commit_messages(c_resp.json())
        except Exception:
            pass

    created_year = int((user_data.get("created_at") or "2024")[:4])
    account_age_years = max(1, datetime.now().year - created_year)
    total_repos = int(user_data.get("public_repos") or len(repos_data))
    followers = int(user_data.get("followers") or 0)

    # Honest Senior Manager Scoring
    score = 15
    strengths: List[str] = []
    gaps: List[str] = []

    if len(non_fork_repos) >= 6:
        score += 18
        strengths.append(f"{len(non_fork_repos)} original non-fork repositories inspected.")
    elif len(non_fork_repos) >= 2:
        score += 10
        strengths.append(f"{len(non_fork_repos)} original repositories found.")
    elif len(non_fork_repos) == 1:
        score += 5
        gaps.append("Only 1 original repository — build and deploy 2–3 substantial end-to-end systems.")
    else:
        gaps.append("Zero original non-fork repositories found — recruiters filter out fork-only GitHub profiles.")

    if nontrivial_repos >= 3:
        score += 16
        strengths.append(f"{nontrivial_repos} non-trivial codebase(s) (>=35 KB) present beyond tiny starter scripts.")
    elif nontrivial_repos >= 1:
        score += 8
        gaps.append(f"Only {nontrivial_repos} substantial repository (>=35 KB); other repos appear minimal/starter-sized.")
    else:
        gaps.append("Repositories are very small (<35 KB each) — add full backend + database + test projects.")

    if top_repo_commits >= 12 and top_repo_days >= 3:
        score += 16
        strengths.append(f"Flagship repo `{top_repo_name}` shows {top_repo_commits} sampled commits over {top_repo_days} days.")
    elif top_repo_commits >= 4:
        score += 7
        gaps.append(f"Commit cadence in flagship repo `{top_repo_name}` is light ({top_repo_commits} commit(s)); avoid single-upload dumps.")
    else:
        gaps.append("Low commit depth on public repositories — push incremental commits while building features & tests.")

    if recent_pushes >= 2:
        score += 12
        strengths.append(f"Active coding footprint ({recent_pushes} repositories pushed in the last 120 days).")
    elif recent_pushes == 1:
        score += 6
    else:
        gaps.append("No repository updates in the last 4 months — maintain steady weekly GitHub activity before placements.")

    if documented_repos >= 3:
        score += 10
        strengths.append(f"{documented_repos} repositories include clear summaries/descriptions.")
    else:
        gaps.append("Most repositories lack descriptions or architecture READMEs — tip: paste a specific project URL above for a deep repo audit.")

    if total_stars >= 10:
        score += 8
        strengths.append(f"Community traction across repos ({total_stars} total stars).")
    elif total_stars > 0:
        score += 3

    if not top_languages:
        gaps.append("No primary programming languages detected across original public repos.")

    authenticity_score = max(12, min(95, int(round(score))))
    is_verified = authenticity_score >= 60 and len(non_fork_repos) >= 2 and nontrivial_repos >= 1

    if authenticity_score >= 76:
        verdict = f"Strong Engineering Footprint (@{user_data.get('login')}): Authentic original repos, active commits, and credible stack depth."
    elif authenticity_score >= 52:
        verdict = f"Developing Portfolio (@{user_data.get('login')}): Real GitHub activity present, but lacks deeper production repos, documentation, or steady commit cadence."
    else:
        verdict = f"Early / Thin GitHub Footprint (@{user_data.get('login')}): Honest hiring verdict — insufficient original production code or recent commits to pass Tier-1 technical screening."

    return {
        "mode": "profile",
        "username": user_data.get("login") or username,
        "name": user_data.get("name") or user_data.get("login") or username,
        "avatarUrl": user_data.get("avatar_url") or f"https://github.com/{username}.png",
        "bio": (user_data.get("bio") or "").strip() or "No GitHub bio configured yet.",
        "publicRepos": total_repos,
        "originalRepos": len(non_fork_repos),
        "nontrivialRepos": nontrivial_repos,
        "totalStars": total_stars,
        "followers": followers,
        "topLanguages": top_languages,
        "authenticityScore": authenticity_score,
        "isVerified": is_verified,
        "verdict": verdict,
        "accountAgeYears": account_age_years,
        "strengths": strengths or ["GitHub account verified live via official GitHub API."],
        "gaps": gaps,
    }


@github_router.post("/api/verify-github")
async def verify_github_footprint(payload: Dict[str, Any] = Body(...)):
    """
    Audits either a specific GitHub repository URL or a GitHub user profile URL/handle
    against Senior Engineering Manager criteria using live GitHub REST API data.
    """
    raw_target = (
        payload.get("url_or_username")
        or payload.get("github_input")
        or payload.get("username")
        or payload.get("url")
        or ""
    )
    try:
        mode, owner, repo = parse_github_target(str(raw_target))
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))

    async with httpx.AsyncClient(headers=_github_headers(), timeout=12.0, follow_redirects=True) as client:
        if mode == "repo" and repo:
            return await _audit_single_repo(client, owner, repo)
        return await _audit_user_profile(client, owner)
