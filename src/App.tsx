import { useEffect, useState } from 'react';
import { getHealth } from './api/client';

type ConnectionState = 'loading' | 'connected' | 'error';

export default function App() {
  const [connection, setConnection] = useState<ConnectionState>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setConnection('loading');
    getHealth(controller.signal)
      .then(() => {
        if (!controller.signal.aborted) setConnection('connected');
      })
      .catch(() => {
        if (!controller.signal.aborted) setConnection('error');
      });
    return () => controller.abort();
  }, [attempt]);

  return (
    <main className="workspace">
      <header className="workspace-header">
        <span className="wordmark">MVP Workspace</span>
        <span className="environment">Application</span>
      </header>
      <section className="connection" aria-labelledby="connection-heading">
        <h1 id="connection-heading">Connection</h1>
        <div className="connection-row">
          <span>API</span>
          <p role="status" className={`status status-${connection}`}>
            <span className="status-dot" aria-hidden="true" />
            {connection === 'loading' ? 'Checking...' : connection === 'connected' ? 'Connected' : 'Unavailable'}
          </p>
        </div>
        {connection === 'error' && <p role="alert">Unable to reach the API. Please try again.</p>}
        <button disabled={connection === 'loading'} onClick={() => setAttempt(attempt + 1)}>
          Check connection
        </button>
      </section>
    </main>
  );
}