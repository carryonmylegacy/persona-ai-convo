import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Circle } from 'lucide-react';

interface CategoryProgressProps {
  sessionId: string;
}

interface CategoryWithProgress {
  id: string;
  name: string;
  slug: string;
  description: string;
  target_questions: number;
  order_index: number;
  questions_asked: number;
  is_completed: boolean;
}

export default function CategoryProgress({ sessionId }: CategoryProgressProps) {
  const [categories, setCategories] = useState<CategoryWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategoryProgress();

    const subscription = supabase
      .channel(`category_progress_${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_category_progress',
        filter: `session_id=eq.${sessionId}`
      }, () => {
        loadCategoryProgress();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  async function loadCategoryProgress() {
    const { data: allCategories } = await supabase
      .from('category_buckets')
      .select('*')
      .order('order_index', { ascending: true });

    if (!allCategories) {
      setLoading(false);
      return;
    }

    const { data: progress } = await supabase
      .from('session_category_progress')
      .select('*')
      .eq('session_id', sessionId);

    const progressMap = new Map(
      progress?.map(p => [p.category_id, p]) || []
    );

    const categoriesWithProgress = allCategories.map(cat => ({
      ...cat,
      questions_asked: progressMap.get(cat.id)?.questions_asked || 0,
      is_completed: progressMap.get(cat.id)?.is_completed || false
    }));

    setCategories(categoriesWithProgress);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="text-center text-[var(--carry-on-gray)]">
        Loading categories...
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-bold text-white mb-4">Exploration Journey</h3>
      <p className="text-[var(--carry-on-gray)] text-sm mb-6">
        Track your progress through different aspects of your digital legacy
      </p>

      <div className="space-y-3">
        {categories.map((category) => {
          const progressPercent = Math.min(
            Math.round((category.questions_asked / category.target_questions) * 100),
            100
          );
          const isActive = category.questions_asked > 0 && !category.is_completed;

          return (
            <div
              key={category.id}
              className={`relative rounded-xl p-4 border transition-all ${
                isActive
                  ? 'bg-[var(--carry-on-accent-blue)]/10 border-[var(--carry-on-accent-blue)]'
                  : category.is_completed
                  ? 'bg-green-900/20 border-green-600/50'
                  : 'bg-[var(--carry-on-medium-blue)] border-[var(--carry-on-medium-blue)]'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="mt-1">
                  {category.is_completed ? (
                    <CheckCircle2 size={20} className="text-green-400" />
                  ) : (
                    <Circle
                      size={20}
                      className={
                        isActive
                          ? 'text-[var(--carry-on-accent-blue)]'
                          : 'text-[var(--carry-on-gray)]'
                      }
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-white">{category.name}</h4>
                    <span className="text-sm text-[var(--carry-on-gray)]">
                      {category.questions_asked}/{category.target_questions}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--carry-on-gray)] mb-3">
                    {category.description}
                  </p>
                  <div className="w-full bg-[var(--carry-on-navy)] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        category.is_completed
                          ? 'bg-green-400'
                          : isActive
                          ? 'bg-[var(--carry-on-accent-blue)]'
                          : 'bg-[var(--carry-on-gray)]'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-[var(--carry-on-medium-blue)] rounded-xl">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--carry-on-gray)]">Overall Progress</span>
          <span className="text-white font-medium">
            {categories.reduce((sum, cat) => sum + cat.questions_asked, 0)} / 135 questions
          </span>
        </div>
      </div>
    </div>
  );
}
