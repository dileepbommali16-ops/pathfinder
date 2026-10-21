import { useDASVoice } from '../contexts/DASVoiceContext';

export function useVoiceAgent() {
  const voice = useDASVoice();
  return {
    ...voice,
    sendMessageToDAS: voice.sendMessage,
  };
}

export { useDASVoice };
export default useVoiceAgent;
