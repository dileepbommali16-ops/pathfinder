import { useEffect } from 'react';
import { useVoiceAgent } from '../../context/VoiceAgentContext';

export default function Dashboard() {
    const { sendMessageToDAS } = useVoiceAgent();

    useEffect(() => {
        // Automatically trigger a welcome proactive greeting when dashboard loads
        const timer = setTimeout(() => {
            sendMessageToDAS("System online. User entered the main dashboard. Greet them proactively, explain what the dashboard is, and ask how you can assist them further.");
        }, 1000);
        return () => clearTimeout(timer);
    }, [sendMessageToDAS]);

    return (
        <div>
            {/* Your existing Dashboard UI */}
        </div>
    );
}
