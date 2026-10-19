/**
 * Interactive Technical Placement Viva & Rapid-Fire Quiz Mode (client/src/voice/quiz.ts)
 * Features autonomous oral question dispatch, answer evaluation, scoring (1-10),
 * compassionate explanation on "I don't know", and spoken feedback.
 */

import { memoryManager } from "./memory";

export interface VivaQuestion {
  id: string;
  topic: string;
  question: string;
  spokenPrompt: string;
  expectedKeywords: string[];
  idealAnswer: string;
}

export interface VivaEvaluation {
  score: number; // 1 to 10
  feedback: string;
  spokenFeedback: string;
  idealAnswer: string;
  isCorrect: boolean;
}

const QUESTION_BANK: VivaQuestion[] = [
  {
    id: "q_1",
    topic: "DSA / Time Complexity",
    question: "What is the worst-case time complexity of QuickSort, when does it happen, and how do you prevent it?",
    spokenPrompt: "First placement question: What is the worst-case time complexity of QuickSort, when does it happen, and how do you prevent it?",
    expectedKeywords: ["o(n^2)", "n squared", "sorted", "reverse", "random", "pivot", "median"],
    idealAnswer: "QuickSort degrades to O(N^2) when the chosen pivot is consistently the minimum or maximum element (e.g. already sorted array). We prevent this by using randomized pivot selection or median-of-three.",
  },
  {
    id: "q_2",
    topic: "Database / Indexing",
    question: "Why are B+ Trees preferred over Binary Search Trees or Hash Indexes for database indexing?",
    spokenPrompt: "Next question: Why are B+ Trees preferred over Binary Search Trees or Hash Indexes for database indexing?",
    expectedKeywords: ["disk", "range", "i/o", "block", "cache", "scan", "leaf", "pointer"],
    idealAnswer: "B+ Trees have high fan-out which minimizes disk I/O reads. Furthermore, all leaf nodes are linked in a sequential list, making range queries and order scans extremely fast compared to Hash indexes.",
  },
  {
    id: "q_3",
    topic: "System Design / Caching",
    question: "Explain the Cache-Aside pattern versus Write-Through caching. Which one is best for read-heavy workloads?",
    spokenPrompt: "System design question: Explain the Cache-Aside pattern versus Write-Through caching. Which is best for read-heavy workloads?",
    expectedKeywords: ["aside", "read", "miss", "write through", "database", "redis", "consistency", "lazy"],
    idealAnswer: "In Cache-Aside, the application first checks the cache; on a cache miss, it reads from the database and populates the cache lazily. It is ideal for read-heavy traffic with resilient failover.",
  },
  {
    id: "q_4",
    topic: "Computer Networks / Protocols",
    question: "What is the difference between TCP and UDP, and what is the TCP three-way handshake?",
    spokenPrompt: "Networking question: What is the difference between TCP and UDP, and how does the TCP three-way handshake work?",
    expectedKeywords: ["syn", "syn-ack", "ack", "reliable", "connection", "packet", "handshake", "loss"],
    idealAnswer: "TCP is connection-oriented and guarantees ordered, error-checked delivery via the SYN, SYN-ACK, ACK three-way handshake. UDP is connectionless, prioritizing low latency without packet retransmission.",
  },
];

export class PlacementQuizManager {
  private currentIndex: number = 0;
  private isActive: boolean = false;

  public startQuiz(): VivaQuestion {
    this.currentIndex = 0;
    this.isActive = true;
    memoryManager.recordAction("Started Technical Viva Practice");
    return QUESTION_BANK[this.currentIndex];
  }

  public get currentQuestion(): VivaQuestion {
    return QUESTION_BANK[this.currentIndex % QUESTION_BANK.length];
  }

  /**
   * Explains the ideal interview answer when student says "I don't know" or asks for help.
   */
  public explainCurrentAnswer(): { feedback: string; spokenFeedback: string; idealAnswer: string } {
    const q = this.currentQuestion;
    return {
      feedback: `[CONCEPT EXPLANATION - ${q.topic}]\n${q.idealAnswer}\n\nSay "next" when you are ready for the next question, or "exit viva" to finish.`,
      spokenFeedback: `No worries at all! Here is how to answer this: ${q.idealAnswer}. Say next when you are ready for the next question, or say exit viva.`,
      idealAnswer: q.idealAnswer,
    };
  }

  public evaluateAnswer(userAnswer: string): VivaEvaluation {
    const q = this.currentQuestion;
    const lower = userAnswer.toLowerCase();

    let matchedKeywords = 0;
    for (const kw of q.expectedKeywords) {
      if (lower.includes(kw)) {
        matchedKeywords++;
      }
    }

    const keywordRatio = matchedKeywords / Math.max(1, q.expectedKeywords.length);
    let score = Math.max(4, Math.min(10, Math.round(keywordRatio * 7 + 3)));
    const isCorrect = score >= 7;

    const feedback = isCorrect
      ? `Great answer (${score}/10)! You clearly explained the core concepts: ${q.expectedKeywords.filter((k) => lower.includes(k)).join(", ")}.`
      : `Good effort (${score}/10). Key point: ${q.idealAnswer}`;

    const spokenFeedback = isCorrect
      ? `Great answer! That's a solid ${score} out of 10. You clearly hit the core engineering principles.`
      : `Good attempt, that scores ${score} out of 10. Key concept to remember: ${q.idealAnswer}`;

    memoryManager.addNote(`Viva Quiz [${q.topic}]: Scored ${score}/10`);
    return {
      score,
      feedback,
      spokenFeedback,
      idealAnswer: q.idealAnswer,
      isCorrect,
    };
  }

  public nextQuestion(): VivaQuestion | null {
    this.currentIndex++;
    if (this.currentIndex < QUESTION_BANK.length) {
      return QUESTION_BANK[this.currentIndex];
    }
    this.isActive = false;
    return null;
  }

  public get inProgress(): boolean {
    return this.isActive;
  }

  public stopQuiz() {
    this.isActive = false;
  }
}

export const quizManager = new PlacementQuizManager();
