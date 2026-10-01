# 🛠️ Antigravity Developer Setup Guide: 4 Power Tools

This guide outlines four essential developer extensions and CLI tools to maximize your productivity and agent capabilities inside **Google Antigravity IDE**.

---

## ⚡ Quick Reference Matrix

| Tool | Main Purpose | Best For | Installation Type |
|---|---|---|---|
| **Roo Code** | Multi-mode AI development | Planning, coding & targeted debugging | IDE Extension (`RooVeterinaryInc.roo-cline`) |
| **GSD** | Structured project execution | Large, multi-step features without context loss | CLI (`npx.cmd get-shit-done-cc`) |
| **Ralph Loop** | Repeated autonomous iteration | Iterative coding until task specifications pass | IDE Extension (`abhishekbhakat/ralph-loop-for-antigravity`) |
| **CodeRabbit** | AI-powered code reviews | Automated bug, security & quality checks | IDE Extension & Skills Plugin |

---

## 🔄 Recommended 4-Stage Workflow

```
       [ Stage 1: ARCHITECTURE ]
                Roo Code
       (Plan & design the solution)
                   │
                   ▼
        [ Stage 2: BREAKDOWN ]
                 GSD
       (Break into atomic phases)
                   │
                   ▼
         [ Stage 3: ITERATION ]
               Ralph Loop
       (Loop until task passes specs)
                   │
                   ▼
          [ Stage 4: REVIEW ]
              CodeRabbit
       (Security, quality, and PR check)
```

---

## 1. Roo Code

### What it does
Roo Code separates AI tasks into specialized developer roles:
- **Architect Mode:** Plan architectures, evaluate tradeoffs, and write technical specifications.
- **Code Mode:** Implement features and edit files with surgical precision.
- **Debug Mode:** Trace runtime errors, inspect logs, and fix bugs.
- **Custom Modes:** Define custom prompt personas for your specific stack (e.g., FastAPI + React).

### How to Install
1. Open Extensions: `Ctrl + Shift + X` (or `Cmd + Shift + X` on macOS).
2. Search for: `Roo Code`
3. Install extension ID: `RooVeterinaryInc.roo-cline`
4. Access Roo Code from the left sidebar and configure your AI provider/API key.

---

## 2. GSD — Get Shit Done

### What it does
Prevents "agent context drift" on large features by enforcing a structured lifecycle:
$$\text{Plan} \longrightarrow \text{Break Down} \longrightarrow \text{Execute} \longrightarrow \text{Verify}$$

### How to Install (Windows / Antigravity Terminal)
> [!TIP]
> On Windows PowerShell, use `npx.cmd` to bypass `.ps1` execution policy restrictions.

**For Global Installation:**
```powershell
npx.cmd get-shit-done-cc --antigravity --global
```

**For This Project Only (Local):**
```powershell
npx.cmd get-shit-done-cc --antigravity --local
```

After installation:
1. Reload/Restart Antigravity.
2. Type `/gsd-help` in the chat to see available workflows.

---

## 3. Ralph Loop for Antigravity

### What it does
Runs an agent in repeated, focused loops against a specification file until all test cases or tasks are satisfied. Each iteration starts with clean context while preserving state in local files.

### How to Install
1. Open Extensions: `Ctrl + Shift + X`.
2. Search for: `Ralph Loop for Antigravity`.
3. Install the extension (`abhishekbhakat/ralph-loop-for-antigravity`).

### How to Use
1. Write a specification or task list (e.g., in `.gemini/` or project docs).
2. Open the Ralph sidebar in Antigravity and select your task file.
3. Switch to **Fast Mode** and start the loop.
4. **Emergency Stop:** Press `Ctrl + Shift + P` -> search `Ralph: Emergency Stop Ralph Loop`.

---

## 4. CodeRabbit

### What it does
Automated AI code review that flags security regressions, performance bottlenecks, and architectural anti-patterns before code gets committed or deployed.

### How to Install
1. Create a free account at [app.coderabbit.ai](https://app.coderabbit.ai/).
2. Open Extensions (`Ctrl + Shift + X`) and search for `CodeRabbit`.
3. Install `CodeRabbit.coderabbit-vscode`.
4. Sign in to link your account.

---

## 📌 Compatibility Notes
- These tools are third-party extensions compatible with Antigravity's VS Code-based environment.
- Always review repository permissions and API keys before granting external extension access.
