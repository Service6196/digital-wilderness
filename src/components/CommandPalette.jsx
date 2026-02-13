
import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Command, Hash } from 'lucide-react';

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);

    // Static items for now - in a real app these might come from props or an API
    const items = [
        { id: 'home', title: '索引 (Index)', url: '/', icon: <Command size={14} /> },
        { id: 'journal', title: '思考 (Journal)', url: '/journal', icon: <FileText size={14} /> },
        { id: 'works', title: '作品 (Works)', url: '/works', icon: <FileText size={14} /> },
        { id: 'signals', title: '信号 (Signals)', url: '/signals', icon: <FileText size={14} /> },
        { id: 'stack', title: '工具 (Stack)', url: '/stack', icon: <Hash size={14} /> },
        { id: 'uses', title: '装备清单 (Uses)', url: '/uses', icon: <Hash size={14} /> },
        { id: 'now', title: '当下 (Now)', url: '/now', icon: <FileText size={14} /> },
        { id: 'manual', title: '了解我 (About)', url: '/manual', icon: <FileText size={14} /> },
    ];

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            setQuery('');
        }
    }, [isOpen]);

    const filteredItems = items.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase())
    );

    const handleSelect = (url) => {
        setIsOpen(false);
        window.location.href = url;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh] px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
            />

            {/* Dialog */}
            <div className="relative w-full max-w-xl bg-[var(--bg)] border border-[var(--grid-line)] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center px-4 py-3 border-b border-[var(--grid-line)]">
                    <Search className="text-[var(--text-muted)] w-5 h-5 mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search commands..."
                        className="flex-1 bg-transparent border-none outline-none text-[var(--text)] placeholder-[var(--text-muted)] text-lg h-8"
                    />
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                        <span className="text-xs border border-[var(--grid-line)] px-1.5 py-0.5 rounded">ESC</span>
                    </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto py-2">
                    {filteredItems.length === 0 ? (
                        <div className="px-4 py-8 text-center text-[var(--text-muted)]">
                            No results found.
                        </div>
                    ) : (
                        <div className="px-2">
                            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-3 py-2">Suggestions</div>
                            {filteredItems.map((item, index) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelect(item.url)}
                                    className="w-full text-left flex items-center gap-3 px-3 py-3 rounded hover:bg-[var(--active-bg)] hover:text-[var(--active-text)] group transition-colors"
                                >
                                    <div className="text-[var(--text-muted)] group-hover:text-[var(--active-text)]">
                                        {item.icon}
                                    </div>
                                    <span className="flex-1">{item.title}</span>
                                    {index === 0 && (
                                        <span className="text-[10px] text-[var(--text-muted)] border border-[var(--grid-line)] px-1.5 rounded group-hover:border-[var(--active-text)]/30 group-hover:text-[var(--active-text)]">
                                            ↵
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-4 py-2 border-t border-[var(--grid-line)] bg-[var(--bg-subtle)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><span className="border border-[var(--grid-line)] px-1 rounded">↑↓</span> to navigate</span>
                        <span className="flex items-center gap-1"><span className="border border-[var(--grid-line)] px-1 rounded">↵</span> to select</span>
                    </div>
                    <div>
                        Wait for typing...
                    </div>
                </div>
            </div>
        </div>
    );
}
