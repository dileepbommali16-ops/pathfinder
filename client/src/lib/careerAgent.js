/**
 * Pathfinder AI Career Coach - Frontend Fallback Client
 *
 * NOTE: All normal messages are processed dynamically by Gemini AI on the backend (/api/chat).
 * This fallback is ONLY invoked if the network connection is completely severed.
 */

export const getCareerAgentResponse = (message, history = [], profile) => {
  return "I'm having a little trouble reaching the AI right now! Please tap retry in a moment 😊";
};
