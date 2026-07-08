import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Cpu, AlertCircle, Globe, Download, Search as SearchIcon } from 'lucide-react';
import { Message } from '../types';

interface ChatMessageProps {
    message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const isUser = message.role === 'user';

    return (
        <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-sm
                    ${isUser ? 'bg-brand-600 ml-3' : 'bg-tech-panel mr-3'}`}
                >
                    {isUser ? (
                        <User size={20} className="text-white" />
                    ) : (
                        <Cpu size={20} className="text-brand-500" />
                    )}
                </div>

                {/* Message Bubble */}
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}>
                    <div className="flex items-baseline mb-1 px-1">
                        <span className="text-xs font-medium text-slate-500">
                            {isUser ? 'You' : 'Jasmine'}
                        </span>
                    </div>
                    
                    <div className={`relative px-5 py-4 rounded-2xl shadow-sm text-sm md:text-base w-full
                        ${isUser 
                            ? 'bg-brand-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                        }
                        ${message.isError ? 'border-red-300 bg-red-50 text-red-800' : ''}
                    `}>
                        {message.isError ? (
                            <div className="flex items-center gap-2">
                                <AlertCircle size={18} className="text-red-500" />
                                <span>{message.text}</span>
                            </div>
                        ) : (
                            <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : ''}`}>
                                {message.text ? (
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            a(props) {
                                                const {node, ...rest} = props;
                                                const textContent = String(rest.children);
                                                const isPdf = rest.href?.toLowerCase().endsWith('.pdf');
                                                const isDownloadText = textContent.toLowerCase().includes('download');
                                                const isDatasheetSearch = textContent.toLowerCase().includes('datasheet') && 
                                                                         (textContent.toLowerCase().includes('find') || textContent.toLowerCase().includes('search'));
                                                
                                                // Style datasheet download links as primary buttons
                                                if (isPdf || isDownloadText) {
                                                    return (
                                                        <a 
                                                            {...rest} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            download
                                                            className="inline-flex items-center gap-2 px-4 py-2 my-2 mr-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-100 hover:border-brand-300 transition-colors font-semibold text-sm no-underline shadow-sm"
                                                            title="Right-click and 'Open link in new tab' if blocked by preview window"
                                                        >
                                                            <Download size={16} />
                                                            {rest.children}
                                                        </a>
                                                    );
                                                }

                                                // Style datasheet search links as prominent buttons to avoid 404 direct links
                                                if (isDatasheetSearch) {
                                                    return (
                                                        <a 
                                                            {...rest} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="inline-flex items-center gap-2 px-4 py-2 my-2 mr-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-100 hover:border-brand-300 transition-colors font-semibold text-sm no-underline shadow-sm"
                                                            title="Search for datasheet (Right-click -> Open in new tab if blocked)"
                                                        >
                                                            <SearchIcon size={16} />
                                                            {rest.children}
                                                        </a>
                                                    );
                                                }

                                                // Standard links
                                                return <a {...rest} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline font-medium" />;
                                            },
                                            code(props) {
                                                const {children, className, node, ...rest} = props;
                                                const match = /language-([\w-]+)/.exec(className || '');
                                                
                                                // Custom renderer for our safe BOM tables
                                                if (match && match[1] === 'bom-table') {
                                                    const lines = String(children).trim().split('\n');
                                                    // Filter out markdown separator lines like |---|---|
                                                    const dataLines = lines.filter(line => !/^[\s|:-]+$/.test(line));
                                                    
                                                    if (dataLines.length > 0) {
                                                        // Clean up leading/trailing pipes and split
                                                        const cleanLine = (line: string) => line.replace(/^\||\|$/g, '').split('|').map(s => s.trim());
                                                        const headers = cleanLine(dataLines[0]);
                                                        const rows = dataLines.slice(1).map(cleanLine);
                                                        
                                                        return (
                                                            <div className="overflow-x-auto my-6 rounded-xl border border-slate-200 shadow-sm">
                                                                <table className="min-w-full divide-y divide-slate-200 m-0">
                                                                    <thead className="bg-slate-100">
                                                                        <tr>
                                                                            {headers.map((h, i) => (
                                                                                <th key={i} className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-none">
                                                                                    {h.replace(/\*\*/g, '')}
                                                                                </th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="bg-white divide-y divide-slate-100">
                                                                        {rows.map((row, i) => {
                                                                            const isTotalRow = row.some(cell => cell.toLowerCase().includes('total'));
                                                                            return (
                                                                                <tr key={i} className={`${isTotalRow ? 'bg-brand-50 font-bold' : 'hover:bg-slate-50'} transition-colors`}>
                                                                                    {row.map((cell, j) => {
                                                                                        const isBold = cell.includes('**');
                                                                                        const text = cell.replace(/\*\*/g, '');
                                                                                        return (
                                                                                            <td key={j} className={`px-4 py-3 text-sm text-slate-700 border-none ${isBold ? 'font-bold text-brand-900' : ''}`}>
                                                                                                {text}
                                                                                            </td>
                                                                                        );
                                                                                    })}
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        );
                                                    }
                                                }
                                                
                                                // Inline code
                                                const isInline = !match;
                                                if (isInline) {
                                                    return <code className="bg-slate-100 text-brand-700 px-1.5 py-0.5 rounded text-sm font-mono" {...rest}>{children}</code>;
                                                }

                                                // Standard code blocks
                                                return (
                                                    <div className="relative my-4 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md">
                                                        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                                                            <span className="text-xs font-mono text-slate-400">{match[1]}</span>
                                                        </div>
                                                        <div className="p-4 overflow-x-auto">
                                                            <code className="text-sm font-mono text-slate-50" {...rest}>
                                                                {children}
                                                            </code>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        }}
                                    >
                                        {message.text}
                                    </ReactMarkdown>
                                ) : !message.imageUrl && (
                                    <div className="flex items-center h-6 gap-1">
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Render Generated Image if available */}
                        {message.imageUrl && (
                            <div className="mt-4 mb-2 relative group inline-block">
                                <img 
                                    src={message.imageUrl} 
                                    alt="Generated Circuit/Schematic" 
                                    className="rounded-lg max-w-full h-auto shadow-sm border border-slate-200" 
                                />
                                <a 
                                    href={message.imageUrl} 
                                    download="generated-diagram.jpg"
                                    className="absolute top-2 right-2 bg-slate-900/70 hover:bg-slate-900 text-white px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-xs font-medium shadow-md backdrop-blur-sm"
                                    title="Download as JPG"
                                >
                                    <Download size={14} /> Download JPG
                                </a>
                            </div>
                        )}

                        {/* Render Grounding Sources if available */}
                        {!isUser && message.groundingChunks && message.groundingChunks.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-200">
                                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                                    <Globe size={12} /> Sources
                                </p>
                                <ul className="flex flex-col gap-1.5">
                                    {message.groundingChunks.map((chunk, idx) => chunk.web && (
                                        <li key={idx} className="text-xs truncate flex items-center gap-2">
                                            <span className="w-1 h-1 bg-brand-400 rounded-full flex-shrink-0"></span>
                                            <a 
                                                href={chunk.web.uri} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-brand-600 hover:text-brand-800 hover:underline truncate"
                                                title={chunk.web.title || chunk.web.uri}
                                            >
                                                {chunk.web.title || chunk.web.uri}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
