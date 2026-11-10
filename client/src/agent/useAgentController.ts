import { useState, useCallback } from "react";
import { dasSocket, UserHonorificRole } from "./agentSocket";

export function useAgentController() {
  const [role, setRole] = useState<UserHonorificRole>("boss");
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState("DAS Live Ready (Puck Voice)");

  const toggleRole = useCallback((newRole: UserHonorificRole) => {
    setRole(newRole);
    dasSocket.switchRole(newRole);
  }, []);

  return {
    role,
    toggleRole,
    isConnected,
    setIsConnected,
    transcript,
    setTranscript,
  };
}

export default useAgentController;
