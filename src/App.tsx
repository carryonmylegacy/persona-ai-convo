import { useState, useEffect } from 'react';
import { Home, FileText, Users, BookOpen, Settings, LogOut, Brain, Shield } from 'lucide-react';
import PersonaView from './components/PersonaView';
import ChatInterface from './components/ChatInterface';
import CategoryProgress from './components/CategoryProgress';
import ResetSession from './components/ResetSession';
import TestMode from './components/TestMode';
import { Auth } from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import { supabase } from './lib/supabase';
import { checkIsAdmin } from './lib/adminAuth';
import type { User } from '@supabase/supabase-js';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'corpus' | 'documents' | 'beneficiaries' | 'action-guide' | 'settings' | 'admin'>('corpus');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const adminStatus = await checkIsAdmin();
        setIsAdmin(adminStatus);
      }

      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const adminStatus = await checkIsAdmin();
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const checkSession = () => {
      const storedSessionId = localStorage.getItem('carryOnSessionId');
      setSessionId(storedSessionId);

      if (storedSessionId) {
        loadProgress(storedSessionId);
      } else {
        setProgressPercentage(0);
      }
    };

    checkSession();

    const interval = setInterval(checkSession, 1000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user || !sessionId) return;

    const subscription = supabase
      .channel(`session_progress_${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_sessions', filter: `id=eq.${sessionId}` }, () => {
        loadProgress(sessionId);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, sessionId]);

  async function loadProgress(sid: string) {
    const { data } = await supabase
      .from('chat_sessions')
      .select('progress_percentage')
      .eq('id', sid)
      .maybeSingle();

    if (data) {
      setProgressPercentage(data.progress_percentage || 0);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('carryOnSessionId');
    setSessionId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--carry-on-navy)] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-[var(--carry-on-navy)] flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-[var(--carry-on-dark-blue)] border-r border-[var(--carry-on-medium-blue)] flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[var(--carry-on-medium-blue)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--carry-on-accent-blue)] to-[var(--carry-on-medium-blue)] flex items-center justify-center">
              <Brain className="text-white" size={24} />
            </div>
            <span className="text-white text-xl font-semibold">Carry On</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeView === 'dashboard'
                ? 'bg-[var(--carry-on-medium-blue)] text-white'
                : 'text-[var(--carry-on-gray)] hover:bg-[var(--carry-on-medium-blue)] hover:text-white'
            }`}
          >
            <Home size={20} />
            <span className="font-medium">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveView('corpus')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeView === 'corpus'
                ? 'bg-[var(--carry-on-medium-blue)] text-white'
                : 'text-[var(--carry-on-gray)] hover:bg-[var(--carry-on-medium-blue)] hover:text-white'
            }`}
          >
            <Brain size={20} />
            <span className="font-medium">Digital Corpus</span>
          </button>

          <button
            onClick={() => setActiveView('documents')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeView === 'documents'
                ? 'bg-[var(--carry-on-medium-blue)] text-white'
                : 'text-[var(--carry-on-gray)] hover:bg-[var(--carry-on-medium-blue)] hover:text-white'
            }`}
          >
            <FileText size={20} />
            <span className="font-medium">Documents</span>
          </button>

          <button
            onClick={() => setActiveView('beneficiaries')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeView === 'beneficiaries'
                ? 'bg-[var(--carry-on-medium-blue)] text-white'
                : 'text-[var(--carry-on-gray)] hover:bg-[var(--carry-on-medium-blue)] hover:text-white'
            }`}
          >
            <Users size={20} />
            <span className="font-medium">Beneficiaries</span>
          </button>

          <button
            onClick={() => setActiveView('action-guide')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeView === 'action-guide'
                ? 'bg-[var(--carry-on-medium-blue)] text-white'
                : 'text-[var(--carry-on-gray)] hover:bg-[var(--carry-on-medium-blue)] hover:text-white'
            }`}
          >
            <BookOpen size={20} />
            <span className="font-medium">Action Guide</span>
          </button>

          <button
            onClick={() => setActiveView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeView === 'settings'
                ? 'bg-[var(--carry-on-medium-blue)] text-white'
                : 'text-[var(--carry-on-gray)] hover:bg-[var(--carry-on-medium-blue)] hover:text-white'
            }`}
          >
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveView('admin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeView === 'admin'
                  ? 'bg-[var(--carry-on-medium-blue)] text-white'
                  : 'text-[var(--carry-on-gray)] hover:bg-[var(--carry-on-medium-blue)] hover:text-white'
              }`}
            >
              <Shield size={20} />
              <span className="font-medium">Admin Portal</span>
            </button>
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-[var(--carry-on-medium-blue)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-[var(--carry-on-medium-blue)] transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {activeView === 'corpus' && (
          <ChatInterface />
        )}

        {activeView === 'dashboard' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                  <p className="text-[var(--carry-on-gray)]">Everything you need in one place</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Corpus Completion Card */}
                <div className="bg-[var(--carry-on-dark-blue)] rounded-xl p-6 border border-[var(--carry-on-medium-blue)]">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Corpus Completion</h3>
                      <p className="text-sm text-[var(--carry-on-gray)]">Build your digital legacy</p>
                    </div>
                    <div className="text-3xl font-bold text-white">{progressPercentage}%</div>
                  </div>
                  <div className="w-full bg-[var(--carry-on-medium-blue)] rounded-full h-2 mb-4">
                    <div
                      className="bg-[var(--carry-on-yellow)] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-[var(--carry-on-gray)] mb-4">Finish onboarding to unlock more features</p>
                  <button
                    onClick={() => setActiveView('corpus')}
                    className="w-full bg-[var(--carry-on-accent-blue)] text-white py-3 rounded-lg font-medium hover:bg-opacity-90 transition-all"
                  >
                    Continue Building
                  </button>
                </div>

                {/* Test Me Now Card */}
                <div className={`bg-gradient-to-br from-amber-900/40 to-[var(--carry-on-dark-blue)] rounded-xl p-6 border ${
                  progressPercentage >= 70 ? 'border-amber-600/50' : 'border-[var(--carry-on-medium-blue)]'
                } relative overflow-hidden`}>
                  {progressPercentage >= 70 && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
                  )}
                  <div className="relative">
                    <h3 className="text-lg font-semibold text-white mb-1">Test Me Now</h3>
                    <p className="text-sm text-[var(--carry-on-gray)] mb-4">70% more needed</p>
                    {progressPercentage >= 70 ? (
                      <div className="text-green-400 font-medium mb-4">Unlocked!</div>
                    ) : (
                      <div className="text-amber-300 font-medium mb-4">Locked</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-[var(--carry-on-dark-blue)] rounded-xl p-6 border border-[var(--carry-on-medium-blue)]">
                {sessionId ? <CategoryProgress sessionId={sessionId} /> : <div className="text-center text-[var(--carry-on-gray)]">No active session</div>}
              </div>
            </div>
          </div>
        )}

        {activeView === 'documents' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto text-center py-12">
              <FileText size={64} className="mx-auto mb-4 text-[var(--carry-on-gray)]" />
              <h2 className="text-2xl font-bold text-white mb-2">Document Vault</h2>
              <p className="text-[var(--carry-on-gray)]">Coming soon</p>
            </div>
          </div>
        )}

        {activeView === 'beneficiaries' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto text-center py-12">
              <Users size={64} className="mx-auto mb-4 text-[var(--carry-on-gray)]" />
              <h2 className="text-2xl font-bold text-white mb-2">Beneficiaries</h2>
              <p className="text-[var(--carry-on-gray)]">Coming soon</p>
            </div>
          </div>
        )}

        {activeView === 'action-guide' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto text-center py-12">
              <BookOpen size={64} className="mx-auto mb-4 text-[var(--carry-on-gray)]" />
              <h2 className="text-2xl font-bold text-white mb-2">Action Guide</h2>
              <p className="text-[var(--carry-on-gray)]">Coming soon</p>
            </div>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
              <ResetSession />
            </div>
          </div>
        )}

        {activeView === 'admin' && isAdmin && (
          <AdminDashboard />
        )}
      </div>
    </div>
  );
}

export default App;
