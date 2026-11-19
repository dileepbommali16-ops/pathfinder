"""
Pathfinder 2.0 - Universal Multi-Language Sandboxed Compiler Engine
Security-Hardened Architecture:
- ZERO local host code execution (local OS process spawning completely removed so untrusted Python/JS/C code can never read server env vars or filesystem).
- Hardened in-memory SQLite runner with authorizer + progress step cap (`50,000` VM steps).
- Strict payload size limits (`64 KB` code, `16 KB` stdin).
- Isolated Remote Sandbox Tiers:
  1. Compiler Explorer (Godbolt) Official API
  2. Piston Container Sandbox API
  3. Judge0 CE Isolated Sandbox API
"""

import logging
import re
import sqlite3
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger("pathfinder.compiler")

ANSI_ESCAPE = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")
MAX_CODE_CHARS = 65536
MAX_STDIN_CHARS = 16384


def strip_ansi(text: str) -> str:
    """Removes terminal ANSI color codes for clean UI rendering."""
    return ANSI_ESCAPE.sub("", text) if text else ""


GODBOLT_COMPILERS = {
    "c": ("cg132", "c"),
    "cpp": ("g132", "c++"),
    "c++": ("g132", "c++"),
    "rust": ("r1750", "rust"),
    "go": ("g121", "go"),
    "python": ("python311", "python"),
    "py": ("python311", "python"),
    "python3": ("python311", "python"),
    "java": ("java2100", "java"),
    "csharp": ("dotnet80", "csharp"),
    "cs": ("dotnet80", "csharp"),
    "typescript": ("typescript54", "typescript"),
    "ts": ("typescript54", "typescript"),
    "javascript": ("v8_12", "javascript"),
    "js": ("v8_12", "javascript"),
    "node": ("v8_12", "javascript"),
}

PISTON_LANGS = {
    "c": "c",
    "cpp": "c++",
    "c++": "c++",
    "python": "python",
    "py": "python",
    "python3": "python",
    "java": "java",
    "javascript": "javascript",
    "js": "javascript",
    "node": "javascript",
    "typescript": "typescript",
    "ts": "typescript",
    "rust": "rust",
    "go": "go",
    "csharp": "csharp.net",
    "cs": "csharp.net",
}

JUDGE0_LANGUAGE_IDS = {
    "c": 50,
    "cpp": 54,
    "c++": 54,
    "python": 71,
    "py": 71,
    "python3": 71,
    "java": 62,
    "javascript": 63,
    "js": 63,
    "node": 63,
    "typescript": 74,
    "ts": 74,
    "rust": 73,
    "go": 60,
    "csharp": 51,
    "cs": 51,
}


def _sqlite_authorizer(action: int, arg1: Optional[str], arg2: Optional[str], db_name: Optional[str], source: Optional[str]) -> int:
    if action in (sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH, sqlite3.SQLITE_PRAGMA):
        return sqlite3.SQLITE_DENY
    if action == sqlite3.SQLITE_FUNCTION and (arg2 or "").lower() == "load_extension":
        return sqlite3.SQLITE_DENY
    return sqlite3.SQLITE_OK


