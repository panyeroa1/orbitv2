import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { ai } from '../lib/gemini';
import { Message } from '../types';

interface ChatInterfaceProps {
  model: string;
  title: string;
  description: string;
  systemInstruction?: string;
  icon?: React.ReactNode;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ model, title, description, systemInstruction, icon }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use a ref to keep track of the chat session to persist context if needed, 
  // but for simplicity we recreate/continue based on props.
  // We will create a new chat instance for this session.
  const chatSessionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize chat session
    chatSessionRef.current = ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction,
      }
    });
  }, [model, systemInstruction]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      if (!chatSessionRef.current) { // Fallback if ref is null for some reason
         chatSessionRef.current = ai.chats.create({ model });
      }

      // Stream response
      const resultStream = await chatSessionRef.current.sendMessageStream({ message: userMsg.text });
      
      let fullText = '';
      const modelMsgId = Date.now().toString();
      
      // Add placeholder for model response
      setMessages(prev => [...prev, { role: 'model', text: '', timestamp: new Date() }]);

      for await (const chunk of resultStream) {
        const text = chunk.text;
        fullText += text;
        
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.role === 'model') {
            lastMsg.text = fullText;
          }
          return newMessages;
        });
      }

    } catch (err: any) {
      console.error("Chat error", err);
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${err.message}`, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface/50 rounded-xl border border-secondary/20 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-secondary/20 bg-surface flex items-center space-x-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          {icon || <Bot size={20} />}
        </div>
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-xs text-secondary">{description}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-secondary opacity-50 space-y-2">
            <Sparkles size={40} />
            <p>Start a conversation...</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-br-none' 
                : 'bg-white/10 text-gray-100 rounded-bl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-surface border-t border-secondary/20">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 bg-black/20 border border-secondary/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary placeholder-secondary/50"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
