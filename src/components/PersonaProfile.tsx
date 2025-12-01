import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Brain, Sparkles } from 'lucide-react';

interface Insight {
  id: string;
  category: string;
  key_phrase: string;
  content: string;
  confidence: number;
  category_name: string;
  created_at: string;
}

interface PersonaProfileProps {
  sessionId: string;
}

export default function PersonaProfile({ sessionId }: PersonaProfileProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();

    const subscription = supabase
      .channel(`persona_insights_${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'persona_insights',
        filter: `session_id=eq.${sessionId}`
      }, () => {
        loadInsights();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  async function loadInsights() {
    const { data } = await supabase
      .from('persona_insights')
      .select(`
        *,
        category_buckets!persona_insights_category_bucket_id_fkey(name)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (data) {
      const formattedInsights = data.map(insight => ({
        ...insight,
        category_name: insight.category_buckets?.name || 'General',
        confidence: parseFloat(insight.confidence as any)
      }));
      setInsights(formattedInsights);
    }

    setLoading(false);
  }

  const groupedInsights = insights.reduce((acc, insight) => {
    const category = insight.category_name;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(insight);
    return acc;
  }, {} as Record<string, Insight[]>);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-900/20 border-green-600/50';
    if (confidence >= 0.6) return 'bg-yellow-900/20 border-yellow-600/50';
    return 'bg-orange-900/20 border-orange-600/50';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white text-xl">Loading your persona...</div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl text-center">
          <Brain size={64} className="mx-auto mb-4 text-[var(--carry-on-gray)]" />
          <h2 className="text-2xl font-bold text-white mb-2">No Insights Yet</h2>
          <p className="text-[var(--carry-on-gray)]">
            Start conversations in the Digital Corpus to build your persona profile.
            The AI will analyze your responses and create insights about your values, beliefs, and personality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain size={32} className="text-[var(--carry-on-accent-blue)]" />
            <h1 className="text-3xl font-bold text-white">Your Persona Profile</h1>
          </div>
          <p className="text-[var(--carry-on-gray)]">
            AI-generated insights based on your conversations. These insights form your digital legacy.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-8">
          <div className="bg-[var(--carry-on-dark-blue)] rounded-xl p-6 border border-[var(--carry-on-medium-blue)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Total Insights</h3>
                <p className="text-3xl font-bold text-[var(--carry-on-accent-blue)]">{insights.length}</p>
              </div>
              <Sparkles size={32} className="text-[var(--carry-on-yellow)]" />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedInsights).map(([category, categoryInsights]) => (
            <div key={category}>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-[var(--carry-on-accent-blue)] rounded-full" />
                {category}
              </h2>

              <div className="space-y-4">
                {categoryInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`rounded-xl p-6 border ${getConfidenceBg(insight.confidence)}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {insight.key_phrase}
                        </h3>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`font-medium ${getConfidenceColor(insight.confidence)}`}>
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                          <span className="text-[var(--carry-on-gray)]">•</span>
                          <span className="text-[var(--carry-on-gray)] capitalize">
                            {insight.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[var(--carry-on-gray)] leading-relaxed">
                      {insight.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
