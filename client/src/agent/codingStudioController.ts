// client/src/agent/codingStudioController.ts
// Full agent- and UI-controllable state engine for Pathfinder's multi-language Coding Studio.

export interface LanguageSpec {
  id: string;
  label: string;
  extension: string;
  programizUrl: string;
  starter: string;
}

export const SUPPORTED_LANGUAGES: LanguageSpec[] = [
  {
    id: "c",
    label: "C (GCC 13)",
    extension: "main.c",
    programizUrl: "https://www.programiz.com/c-programming/online-compiler/",
    starter: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello Boss\\n");\n    return 0;\n}\n',
  },
  {
    id: "cpp",
    label: "C++ (G++ 13)",
    extension: "main.cpp",
    programizUrl: "https://www.programiz.com/cpp-programming/online-compiler/",
    starter: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello Boss" << endl;\n    return 0;\n}\n',
  },
  {
    id: "python",
    label: "Python 3.11",
    extension: "main.py",
    programizUrl: "https://www.programiz.com/python-programming/online-compiler/",
    starter: 'print("Hello Boss")\n',
  },
  {
    id: "java",
    label: "Java 21",
    extension: "Main.java",
    programizUrl: "https://www.programiz.com/java-programming/online-compiler/",
    starter: 'class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Boss");\n    }\n}\n',
  },
  {
    id: "javascript",
    label: "JavaScript (V8)",
    extension: "index.js",
    programizUrl: "https://www.programiz.com/javascript/online-compiler/",
    starter: 'console.log("Hello Boss");\n',
  },
  {
    id: "typescript",
    label: "TypeScript 5.4",
    extension: "index.ts",
    programizUrl: "https://onecompiler.com/typescript",
    starter: 'const greet = (name: string): string => `Hello ${name}`;\nconsole.log(greet("Boss"));\n',
  },
  {
    id: "sql",
    label: "SQL (SQLite)",
    extension: "query.sql",
    programizUrl: "https://www.programiz.com/sql/online-compiler/",
    starter: "SELECT 'Hello Boss' AS greeting;\n",
  },
  {
    id: "go",
    label: "Go 1.21",
    extension: "main.go",
    programizUrl: "https://www.programiz.com/golang/online-compiler/",
    starter: 'package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello Boss")\n}\n',
  },
  {
    id: "rust",
    label: "Rust 1.75",
    extension: "main.rs",
    programizUrl: "https://www.programiz.com/rust/online-compiler/",
    starter: 'fn main() {\n    println!("Hello Boss");\n}\n',
  },
  {
    id: "csharp",
    label: "C# (.NET)",
    extension: "Program.cs",
    programizUrl: "https://www.programiz.com/csharp-programming/online-compiler/",
    starter: 'using System;\nclass Program {\n    static void Main() => Console.WriteLine("Hello Boss");\n}\n',
  },
  {
    id: "php",
    label: "PHP 8",
    extension: "index.php",
    programizUrl: "https://www.programiz.com/php/online-compiler/",
    starter: '<?php\necho "Hello Boss\\n";\n',
  },
];

const LANGUAGE_ALIASES: Record<string, string> = {
  c: "c",
  "c++": "cpp",
  cpp: "cpp",
  py: "python",
  python: "python",
  python3: "python",
  java: "java",
  js: "javascript",
  javascript: "javascript",
  node: "javascript",
  ts: "typescript",
  typescript: "typescript",
  sql: "sql",
  sqlite: "sql",
  go: "go",
  golang: "go",
  rs: "rust",
  rust: "rust",
  "c#": "csharp",
  cs: "csharp",
  csharp: "csharp",
  php: "php",
};

export interface CodingStudioActionArgs {
  action?: string;
  language?: string;
  program_title?: string;
  source_code?: string;
  mode?: "replace" | "append" | "insert_lines" | "replace_lines" | string;
  line_number?: number;
  start_line?: number;
  end_line?: number;
  target_text?: string;
  stdin?: string;
  auto_run?: boolean;
  logic_explanation?: string;
}

export function normalizeLanguage(raw?: string): string {
  const key = String(raw || "python").toLowerCase().trim();
  return LANGUAGE_ALIASES[key] || "python";
}

