import React, { useState, useRef, useEffect } from 'react';
import { chatApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Bot, Send, User, Sparkles, HelpCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
  'What is the status of my filed complaints?',
  'How long does Garbage collection resolution take?',
  'How does the SLA tracking system work?',
  'How can I earn civic achievement badges?'
];

export default function AIChatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user?.name || 'Citizen'}! 👋 I am CivicBot, your AI assistant powered by Claude. I have access to your filed complaints and category SLAs. How can I help you today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const newMessages = [...messages, { role: 'user', content: text.trim() }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Send message history to backend
      const res = await chatApi.sendMessages(newMessages.map(m => ({ role: m.role, content: m.content })));
      setMessages([...newMessages, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      toast.error('Chatbot error: ' + (err.response?.data?.message || err.message));
      setMessages([...newMessages, { role: 'assistant', content: '⚠️ Sorry, I encountered an issue retrieving an AI response. Please check your CLAUDE_API_KEY in backend/.env.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Chat history cleared. How else can I assist you, ${user?.name}?`
      }
    ]);
  };

  return (
    <div style={{ maxWidth: 900, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 16, flexShrink: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bot size={24} color="var(--purple)" /> CivicBot AI Assistant
          </h1>
          <p className="page-subtitle">Ask questions in natural language about your complaints & city services (Claude 3.5)</p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={handleClear} title="Reset Conversation">
          <RefreshCw size={14} /> Reset Chat
        </button>
      </div>

      {/* Chat Messages Card Container */}
      <div className="card" style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'var(--navy-card)', padding: 0, overflow: 'hidden'
      }}>

        {/* Scrollable Messages Area */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((m, idx) => {
            const isBot = m.role === 'assistant';
            return (
              <div
                key={idx}
                style={{
                  display: 'flex', gap: 12,
                  alignSelf: isBot ? 'flex-start' : 'flex-end',
                  maxWidth: '85%'
                }}
              >
                {isBot && (
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: 'linear-gradient(135deg, var(--purple), var(--blue))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, boxShadow: 'var(--shadow-glow)'
                  }}>
                    <Bot size={18} color="white" />
                  </div>
                )}

                <div style={{
                  padding: '12px 16px', borderRadius: 14,
                  background: isBot ? 'var(--navy-mid)' : 'var(--blue)',
                  color: 'var(--white)',
                  border: isBot ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap'
                }}>
                  {m.content}
                </div>

                {!isBot && (
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <User size={16} color="var(--white)" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {loading && (
            <div style={{ display: 'flex', gap: 12, alignSelf: 'flex-start' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--purple), var(--blue))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Bot size={18} color="white" />
              </div>

              <div style={{
                padding: '12px 18px', borderRadius: 14, background: 'var(--navy-mid)',
                border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 6
              }}>
                <span className="spinner" style={{ width: 14, height: 14 }} />
                <span style={{ fontSize: 13, color: 'var(--gray-300)' }}>CivicBot is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompt Chips */}
        {messages.length < 5 && (
          <div style={{
            padding: '10px 20px', background: 'rgba(255,255,255,0.02)',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', gap: 8, overflowX: 'auto'
          }}>
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                disabled={loading}
                style={{
                  fontSize: 12, padding: '6px 12px', borderRadius: 16,
                  background: 'rgba(139,92,246,0.1)', color: 'var(--purple)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <Sparkles size={11} style={{ marginRight: 4, display: 'inline-block' }} />
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Chat Input Bar */}
        <form
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          style={{
            padding: '14px 20px', background: 'var(--navy-mid)',
            borderTop: '1px solid var(--border)',
            display: 'flex', gap: 10, alignItems: 'center'
          }}
        >
          <input
            type="text"
            placeholder="Ask CivicBot about your complaints, status, SLAs or city services..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            style={{ flex: 1, height: 42, fontSize: 14 }}
          />

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !input.trim()}
            style={{ height: 42, padding: '0 20px', flexShrink: 0 }}
          >
            {loading ? <span className="spinner" /> : <><Send size={16} /> Send</>}
          </button>
        </form>

      </div>
    </div>
  );
}
