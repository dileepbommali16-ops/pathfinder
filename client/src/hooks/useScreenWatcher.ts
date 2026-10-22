/**
 * useScreenWatcher - Tracks the active tab, the currently visible/focused widget,
 * and user idle state for Pathfinder's voice agent.
 * File: client/src/hooks/useScreenWatcher.ts
 */
import { useEffect, useRef, useState, useCallback } from "react";

export interface ScreenPayload {
  activeTab: string;
  focusedWidget: string;
  userState: string;
}

const IDLE_TIMEOUT_MS = 35_000;

export function useScreenWatcher(activeTab: string = "overview") {
  const [focusedWidget, setFocusedWidget] = useState<string>("");
  const [userState, setUserState] = useState<string>("active");
  const focusedWidgetRef = useRef<string>("");
  const userStateRef = useRef<string>("active");

  focusedWidgetRef.current = focusedWidget;
  userStateRef.current = userState;

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const targetId =
              entry.target.getAttribute("data-das-id") ||
              entry.target.getAttribute("id") ||
              "";
            if (targetId) {
              setFocusedWidget(targetId);
              break;
            }
          }
        }
      },
      { threshold: 0.3 }
    );

    const observeWidgets = () => {
      const elements = document.querySelectorAll("[data-das-id]");
      elements.forEach((el) => observer.observe(el));
    };

    // Observe immediately and on DOM updates
    observeWidgets();
    const timeout = window.setTimeout(observeWidgets, 500);

    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, [activeTab]);

  // Idle detection
  useEffect(() => {
    let timer: number;

    const resetIdle = () => {
      setUserState("active");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setUserState("idle_or_confused");
      }, IDLE_TIMEOUT_MS);
    };

    resetIdle();
    window.addEventListener("mousemove", resetIdle, { passive: true });
    window.addEventListener("scroll", resetIdle, { passive: true });
    window.addEventListener("keydown", resetIdle, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("scroll", resetIdle);
      window.removeEventListener("keydown", resetIdle);
    };
  }, [activeTab]);

  const getScreenPayload = useCallback((): ScreenPayload => {
    return {
      activeTab: activeTab || "overview",
      focusedWidget: focusedWidgetRef.current || "",
      userState: userStateRef.current || "active",
    };
  }, [activeTab]);

  return {
    activeTab,
    focusedWidget,
    userState,
    getScreenPayload,
  };
}
