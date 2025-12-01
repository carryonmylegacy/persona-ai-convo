import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface PersonaViewProps {
  sessionId: string;
}

export default function PersonaView({ sessionId }: PersonaViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<any>(null);
  const [categoryProgress, setCategoryProgress] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    loadConversationState();
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);

      if (data.length === 0) {
        await sendInitialGreeting();
      }
    }
  }

  async function loadConversationState() {
    const { data: state } = await supabase
      .from('conversation_state')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (state?.current_category_id) {
      const { data: category } = await supabase
        .from('category_buckets')
        .select('*')
        .eq('id', state.current_category_id)
        .single();

      setCurrentCategory(category);

      const { data: progress } = await supabase
        .from('session_category_progress')
        .select('*')
        .eq('session_id', sessionId)
        .eq('category_id', state.current_category_id)
        .maybeSingle();

      setCategoryProgress(progress);
    } else {
      await initializeConversationState();
    }
  }

  async function initializeConversationState() {
    const { data: firstCategory } = await supabase
      .from('category_buckets')
      .select('*')
      .order('order_index', { ascending: true })
      .limit(1)
      .single();

    if (firstCategory) {
      await supabase.from('conversation_state').upsert({
        session_id: sessionId,
        current_category_id: firstCategory.id,
        depth_level: 1,
        topics_explored: [],
        questions_asked: []
      });

      await supabase.from('session_category_progress').insert({
        session_id: sessionId,
        category_id: firstCategory.id,
        questions_asked: 0,
        insights_captured: 0,
        is_completed: false
      });

      setCurrentCategory(firstCategory);
    }
  }

  async function sendInitialGreeting() {
    const greeting = `Welcome! I'm here to help you build your digital legacy by having meaningful conversations about what matters most to you.

We'll explore different aspects of your life through natural conversation. There's no rush - take your time to share your thoughts authentically.

Let's start with something fundamental: What would you say are your top priorities in life right now?`;

    const { data } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: greeting
      })
      .select()
      .single();

    if (data) {
      setMessages([data]);
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const { data: userMsg } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: userMessage
      })
      .select()
      .single();

    if (userMsg) {
      setMessages(prev => [...prev, userMsg]);
    }

    const response = await generateResponse(userMessage);

    const { data: assistantMsg } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: response
      })
      .select()
      .single();

    if (assistantMsg) {
      setMessages(prev => [...prev, assistantMsg]);
    }

    await updateProgress();
    setLoading(false);
  }

  async function generateResponse(userMessage: string): Promise<string> {
    const allMessages = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    const conversationHistory = allMessages.data || [];

    const categoryContext = currentCategory
      ? `Current exploration area: ${currentCategory.name} - ${currentCategory.description}`
      : '';

    const progressInfo = categoryProgress
      ? `Questions in this category: ${categoryProgress.questions_asked}/${currentCategory?.target_questions || 15}`
      : '';

    const systemPrompt = `You are a thoughtful AI companion helping someone build their digital legacy. Your role is to:

1. Have natural, engaging conversations about life, values, beliefs, and experiences
2. Ask thoughtful follow-up questions that deepen understanding
3. Be empathetic and non-judgmental
4. Help explore topics thoroughly before moving on
5. Recognize when a topic has been adequately covered

${categoryContext}
${progressInfo}

Guidelines:
- Ask ONE clear question at a time
- Build on previous responses naturally
- Acknowledge and validate their sharing
- When they've answered 12-15 questions in a category, gently transition to the next topic area
- Keep responses concise but warm (2-4 sentences plus one question)`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_XAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: messages,
          temperature: 0.7,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        throw new Error('Grok API error');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling Grok:', error);
      return "Thank you for sharing that. Could you tell me more about what that means to you?";
    }
  }

  async function updateProgress() {
    if (!currentCategory || !categoryProgress) return;

    const newQuestionsAsked = categoryProgress.questions_asked + 1;
    const targetQuestions = currentCategory.target_questions || 15;

    await supabase
      .from('session_category_progress')
      .update({
        questions_asked: newQuestionsAsked,
        last_question_at: new Date().toISOString(),
        is_completed: newQuestionsAsked >= targetQuestions
      })
      .eq('session_id', sessionId)
      .eq('category_id', currentCategory.id);

    const { data: allProgress } = await supabase
      .from('session_category_progress')
      .select('questions_asked')
      .eq('session_id', sessionId);

    const totalQuestions = allProgress?.reduce((sum, p) => sum + p.questions_asked, 0) || 0;
    const progressPercentage = Math.min(Math.round((totalQuestions / 135) * 100), 100);

    await supabase
      .from('chat_sessions')
      .update({
        progress_percentage: progressPercentage,
        questions_answered: totalQuestions
      })
      .eq('id', sessionId);

    if (newQuestionsAsked >= targetQuestions) {
      await moveToNextCategory();
    }
  }

  async function moveToNextCategory() {
    const { data: nextCategory } = await supabase
      .from('category_buckets')
      .select('*')
      .gt('order_index', currentCategory.order_index)
      .order('order_index', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextCategory) {
      await supabase
        .from('conversation_state')
        .update({
          current_category_id: nextCategory.id
        })
        .eq('session_id', sessionId);

      await supabase.from('session_category_progress').insert({
        session_id: sessionId,
        category_id: nextCategory.id,
        questions_asked: 0,
        insights_captured: 0,
        is_completed: false
      });

      setCurrentCategory(nextCategory);
      setCategoryProgress({ questions_asked: 0 });
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="border-b border-[var(--carry-on-medium-blue)] bg-[var(--carry-on-dark-blue)] px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Building Your Digital Corpus</h1>
            {currentCategory && (
              <p className="text-[var(--carry-on-gray)] mt-1">
                Currently exploring: {currentCategory.name}
              </p>
            )}
          </div>
          {categoryProgress && currentCategory && (
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[var(--carry-on-yellow)]" />
              <span className="text-[var(--carry-on-gray)] text-sm">
                {categoryProgress.questions_asked}/{currentCategory.target_questions} questions
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                  message.role === 'user'
                    ? 'bg-[var(--carry-on-accent-blue)] text-white'
                    : 'bg-[var(--carry-on-dark-blue)] text-white border border-[var(--carry-on-medium-blue)]'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[var(--carry-on-dark-blue)] text-white border border-[var(--carry-on-medium-blue)] rounded-2xl px-6 py-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-[var(--carry-on-gray)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[var(--carry-on-gray)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[var(--carry-on-gray)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-[var(--carry-on-medium-blue)] bg-[var(--carry-on-dark-blue)] p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
              placeholder="Share your thoughts..."
              disabled={loading}
              className="flex-1 px-6 py-4 bg-[var(--carry-on-medium-blue)] border border-[var(--carry-on-medium-blue)] rounded-xl text-white placeholder-[var(--carry-on-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--carry-on-accent-blue)] disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-6 py-4 bg-[var(--carry-on-accent-blue)] text-white rounded-xl hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