async def execute_code_live(
    language: str,
    code: str,
    stdin: Optional[str] = "",
    timeout_sec: float = 8.0,
) -> Dict[str, Any]:
    """
    Universal isolated sandbox compiler executor returning clean stdout, stderr, and exit status.
    Never runs user-supplied Python/Node/C/C++ locally on the backend host.
    """
    lang = (language or "python").lower().strip()
    source_code = code or ""
    stdin_str = stdin or ""

    if len(source_code) > MAX_CODE_CHARS or len(stdin_str) > MAX_STDIN_CHARS:
        return {
            "success": False,
            "output": "Code or stdin payload exceeds maximum allowed size.",
            "stderr": "PayloadTooLarge",
            "exit_code": -1,
            "engine": "security-guard",
        }

    # 1. HARDENED IN-MEMORY SQLITE SANDBOX
    if lang in ("sql", "sqlite"):
        conn: Optional[sqlite3.Connection] = None
        try:
            conn = sqlite3.connect(":memory:")
            conn.set_authorizer(_sqlite_authorizer)
            steps = 0

            def _progress_guard() -> int:
                nonlocal steps
                steps += 1
                return 1 if steps > 50 else 0

            # Checked every 1,000 VM opcodes -> caps total query execution at 50,000 VM steps
            conn.set_progress_handler(_progress_guard, 1000)

            cursor = conn.cursor()
            statements = [s.strip() for s in source_code.split(";") if s.strip()]
            output_parts = []

            for stmt in statements:
                cursor.execute(stmt)
                if cursor.description:
                    columns = [d[0] for d in cursor.description]
                    rows = cursor.fetchmany(200)
                    header = " | ".join(columns)
                    separator = "-" * len(header)
                    row_strs = [" | ".join(str(val) for val in row) for row in rows]
                    output_parts.append(f"{header}\n{separator}\n" + "\n".join(row_strs))

            conn.commit()
            final_out = "\n\n".join(output_parts) if output_parts else "SQL statements executed successfully (0 rows returned)."
            return {
                "success": True,
                "output": final_out,
                "stderr": "",
                "exit_code": 0,
                "engine": "hardened-inmemory-sqlite3",
            }
        except Exception as e:
            return {
                "success": False,
                "output": f"SQL Execution Error:\n{str(e)}",
                "stderr": str(e),
                "exit_code": -1,
                "engine": "hardened-inmemory-sqlite3",
            }
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass

    # Sanitize Java: 'public class Main' -> 'class Main' for single-file compilation
    working_code = source_code
    if lang == "java":
        working_code = re.sub(r"\bpublic\s+class\b", "class", working_code)

    # 2. TIER 1 REMOTE SANDBOX: COMPILER EXPLORER (GODBOLT) OFFICIAL API
    compiler_info = GODBOLT_COMPILERS.get(lang) or ("cg132", "c")
    compiler_id, godbolt_lang = compiler_info
    user_args = "-O2" if lang in ("c", "cpp", "c++", "rust") else ""

    payload = {
        "source": working_code,
        "compiler": compiler_id,
        "options": {
            "userArguments": user_args,
            "executeParameters": {"args": [], "stdin": stdin_str},
            "compilerOptions": {"executorRequest": True},
            "filters": {"binary": True, "execute": True},
        },
        "lang": godbolt_lang,
    }

    try:
        async with httpx.AsyncClient(timeout=max(10.0, float(timeout_sec) + 6.0)) as client:
            resp = await client.post(
                f"https://godbolt.org/api/compiler/{compiler_id}/compile",
                json=payload,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
            if resp.status_code == 200:
                data = resp.json()
                stdout_lines = [strip_ansi(item.get("text", "")) for item in data.get("stdout", [])]
                stderr_lines = [strip_ansi(item.get("text", "")) for item in data.get("stderr", [])]
                build_err_lines = [
                    strip_ansi(item.get("text", "")) for item in data.get("buildResult", {}).get("stderr", [])
                ]

                output = "\n".join(stdout_lines).strip()
                err = "\n".join(stderr_lines + build_err_lines).strip()

                if not output and err:
                    display = f"Compiler Diagnostics:\n{err}"
                else:
                    display = output or "Program executed with no standard output."

                has_build_fail = bool(build_err_lines)
                exit_code = data.get("code", 0)

                return {
                    "success": (exit_code == 0 and not has_build_fail),
                    "output": display,
                    "stderr": err,
                    "exit_code": exit_code,
                    "engine": f"godbolt-{compiler_id}",
                }
    except Exception as e:
        logger.warning(f"Godbolt sandbox notice: {e}. Attempting Piston sandbox...")

    # 3. TIER 2 REMOTE SANDBOX: PISTON CONTAINER API
    p_lang = PISTON_LANGS.get(lang, "python")
    try:
        piston_payload = {
            "language": p_lang,
            "version": "*",
            "files": [{"content": working_code}],
            "stdin": stdin_str,
        }
        async with httpx.AsyncClient(timeout=14.0) as client:
            p_resp = await client.post("https://emkc.org/api/v2/piston/execute", json=piston_payload)
            if p_resp.status_code == 200:
                p_data = p_resp.json()
                run_info = p_data.get("run", {})
                p_out = strip_ansi(run_info.get("output", "") or run_info.get("stdout", "")).strip()
                p_err = strip_ansi(run_info.get("stderr", "")).strip()
                code_val = run_info.get("code", 0)
                display_msg = p_out if p_out else (p_err or "Program executed with no standard output.")
                return {
                    "success": code_val == 0,
                    "output": display_msg,
                    "stderr": p_err,
                    "exit_code": code_val,
                    "engine": f"piston-{p_lang}",
                }
    except Exception as pe:
        logger.warning(f"Piston sandbox notice: {pe}. Attempting Judge0 CE sandbox...")

    # 4. TIER 3 REMOTE SANDBOX: JUDGE0 CE ISOLATED SANDBOX API
    j0_id = JUDGE0_LANGUAGE_IDS.get(lang)
    if j0_id is not None:
        try:
            judge0_payload = {
                "language_id": j0_id,
                "source_code": working_code,
                "stdin": stdin_str,
            }
            async with httpx.AsyncClient(timeout=14.0) as client:
                j_resp = await client.post(
                    "https://ce.judge0.com/submissions?base64_encoded=false&wait=true",
                    json=judge0_payload,
                    headers={"Content-Type": "application/json"},
                )
                if j_resp.status_code in (200, 201):
                    j_data = j_resp.json()
                    status_id = (j_data.get("status") or {}).get("id", 0)
                    j_out = strip_ansi(j_data.get("stdout") or "").strip()
                    j_err = strip_ansi((j_data.get("compile_output") or "") + "\n" + (j_data.get("stderr") or "")).strip()
                    j_msg = j_out if j_out else (j_err or (j_data.get("status") or {}).get("description", "Executed."))
                    ok = status_id == 3
                    return {
                        "success": ok,
                        "output": j_msg,
                        "stderr": j_err,
                        "exit_code": 0 if ok else status_id,
                        "engine": f"judge0-ce-{j0_id}",
                    }
        except Exception as je:
            logger.error(f"Judge0 sandbox execution failed: {je}")

    return {
        "success": False,
        "output": f"Remote sandbox unavailable for '{language}'. Please retry in a moment.",
        "stderr": "SandboxUnavailable",
        "exit_code": -1,
        "engine": "sandbox-unavailable",
    }
