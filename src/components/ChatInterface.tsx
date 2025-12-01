import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import PersonaView from './PersonaView';
import TestMode from './TestMode';

export default function ChatInterface() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeSession();
  }, []);

  async function initializeSession() {
    const storedSessionId = localStorage.getItem('carryOnSessionId');

    if (storedSessionId) {
      const { data } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', storedSessionId)
        .maybeSingle();

      if (data) {
        setSessionId(storedSessionId);
        setProgressPercentage(data.progress_percentage || 0);
        setLoading(false);
        return;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: newSession, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        progress_percentage: 0,
        milestone_stage: 'foundation',
        questions_answered: 0,
        target_questions: 135
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      setLoading(false);
      return;
    }

    if (newSession) {
      localStorage.setItem('carryOnSessionId', newSession.id);
      setSessionId(newSession.id);
      setProgressPercentage(0);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white text-xl">Unable to create session</div>
      </div>
    );
  }

  if (progressPercentage >= 70) {
    return <TestMode sessionId={sessionId} />;
  }

  return <PersonaView sessionId={sessionId} />;
}
