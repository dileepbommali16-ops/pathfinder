// File: client/src/agent/toolRunner.ts

// React input boxes mariyu sliders ni hands-free ga marchadaniki helper
function updateReactInput(el: HTMLInputElement | HTMLTextAreaElement, val: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  if (setter) {
    setter.call(el, val);
  } else {
    el.value = val;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

// Gemini Live Brain ki mee Pathfinder v2.0 website meeda unna complete tools
export const PATHFINDER_TOOLS = [
  {
    googleSearch: {}
  },
  {
    functionDeclarations: [
      {
        name: "open_website_tab",
        description: "Switch between the 7 top navigation tabs on the Pathfinder v2.0 website.",
        parameters: {
          type: "OBJECT",
          properties: {
            tabName: {
              type: "STRING",
              enum: [
                "Dashboard",
                "AI Mock Interview",
                "Readiness Command",
                "8-Week Roadmap",
                "Project Blueprints",
                "Cohort Analytics",
                "ATS Resume Studio"
              ],
              description: "Exact tab name to click and open on the website"
            }
          },
          required: ["tabName"]
        }
      },
      {
        name: "click_or_type_on_page",
        description: "Click any button/card or type text into any input box on the current screen.",
        parameters: {
          type: "OBJECT",
          properties: {
            targetText: {
              type: "STRING",
              description: "Visible text on the button, link, or input placeholder (e.g., 'Execute', 'Analyze', 'Start')"
            },
            textToType: {
              type: "STRING",
              description: "Optional text to type if the target is an input field or textarea"
            }
          },
          required: ["targetText"]
        }
      },
      {
        name: "read_current_screen_data",
        description: "Read all scores, analytics, roadmaps, and text currently displayed on the Pathfinder webpage.",
        parameters: {
          type: "OBJECT",
          properties: {}
        }
      },
      {
        name: "google_automation",
        description: "Open Google Search, compose Gmail, or create a Google Calendar event.",
        parameters: {
          type: "OBJECT",
          properties: {
            service: {
              type: "STRING",
              enum: ["search", "gmail", "calendar"],
              description: "Which Google service to trigger"
            },
            queryOrTitle: {
              type: "STRING",
              description: "Search query, email subject, or calendar event title"
            },
            bodyText: {
              type: "STRING",
              description: "Optional email body or calendar description"
            }
          },
          required: ["service", "queryOrTitle"]
        }
      }
    ]
  }
];

// Tool execution function
export async function executeToolCall(name: string, args: any): Promise<any> {
  try {
    // 1. Paina unna 7 tabs lo edaina click chesi open cheyyadam
    if (name === "open_website_tab" || name === "navigate_module") {
      const target = String(args.tabName || args.module || "").toLowerCase();
      window.dispatchEvent(new CustomEvent("das:navigate", { detail: { tab: target } }));

      const clickable = Array.from(document.querySelectorAll("button, a, [role='tab'], nav *")) as HTMLElement[];
      const match = clickable.find((el) => el.innerText?.trim().toLowerCase().includes(target));

      if (match) {
        match.click();
        match.scrollIntoView({ behavior: "smooth", block: "center" });
        return { success: true, message: `Opened tab: ${args.tabName || args.module}` };
      }
      return { success: false, message: `Tab '${target}' not found on header` };
    }

    // 2. Website lo ye button aina click cheyyadam leda input fill cheyyadam
    if (name === "click_or_type_on_page") {
      const target = String(args.targetText || "").toLowerCase();
      const elements = Array.from(
        document.querySelectorAll("button, a, input, textarea, [role='button']")
      ) as HTMLElement[];

      const found = elements.find(
        (el) =>
          el.innerText?.toLowerCase().includes(target) ||
          (el as HTMLInputElement).placeholder?.toLowerCase().includes(target)
      );

      if (!found) {
        return { success: false, error: `Could not find '${args.targetText}' on page` };
      }

      if (args.textToType && (found.tagName === "INPUT" || found.tagName === "TEXTAREA")) {
        updateReactInput(found as HTMLInputElement, args.textToType);
        return { success: true, action: `Typed '${args.textToType}' into '${args.targetText}'` };
      }

      found.click();
      return { success: true, action: `Clicked '${args.targetText}'` };
    }

    // 3. Screen meeda unna data chadavadam
    if (name === "read_current_screen_data") {
      const pageText = document.body.innerText.slice(0, 3500);
      return { success: true, screenContent: pageText };
    }

    // 4. Google Search, Gmail mariyu Calendar automation
    if (name === "google_automation") {
      const q = encodeURIComponent(args.queryOrTitle || "");
      const body = encodeURIComponent(args.bodyText || "");

      if (args.service === "search") {
        window.open(`https://www.google.com/search?q=${q}`, "_blank");
      } else if (args.service === "gmail") {
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${q}&body=${body}`, "_blank");
      } else if (args.service === "calendar") {
        window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${q}&details=${body}`, "_blank");
      }
      return { success: true, service: args.service, query: args.queryOrTitle };
    }

    return { success: false, error: `Unknown tool: ${name}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}