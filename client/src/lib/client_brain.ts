/**
 * client_brain.ts - Autonomous Edge RAG Brain for Pathfinder 2.0
 * Re-exports the semantic vector search (Top 3 injection, < 2000 token system prompt)
 * and fallback response engine from careerAgent.js.
 */

export {
  EMBEDDING_DIM,
  MAX_SYSTEM_PROMPT_TOKENS,
  computeEmbedding384,
  cosineSimilarity,
  estimatePromptTokens,
  getIndexedKnowledgeStore,
  semanticSearchSync,
  semanticSearchPathfinderRAG,
  buildRagGroqSystemPrompt,
  getCareerAgentResponse,
} from "./careerAgent";

