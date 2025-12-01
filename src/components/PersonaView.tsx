import { useState } from 'react';
import { Send } from 'lucide-react';

export default function PersonaView() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const handleSend = () => {
    if (!message.trim()) return;

    setMessages([...messages, { role: 'user', content: message }]);
    setMessage('');

    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Thank you for sharing. This helps build your digital corpus.'
      }]);
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-[var(--carry-on-medium-blue)] bg-[var(--carry-on-dark-blue)] px-8 py-6">
        <h1 className="text-2xl font-bold text-white">Digital Corpus Builder</h1>
        <p className="text-[var(--carry-on-gray)] mt-1">Share your thoughts, memories, and wisdom</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-[var(--carry-on-gray)] mb-4">
                Start building your digital legacy by sharing your thoughts and experiences.
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                    msg.role === 'user'
                      ? 'bg-[var(--carry-on-accent-blue)] text-white'
                      : 'bg-[var(--carry-on-dark-blue)] text-white border border-[var(--carry-on-medium-blue)]'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-[var(--carry-on-medium-blue)] bg-[var(--carry-on-dark-blue)] p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-4">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Share your thoughts..."
              className="flex-1 px-6 py-4 bg-[var(--carry-on-medium-blue)] border border-[var(--carry-on-medium-blue)] rounded-xl text-white placeholder-[var(--carry-on-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--carry-on-accent-blue)]"
            />
            <button
              onClick={handleSend}
              className="px-6 py-4 bg-[var(--carry-on-accent-blue)] text-white rounded-xl hover:bg-opacity-90 transition-all"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
