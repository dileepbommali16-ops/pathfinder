import { Type } from "@google/genai";

/**
 * pathfinderTools.js — Website Automation & Live Viva Tool Declarations for Gemini Live
 */
export const pathfinderTools = [
  {
    functionDeclarations: [
      {
        name: "open_blueprint",
        description:
          "Opens one of the 23 capstone blueprints on the website screen when the student asks or during a viva.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            blueprintId: {
              type: Type.NUMBER,
              description: "Blueprint number from 1 to 23",
            },
          },
          required: ["blueprintId"],
        },
      },
      {
        name: "highlight_section",
        description:
          "Scrolls the webpage and highlights a specific architecture section on the screen.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            sectionName: {
              type: Type.STRING,
              description: "Section ID like database, backend, or system-design",
            },
          },
          required: ["sectionName"],
        },
      },
      {
        name: "update_readiness_score",
        description:
          "Updates the student's placement readiness score live on the dashboard after answering a question.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            points: {
              type: Type.NUMBER,
              description: "Points to add or subtract",
            },
            feedback: {
              type: Type.STRING,
              description: "Short reason for the score update",
            },
          },
          required: ["points", "feedback"],
        },
      },
      {
        name: "navigate",
        description:
          "Navigate to a route or dashboard tab in Pathfinder (overview, skills, interview, action, analytics, projects, resume).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            to: {
              type: Type.STRING,
              description: "Target tab ID or path",
            },
          },
          required: ["to"],
        },
      },
    ],
  },
];

