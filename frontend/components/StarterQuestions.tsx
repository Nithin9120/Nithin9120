import React from 'react';
import { Cpu, Activity, FileCode, Search, BookOpen, Terminal, Image as ImageIcon, ClipboardList } from 'lucide-react';
import { STARTER_QUESTIONS } from '../constants';

interface StarterQuestionsProps {
    onSelect: (question: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
    'cpu': <Cpu size={18} className="text-brand-600" />,
    'activity': <Activity size={18} className="text-brand-600" />,
    'file-code': <FileCode size={18} className="text-brand-600" />,
    'search': <Search size={18} className="text-brand-600" />,
    'book-open': <BookOpen size={18} className="text-brand-600" />,
    'terminal': <Terminal size={18} className="text-brand-600" />,
    'image': <ImageIcon size={18} className="text-brand-600" />,
    'clipboard-list': <ClipboardList size={18} className="text-brand-600" />,
};

export const StarterQuestions: React.FC<StarterQuestionsProps> = ({ onSelect }) => {
    return (
        <div className="w-full max-w-3xl mx-auto mt-8 mb-4">
            <p className="text-sm text-slate-500 mb-3 text-center font-medium">Advanced Architectural Queries</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {STARTER_QUESTIONS.map((q) => (
                    <button
                        key={q.id}
                        onClick={() => onSelect(q.text)}
                        className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-brand-500 hover:shadow-md transition-all text-left group"
                    >
                        <div className="mt-0.5 p-2 bg-brand-50 rounded-lg group-hover:bg-brand-100 transition-colors">
                            {iconMap[q.icon]}
                        </div>
                        <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium leading-snug">
                            {q.text}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