export function getLanguageSpec(raw?: string): LanguageSpec {
  const id = normalizeLanguage(raw);
  return SUPPORTED_LANGUAGES.find((s) => s.id === id) || SUPPORTED_LANGUAGES[2];
}

export function formatNumberedCode(code: string): string {
  const text = String(code || "");
  if (!text) return "(empty)";
  return text
    .split(/\r?\n/)
    .map((line, i) => `${i + 1}: ${line}`)
    .join("\n");
}

export function applyCodeEdit(currentCode: string, args: CodingStudioActionArgs): string {
  const incoming = String(args.source_code ?? "");
  const mode = String(args.mode || "replace").toLowerCase().trim();
  const base = String(currentCode || "");

  if (mode === "append") {
    if (!base.trim()) return incoming;
    return `${base.replace(/\s+$/, "")}\n${incoming}`;
  }

  if (mode === "insert_lines") {
    const lines = base ? base.split(/\r?\n/) : [];
    const rawLine = Number(args.line_number || args.start_line || lines.length + 1);
    const insertIdx = Math.max(0, Math.min(lines.length, rawLine - 1));
    const newLines = incoming.split(/\r?\n/);
    lines.splice(insertIdx, 0, ...newLines);
    return lines.join("\n");
  }

  if (mode === "replace_lines") {
    const lines = base ? base.split(/\r?\n/) : [];
    const start = Math.max(1, Number(args.start_line || args.line_number || 1));
    const end = Math.max(start, Number(args.end_line || start));
    const startIdx = Math.min(lines.length, start - 1);
    const deleteCount = Math.max(0, Math.min(lines.length - startIdx, end - start + 1));
    const newLines = incoming.split(/\r?\n/);
    lines.splice(startIdx, deleteCount, ...newLines);
    return lines.join("\n");
  }

  return incoming;
}

export function applyCodeDelete(currentCode: string, args: CodingStudioActionArgs): string {
  const base = String(currentCode || "");
  const target = String(args.target_text || "").trim();
  const hasRange = args.start_line !== undefined || args.end_line !== undefined || args.line_number !== undefined;

  if (target && target.toUpperCase() !== "ALL") {
    return base
      .split(target)
      .join("")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\n+/, "");
  }

  if (hasRange && target.toUpperCase() !== "ALL") {
    const lines = base ? base.split(/\r?\n/) : [];
    const start = Math.max(1, Number(args.start_line || args.line_number || 1));
    const end = Math.max(start, Number(args.end_line || start));
    const startIdx = Math.min(lines.length, start - 1);
    const count = Math.max(0, Math.min(lines.length - startIdx, end - start + 1));
    lines.splice(startIdx, count);
    return lines.join("\n");
  }

  return "";
}

type CodingStudioHandler = (args: CodingStudioActionArgs) => Promise<Record<string, any>>;

class CodingStudioController {
  private handler: CodingStudioHandler | null = null;
  private memoryCode = SUPPORTED_LANGUAGES[2].starter;
  private memoryLanguage = "python";

  public registerHandler(fn: CodingStudioHandler | null) {
    this.handler = fn;
  }

  public async execute(args: CodingStudioActionArgs = {}): Promise<Record<string, any>> {
    if (this.handler) {
      return await this.handler(args);
    }

    const action = String(args.action || "open").toLowerCase().trim();
    if (args.language) this.memoryLanguage = normalizeLanguage(args.language);
    if (action === "write_code") {
      this.memoryCode = applyCodeEdit(this.memoryCode, args);
    } else if (action === "delete_code") {
      this.memoryCode = applyCodeDelete(this.memoryCode, args);
    } else if (action === "switch_language") {
      this.memoryCode = args.source_code ?? getLanguageSpec(this.memoryLanguage).starter;
    }

    return {
      ok: true,
      action,
      language: this.memoryLanguage,
      code: this.memoryCode,
      numbered_code: formatNumberedCode(this.memoryCode),
      line_count: this.memoryCode ? this.memoryCode.split(/\r?\n/).length : 0,
      output: "",
      stderr: "",
      stopped: action === "stop_code",
    };
  }
}

export const codingStudioController = new CodingStudioController();
