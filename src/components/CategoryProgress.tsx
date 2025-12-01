import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface CategoryProgressProps {
  sessionId: string;
}

export default function CategoryProgress({ sessionId }: CategoryProgressProps) {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    loadCategories();
  }, [sessionId]);

  async function loadCategories() {
    const { data } = await supabase
      .from('category_progress')
      .select('*')
      .eq('session_id', sessionId);

    if (data) {
      setCategories(data);
    }
  }

  return (
    <div>
      <h3 className="text-xl font-bold text-white mb-4">Category Progress</h3>
      {categories.length === 0 ? (
        <p className="text-[var(--carry-on-gray)]">No categories tracked yet</p>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-[var(--carry-on-medium-blue)] rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-medium">{cat.category_name}</span>
                <span className="text-[var(--carry-on-gray)]">{cat.questions_answered}/{cat.total_questions}</span>
              </div>
              <div className="w-full bg-[var(--carry-on-navy)] rounded-full h-2">
                <div
                  className="bg-[var(--carry-on-yellow)] h-2 rounded-full transition-all"
                  style={{ width: `${(cat.questions_answered / cat.total_questions) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
