import { Trophy } from 'lucide-react';

interface TestModeProps {
  sessionId: string;
}

export default function TestMode(_props: TestModeProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy size={40} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          Congratulations!
        </h1>
        <p className="text-xl text-[var(--carry-on-gray)] mb-8">
          You've reached 70% completion of your digital corpus. The "Test Me Now" feature is unlocked!
        </p>
        <div className="bg-[var(--carry-on-dark-blue)] rounded-2xl p-8 border border-[var(--carry-on-medium-blue)]">
          <h2 className="text-2xl font-bold text-white mb-4">Coming Soon</h2>
          <p className="text-[var(--carry-on-gray)] mb-6">
            This feature will allow you to test how well the AI has learned your values, beliefs, and perspectives.
            Ask it questions and see how accurately it responds as you would.
          </p>
          <div className="flex gap-4 justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--carry-on-accent-blue)]">9</div>
              <div className="text-sm text-[var(--carry-on-gray)]">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--carry-on-accent-blue)]">135</div>
              <div className="text-sm text-[var(--carry-on-gray)]">Questions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--carry-on-accent-blue)]">70%+</div>
              <div className="text-sm text-[var(--carry-on-gray)]">Complete</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
