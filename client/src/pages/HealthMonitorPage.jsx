import React, { useState, useEffect } from 'react';
import { getHealthCheck } from '../services/api';
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Server, 
  Database, 
  Activity,
  AlertTriangle,
  ArrowLeft 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HealthMonitorPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHealthCheck();
      setHealthData(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to communicate with backend API');
      setHealthData(null);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const getStatusBadge = (status) => {
    if (status === 'connected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Connected
        </span>
      );
    }
    if (status === 'unconfigured') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <AlertTriangle className="w-3.5 h-3.5" />
          Unconfigured
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
        <XCircle className="w-3.5 h-3.5" />
        {status || 'Disconnected'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/login" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Placement Management System
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                System Health & Connectivity Monitor
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 transition"
          >
            Go to Login &rarr;
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-6 py-10 flex-1">
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                Backend & Database Connectivity
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Real-time validation of backend health endpoint and active MongoDB session.
              </p>
            </div>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              Refresh Status
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
                <p className="text-sm font-medium">Checking backend and database status...</p>
              </div>
            ) : error ? (
              <div className="p-5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold">Backend API Unavailable</h3>
                    <p className="text-xs text-rose-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-lg border border-slate-200 bg-white shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-md bg-indigo-50 text-indigo-600">
                        <Server className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">Express REST API</h4>
                        <span className="text-xs text-slate-400 font-mono">GET /api/health</span>
                      </div>
                    </div>
                    {healthData?.success ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                        <XCircle className="w-3.5 h-3.5" />
                        Offline
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Environment:</span>
                      <span className="font-medium uppercase">{healthData?.environment || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Server Message:</span>
                      <span className="font-medium text-slate-700">{healthData?.message || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Server Timestamp:</span>
                      <span className="font-mono text-slate-500">{healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-lg border border-slate-200 bg-white shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-md bg-emerald-50 text-emerald-600">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">MongoDB Database</h4>
                        <span className="text-xs text-slate-400">Mongoose Connection Layer</span>
                      </div>
                    </div>
                    {getStatusBadge(healthData?.database)}
                  </div>
                  <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className="font-medium capitalize">{healthData?.database || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Configuration:</span>
                      <span className="font-mono text-slate-500">
                        {healthData?.database === 'unconfigured' ? 'Missing MONGODB_URI' : 'Configured via .env'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Last Verified:</span>
                      <span className="font-mono text-slate-500">{lastChecked || 'Just now'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400">
        Placement Management System &bull; Health Monitor
      </footer>
    </div>
  );
}
