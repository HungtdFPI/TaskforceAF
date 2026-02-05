import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, User, Smile } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../contexts/AuthContext';
import { api, type Message } from '../lib/api';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';

export function ChatWidget() {
    const { user, profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentGroup, setCurrentGroup] = useState('general');
    const [showEmoji, setShowEmoji] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const isGuest = user?.role === ('guest' as any) || user?.id?.startsWith('demo-') || false;
    const campus = profile?.campus || 'HN';
    const userRole = profile?.role || 'gv';

    // Define Groups and Permissions
    const groups = [
        { id: 'general', name: 'Chung', allowed: ['gv', 'cnbm', 'truong_nganh', 'dvsv', 'ho', 'guest'] },
        { id: 'lecturers', name: 'Giảng viên', allowed: ['gv', 'cnbm', 'truong_nganh', 'ho'] },
        { id: 'staff', name: 'Ban Đào tạo', allowed: ['cnbm', 'truong_nganh', 'dvsv', 'ho'] },
        { id: 'admin', name: 'Quản trị viên', allowed: ['truong_nganh', 'ho'] }
    ];

    const availableGroups = groups.filter(g => g.allowed.includes(userRole as string));

    useEffect(() => {
        if (availableGroups.length > 0 && !availableGroups.find(g => g.id === currentGroup)) {
            setCurrentGroup(availableGroups[0].id);
        }
    }, [userRole]);

    useEffect(() => {
        if (isOpen) {
            loadMessages();
            // Poll for new messages every 3 seconds
            const interval = setInterval(loadMessages, 3000);
            return () => clearInterval(interval);
        }
    }, [isOpen, campus, currentGroup]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const loadMessages = async () => {
        try {
            const data = await api.fetchMessages(campus, isGuest, currentGroup);
            setMessages(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || !user || !profile) return;

        const content = inputValue.trim();
        setInputValue('');
        setShowEmoji(false);
        setLoading(true);

        try {
            await api.sendMessage({
                user_id: user.id,
                user_name: profile.full_name || user.email || 'User',
                content: content,
                campus: campus,
                role: profile.role,
                group_id: currentGroup
            }, isGuest);
            await loadMessages();
        } catch (error) {
            toast.error('Không thể gửi tin nhắn');
        } finally {
            setLoading(false);
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setInputValue(prev => prev + emojiData.emoji);
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
            {isOpen ? (
                <Card className="w-80 sm:w-96 h-[500px] shadow-2xl border-slate-200 flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-200 rounded-2xl overflow-hidden ring-1 ring-black/5">
                    <CardHeader className="p-3 bg-slate-900 text-white flex flex-row items-center justify-between shrink-0">
                        <div className="flex flex-col gap-1 w-full mr-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                    <span className="font-semibold text-sm">Chat Nội bộ</span>
                                </div>
                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300">{campus}</span>
                            </div>

                            <Select value={currentGroup} onValueChange={setCurrentGroup}>
                                <SelectTrigger className="h-7 text-xs bg-white/10 border-white/10 text-white hover:bg-white/20 focus:ring-0 focus:ring-offset-0">
                                    <SelectValue placeholder="Chọn nhóm" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableGroups.map(g => (
                                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10 self-start"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-slate-50 relative">
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-3 space-y-3"
                        >
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                                    <MessageCircle className="w-10 h-10 mb-2 opacity-10" />
                                    <p>Chưa có tin nhắn trong nhóm này</p>
                                    <p>Hãy bắt đầu cuộc trò chuyện!</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.user_id === user.id;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex flex-col max-w-[85%] text-xs",
                                                isMe ? "self-end items-end" : "self-start items-start"
                                            )}
                                        >
                                            {!isMe && (
                                                <span className="text-[10px] text-slate-500 mb-0.5 ml-1 font-medium">
                                                    {msg.user_name} <span className="text-slate-300">•</span> {msg.role.toUpperCase()}
                                                </span>
                                            )}
                                            <div
                                                className={cn(
                                                    "px-3 py-2 rounded-2xl shadow-sm break-words",
                                                    isMe
                                                        ? "bg-blue-600 text-white rounded-tr-sm"
                                                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                                                )}
                                            >
                                                {msg.content}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Emoji Picker Popover */}
                        {showEmoji && (
                            <div className="absolute bottom-14 left-0 right-0 z-10 mx-2 shadow-xl rounded-xl overflow-hidden border border-slate-200">
                                <EmojiPicker
                                    onEmojiClick={onEmojiClick}
                                    width="100%"
                                    height={300}
                                    searchDisabled
                                    skinTonesDisabled
                                    previewConfig={{ showPreview: false }}
                                />
                            </div>
                        )}

                        <form onSubmit={handleSend} className="p-2 bg-white border-t border-slate-200 flex gap-2 shrink-0 items-center">
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className={cn("h-9 w-9 text-slate-400 hover:text-orange-500", showEmoji && "text-orange-500 bg-orange-50")}
                                onClick={() => setShowEmoji(!showEmoji)}
                            >
                                <Smile className="w-5 h-5" />
                            </Button>
                            <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Nhập tin nhắn..."
                                className="h-9 text-xs border-slate-200 focus-visible:ring-blue-500 flex-1"
                                onClick={() => setShowEmoji(false)}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                className="h-9 w-9 bg-blue-600 hover:bg-blue-700 shrink-0 shadow-md shadow-blue-200"
                                disabled={loading || !inputValue.trim()}
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="rounded-full w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-600/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
                >
                    <MessageCircle className="w-7 h-7 text-white group-hover:rotate-12 transition-transform" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 ring-2 ring-white"></span>
                    </span>
                </Button>
            )}
        </div>
    );
}
