import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { RotateCcw } from 'lucide-react';

export default function ResetSession() {
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset your session? This will clear all progress.')) {
      return;
    }

    setLoading(true);
    try {
      const sessionId = localStorage.getItem('carryOnSessionId');
      if (sessionId) {
        await supabase
          .from('chat_sessions')
          .delete()
          .eq('id', sessionId);

        localStorage.removeItem('carryOnSessionId');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error resetting session:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--carry-on-dark-blue)] rounded-xl p-6 border border-[var(--carry-on-medium-blue)]">
      <h3 className="text-lg font-semibold text-white mb-2">Reset Session</h3>
      <p className="text-[var(--carry-on-gray)] mb-4">
        Clear all your progress and start fresh. This action cannot be undone.
      </p>
      <button
        onClick={handleReset}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RotateCcw size={18} />
        {loading ? 'Resetting...' : 'Reset Session'}
      </button>
    </div>
  );
}
