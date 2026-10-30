import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { AvatarState } from './Avatar3D';

export type GlobalAction = {
  type: string;
  payload?: any;
};

export type GlobalState = {
  activeTab?: string;
  globalContext?: string;
  textResponse?: string;
  avatarState?: AvatarState;
  // add more as needed
};

const GlobalContext = createContext<{
  state: GlobalState;
  dispatch: (action: GlobalAction) => void;
} | null>(null);

export function GlobalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GlobalState>({});

  const dispatch = (action: GlobalAction) => {
    setState((prev) => {
      switch (action.type) {
        case 'SET_STATE':
          return { ...prev, avatarState: action.payload };
        case 'SET_TEXT':
          return { ...prev, textResponse: action.payload };
        case 'SET_TAB':
          return { ...prev, activeTab: action.payload };
        case 'SET_CONTEXT':
          return { ...prev, globalContext: action.payload };
        default:
          return prev;
      }
    });
  };

  return <GlobalContext.Provider value={{ state, dispatch }}>{children}</GlobalContext.Provider>;
}

export function useGlobalContext() {
  const ctx = useContext(GlobalContext);
  if (!ctx) throw new Error('useGlobalContext must be used within GlobalProvider');
  return ctx;
}
