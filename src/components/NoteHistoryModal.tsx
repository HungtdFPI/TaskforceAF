import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Loader2, Send, Clock, User } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface NoteHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportId: string;
    studentName: string;
    type: 'status_detail' | 'teacher_note' | 'dvsv_note';
    title: string;
    currentValue: string;
    onSave: (newValue: string) => void;
}

export function NoteHistoryModal({
    isOpen,
    onClose,
    reportId,
    studentName,
    type,
    title,
    currentValue,
    onSave
}: NoteHistoryModalProps) {
    const { user, profile } = useAuth();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [saving, setSaving] = useState(false);

    // Determine if user is guest/demo based on ID or role
    const isGuest = user?.id?.startsWith('demo-') || user?.role === ('guest' as any);

    useEffect(() => {
        if (isOpen && reportId) {
            fetchHistory();
            setNewNote(''); // Reset input
        }
    }, [isOpen, reportId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const history = await api.fetchLogs(reportId, isGuest);
            // Filter by type
            const filtered = history.filter((h: any) => h.type === type);
            setLogs(filtered);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!newNote.trim()) return;
        setSaving(true);
        try {
            // 1. Add to logs
            await api.addLog({
                report_id: reportId,
                user_id: user?.id,
                user_name: profile?.full_name || user?.email,
                content: newNote,
                type: type
            }, isGuest);

            // 2. Update main report value (append or replace?)
            // We want to show the LATEST note in the table, but maybe we can just show the new note?
            // Or maybe append it? Let's append with date for the "Summary" view if desired,
            // but the prompt says "Save history".
            // Let's assume the Table shows the *latest* important note. 
            // So we will trigger onSave with the NEW content so it displays in the table.

            onSave(newNote);

            // Refresh logs
            await fetchHistory();
            setNewNote('');
        } catch (error) {
            console.error(error);
        }
        setSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        Lịch sử: {title}
                    </DialogTitle>
                    <p className="text-sm text-slate-500">Sinh viên: <span className="font-semibold">{studentName}</span></p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-[200px] p-1 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400" /></div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">Chưa có lịch sử ghi chú.</div>
                    ) : (
                        <div className="space-y-4">
                            {logs.map((log) => (
                                <div key={log.id} className="flex gap-3 text-sm">
                                    <div className="mt-1">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                            <User className="w-4 h-4 text-slate-500" />
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-slate-50 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-semibold text-slate-700">{log.user_name}</span>
                                            <span className="text-xs text-slate-400">
                                                {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 whitespace-pre-wrap">{log.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t pt-4 mt-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Thêm ghi chú mới</label>
                        <Textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Nhập nội dung ghi chú..."
                            className="min-h-[80px]"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={onClose} disabled={saving}>Đóng</Button>
                            <Button onClick={handleSave} disabled={saving || !newNote.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                Lưu ghi chú
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
