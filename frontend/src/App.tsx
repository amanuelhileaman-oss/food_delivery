import { useEffect, useState } from 'react';
import apiClient from './api/client';
import { Loader2 } from 'lucide-react';

function App() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/health')
      .then(res => {
        setHealth(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to connect to backend');
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-xl border bg-card text-card-foreground shadow">
        <h1 className="text-2xl font-bold mb-6 text-center">Food Delivery Platform</h1>
        
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border">
            <h2 className="font-semibold mb-2">Backend Connection Status:</h2>
            {loading ? (
              <div className="flex items-center text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking health...</span>
              </div>
            ) : error ? (
              <div className="text-destructive font-medium">
                Error: {error}
              </div>
            ) : (
              <div className="text-emerald-600 dark:text-emerald-400 font-medium break-all">
                Connected! <br />
                <span className="text-sm font-normal text-muted-foreground">
                  Timestamp: {health?.timestamp}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
