import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Terminal, RefreshCw, Cpu } from 'lucide-react';
import { Chat } from '@google/genai';
import { Message } from './types';
import { createEmbeddedChatSession, generateCircuitImage } from './services/geminiService';
import { ChatMessage } from './components/ChatMessage';
import { StarterQuestions } from './components/StarterQuestions';

const App: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSessionInitialized, setIsSessionInitialized] = useState(false);
    
    const chatSessionRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Initialize chat session
    useEffect(() => {
        if (!chatSessionRef.current) {
            try {
                chatSessionRef.current = createEmbeddedChatSession();
                setIsSessionInitialized(true);
                
                // Add initial greeting
                setMessages([
                    {
                        id: 'welcome-msg',
                        role: 'model',
                        text: "System initialized. I am Jasmine, your Expert Embedded Systems Architect.\n\nMy knowledge base covers 20 core domains including: MCU Platforms, RTOS, Embedded Linux, Edge AI, FPGA integration, PCB Design, IoT, Communication Protocols, and Industrial Applications. I can generate complete project structures, comprehensive project reports, detailed budgets with INR pricing, debug HardFaults, and write production-ready firmware.\n\nI am fully integrated with Google Search to find the latest documentation, research papers, and component datasheets. I can also generate images of circuit schematics and block diagrams.\n\nProvide your system specifications, architecture query, or request a project report to begin."
                    }
                ]);
            } catch (error) {
                console.error("Failed to initialize chat session:", error);
                setMessages([{
                    id: 'error-init',
                    role: 'model',
                    text: "System Error: Failed to initialize knowledge base connection. Please verify network status and refresh.",
                    isError: true
                }]);
            }
        }
    }, []);

    // Auto-scroll to bottom
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
        }
    }, [inputValue]);

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || !chatSessionRef.current || isLoading) return;

        const userMsgId = Date.now().toString();
        const botMsgId = (Date.now() + 1).toString();

        // Add user message
        setMessages(prev => [...prev, { id: userMsgId, role: 'user', text: text.trim() }]);
        setInputValue('');
        setIsLoading(true);

        // Check if the user is asking for an image generation (including block diagrams)
        const isImageRequest = /(create|generate|draw|make|show|include|provide|design|need).*(image|picture|diagram|schematic|circuit)/i.test(text) || /(block diagram|circuit diagram|schematic)/i.test(text);
        const isBlockDiagram = /block diagram/i.test(text);

        let loadingText = 'Processing request...';
        if (isBlockDiagram) {
            loadingText = 'Designing system architecture and generating block diagram...';
        } else if (isImageRequest) {
            loadingText = 'Verifying circuit connections and generating schematic...';
        }

        // Add placeholder for bot message
        setMessages(prev => [...prev, { 
            id: botMsgId, 
            role: 'model', 
            text: isImageRequest ? loadingText : '', 
            isStreaming: true 
        }]);

        try {
            // Start Image Generation in parallel and catch errors immediately to prevent unhandled rejections
            let imagePromise: Promise<string | Error> | null = null;
            if (isImageRequest) {
                imagePromise = generateCircuitImage(text).catch(err => err instanceof Error ? err : new Error(String(err)));
            }

            // Handle Standard Text/Search Chat (always do this to get the verification text)
            const responseStream = await chatSessionRef.current.sendMessageStream({ message: text.trim() });
            
            let isFirstChunk = true;
            for await (const chunk of responseStream) {
                const newGroundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
                
                setMessages(prev => prev.map(msg => {
                    if (msg.id === botMsgId) {
                        let currentText = msg.text;
                        if (isFirstChunk && isImageRequest) {
                            currentText = ''; // Clear the placeholder text once streaming starts
                        }
                        const updatedText = currentText + (chunk.text || '');
                        
                        // Safely merge grounding chunks without duplicates
                        let updatedChunks = msg.groundingChunks || [];
                        if (newGroundingChunks.length > 0) {
                            const existingUris = new Set(updatedChunks.map(c => c.web?.uri).filter(Boolean));
                            const uniqueNewChunks = newGroundingChunks.filter(c => c.web?.uri && !existingUris.has(c.web.uri));
                            updatedChunks = [...updatedChunks, ...uniqueNewChunks];
                        }

                        return { 
                            ...msg, 
                            text: updatedText,
                            ...(updatedChunks.length > 0 ? { groundingChunks: updatedChunks } : {})
                        };
                    }
                    return msg;
                }));
                isFirstChunk = false;
            }

            // If it was an image request, wait for the image to finish and append it
            if (isImageRequest && imagePromise) {
                const result = await imagePromise;
                if (result instanceof Error) {
                    console.error("Image generation failed:", result);
                    const errorMsg = result.message || 'Unknown error';
                    
                    // Fallback to a placeholder image if the API is blocked by CORS/Adblocker
                    setMessages(prev => prev.map(msg => 
                        msg.id === botMsgId ? { 
                            ...msg, 
                            imageUrl: 'https://picsum.photos/800/600',
                            text: msg.text + `\n\n> ⚠️ **Image API Blocked:** Your browser or network blocked the connection to the image generation server (Error: ${errorMsg}). A placeholder image is displayed below as a fallback.`
                        } : msg
                    ));
                } else if (typeof result === 'string') {
                    setMessages(prev => prev.map(msg => 
                        msg.id === botMsgId ? { 
                            ...msg, 
                            imageUrl: result
                        } : msg
                    ));
                }
            }
        } catch (error: any) {
            console.error("Error sending message:", error);
            
            setMessages(prev => prev.map(msg => {
                if (msg.id === botMsgId) {
                    const existingText = msg.text || "";
                    
                    // If we already generated a good chunk of text (like a table), preserve it and append a warning.
                    // Otherwise, show the standard error message.
                    if (existingText.length > 100) {
                        return {
                            ...msg,
                            text: existingText + "\n\n> ⚠️ **Note:** The response was interrupted due to an API limit or network timeout, but the partial result is preserved above.",
                            isStreaming: false
                        };
                    } else {
                        return {
                            ...msg,
                            text: "An error occurred while communicating with the AI. Please try a simpler query or ask it to estimate prices without searching the web.",
                            isError: true,
                            isStreaming: false
                        };
                    }
                }
                return msg;
            }));
        } finally {
            setMessages(prev => prev.map(msg => 
                msg.id === botMsgId ? { ...msg, isStreaming: false } : msg
            ));
            setIsLoading(false);
            // Refocus input after sending (desktop mostly)
            if (window.innerWidth > 768) {
                inputRef.current?.focus();
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(inputValue);
        }
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear the session context and restart?")) {
            chatSessionRef.current = createEmbeddedChatSession();
            setMessages([
                {
                    id: Date.now().toString(),
                    role: 'model',
                    text: "Session context cleared. Ready for new architectural queries, web searches, or image generation."
                }
            ]);
        }
    };

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto w-full bg-tech-light shadow-2xl sm:border-x sm:border-slate-200">
            {/* Header */}
            <header className="bg-tech-dark text-white px-6 py-4 flex items-center justify-between shrink-0 z-10 shadow-md border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="bg-brand-600 p-2 rounded-lg">
                        <Cpu size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-wide">Jasmine</h1>
                        <p className="text-brand-100 text-xs font-medium flex items-center gap-1">
                            <Terminal size={12} />
                            Expert-Level Firmware & Hardware Assistant
                        </p>
                    </div>
                </div>
                <button 
                    onClick={handleReset}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                    title="Reset Session Context"
                >
                    <RefreshCw size={18} />
                </button>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
                {messages.length === 1 && isSessionInitialized && (
                    <StarterQuestions onSelect={handleSendMessage} />
                )}
                
                <div className="max-w-3xl mx-auto w-full">
                    {messages.map((msg) => (
                        <ChatMessage key={msg.id} message={msg} />
                    ))}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </main>

            {/* Input Area */}
            <footer className="bg-white border-t border-slate-200 p-4 shrink-0">
                <div className="max-w-3xl mx-auto relative">
                    <div className="flex items-end gap-2 bg-slate-50 border border-slate-300 rounded-2xl p-2 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all shadow-sm">
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Query architecture, generate a project report/budget, debug code, or search the web..."
                            className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-2.5 px-3 text-slate-800 placeholder-slate-400 text-base font-mono text-sm"
                            disabled={isLoading || !isSessionInitialized}
                            rows={1}
                        />
                        <button
                            onClick={() => handleSendMessage(inputValue)}
                            disabled={!inputValue.trim() || isLoading || !isSessionInitialized}
                            className={`p-3 rounded-xl flex-shrink-0 transition-all ${
                                inputValue.trim() && !isLoading
                                    ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-md'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <Send size={20} className={isLoading ? 'animate-pulse' : ''} />
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-[11px] text-slate-400">
                            Jasmine provides expert guidance, real-time web searches, and image generation. Always validate implementations against official MCU errata.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;
