import { useCallback } from 'react';
import type { SageMode } from './types';
import { MainScreen } from './components/layout';
import { useAgentState } from './hooks';
import './App.css';

function App() {
  const { state, isConnected, setMode } = useAgentState(3000);

  const handleModeChange = useCallback((mode: SageMode) => {
    // Backend sync is best-effort; the UI switches mode locally regardless
    // so features like Calm Mode work fully offline.
    setMode(mode).catch(() => {});
  }, [setMode]);

  const handleSendMessage = useCallback((message: string) => {
    console.log('Message sent:', message);
  }, []);

  return (
    <MainScreen
      currentMode={state.mode}
      onModeChange={handleModeChange}
      onSendMessage={handleSendMessage}
      isConnected={isConnected}
    />
  );
}

export default App;