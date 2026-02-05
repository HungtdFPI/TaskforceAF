import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
// Checkbox import removed
import { Loader2, History, ArrowRight, Save, Calendar } from 'lucide-react';
import { type Report } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ReportVersioningModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: Report;
    onSuccess: (updatedReport: Report) => void;
}

export function ReportVersioningModal({ isOpen, onClose, report, onSuccess }: ReportVersioningModalProps) {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    // Form State for NEW version
    const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [newNotes, setNewNotes] = useState(report.status_detail);
    const [teacherNote, setTeacherNote] = useState(report.teacher_note);
    const [warnings, setWarnings] = useState({
        warn_10: report.warn_10,
        warn_15_17: report.warn_15_17,
        warn_20: report.warn_20,
        banned: report.banned
    });

    const isGuest = user?.id?.startsWith('demo-') || user?.role === ('guest' as any);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
            // Reset form to current report state
            setNewNotes(report.status_detail);
            setTeacherNote(report.teacher_note);
            setWarnings({
                warn_10: report.warn_10,
                warn_15_17: report.warn_15_17,
                warn_20: report.warn_20,
                banned: report.banned
            });
            setNewDate(format(new Date(), 'yyyy-MM-dd'));
        }
    }, [isOpen, report]);

    const fetchHistory = async () => {
        try {
            const logs = await api.fetchLogs(report.id, isGuest);
            setHistory(logs.filter((l: any) => l.type === 'full_update'));
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // 1. Archive CURRENT state as history
            const oldState = {
                assessment_date: report.assessment_date,
                warn_10: report.warn_10,
                warn_15_17: report.warn_15_17,
                warn_20: report.warn_20,
                banned: report.banned,
                status_detail: report.status_detail,
                teacher_note: report.teacher_note,
                note: 'Cập nhật sang ngày mới: ' + format(new Date(newDate), 'dd/MM/yyyy')
            };

            await api.addLog({
                report_id: report.id,
                user_id: user?.id,
                user_name: profile?.full_name || 'User',
                content: JSON.stringify(oldState), // Store full object stringified
                type: 'full_update'
            }, isGuest);

            // 2. Update Report with NEW state
            const updatedReport: Report = {
                ...report,
                assessment_date: format(new Date(newDate), 'dd/MM/yyyy'),
                status_detail: newNotes,
                teacher_note: teacherNote,
                warn_10: warnings.warn_10,
                warn_15_17: warnings.warn_15_17,
                warn_20: warnings.warn_20,
                banned: warnings.banned,
                updated_at: new Date().toISOString()
            };

            await api.updateReport(updatedReport, isGuest);

            // Notify higher levels (CNBM, Head Office, etc.)
            await api.createNotification({
                campus: report.campus || 'HN',
                title: 'Báo cáo được cập nhật',
                message: `GV ${profile?.full_name || 'Giảng viên'} đã cập nhật tiến độ cho sinh viên ${report.student_name}: "${newNotes ? newNotes.substring(0, 50) + '...' : 'Cập nhật ngày đánh giá'}"`,
                type: 'report_updated',
                related_id: report.id
            }, isGuest);

            toast.success('Đã cập nhật tiến độ mới');
            onSuccess(updatedReport);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi lưu');
        }
        setLoading(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-600" />
                        Cập nhật Tiến độ & Lưu Lịch sử
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* Left: New Update Form */}
                    <div className="space-y-4 border-r pr-4">
                        <h3 className="font-semibold text-sm text-slate-700 mb-2 flex items-center">
                            <ArrowRight className="w-4 h-4 mr-1 text-emerald-600" />
                            Cập nhật Mới
                        </h3>

                        <div className="space-y-2">
                            <Label className="text-slate-700">Ngày đánh giá mới</Label>
                            <div className="relative">
                                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="pl-8 text-slate-900 bg-white border-slate-300"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-700">Tình trạng chi tiết</Label>
                            <Textarea
                                value={newNotes}
                                onChange={(e) => setNewNotes(e.target.value)}
                                placeholder="Nhập tình trạng hiện tại..."
                                className="min-h-[80px] text-slate-900 bg-white border-slate-300 placeholder:text-slate-400"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-700">Chăm sóc của GV</Label>
                            <Textarea
                                value={teacherNote}
                                onChange={(e) => setTeacherNote(e.target.value)}
                                placeholder="Nhập nội dung chăm sóc..."
                                className="min-h-[80px] text-slate-900 bg-white border-slate-300 placeholder:text-slate-400"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-700">Cảnh báo</Label>
                            <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-md border border-slate-200">
                                <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 hover:text-indigo-600">
                                    <input type="checkbox" checked={warnings.warn_10} onChange={() => setWarnings(p => ({ ...p, warn_10: !p.warn_10 }))} className="w-4 h-4 rounded text-indigo-600 border-slate-300" />
                                    Vắng 10%
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 hover:text-indigo-600">
                                    <input type="checkbox" checked={warnings.warn_15_17} onChange={() => setWarnings(p => ({ ...p, warn_15_17: !p.warn_15_17 }))} className="w-4 h-4 rounded text-indigo-600 border-slate-300" />
                                    Vắng 15-17%
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 hover:text-indigo-600">
                                    <input type="checkbox" checked={warnings.warn_20} onChange={() => setWarnings(p => ({ ...p, warn_20: !p.warn_20 }))} className="w-4 h-4 rounded text-indigo-600 border-slate-300" />
                                    Vắng 20%
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer text-red-600 hover:text-red-700 font-medium">
                                    <input type="checkbox" checked={warnings.banned} onChange={() => setWarnings(p => ({ ...p, banned: !p.banned }))} className="w-4 h-4 rounded text-red-600 border-slate-300" />
                                    Cấm thi (AF)
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Right: History Timeline */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-slate-700 mb-2 flex items-center">
                            <History className="w-4 h-4 mr-1 text-slate-500" />
                            Lịch sử đã lưu
                        </h3>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {history.length === 0 ? (
                                <p className="text-sm text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">Chưa có lịch sử cập nhật.</p>
                            ) : (
                                history.map((log) => {
                                    let content: any = {};
                                    try {
                                        content = JSON.parse(log.content);
                                    } catch (e) {
                                        content = { note: log.content };
                                    }

                                    return (
                                        <div key={log.id} className="text-sm border-l-2 border-indigo-200 pl-4 py-1 relative">
                                            <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white ring-1 ring-indigo-200"></div>

                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-semibold text-indigo-700 text-xs bg-indigo-50 px-2 py-0.5 rounded">
                                                    {content.assessment_date || format(new Date(log.created_at), 'dd/MM/yyyy')}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {format(new Date(log.created_at), 'HH:mm dd/MM', { locale: vi })}
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                {content.status_detail && (
                                                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 shadow-sm relative group">
                                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Tình trạng</div>
                                                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{content.status_detail}</p>
                                                    </div>
                                                )}

                                                {content.teacher_note && (
                                                    <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 shadow-sm relative">
                                                        <div className="text-[10px] uppercase font-bold text-blue-400 mb-1">Chăm sóc GV</div>
                                                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{content.teacher_note}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {content.warn_10 && <span className="text-[10px] font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded">Vắng 10%</span>}
                                                {content.warn_15_17 && <span className="text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded">Vắng 15-17%</span>}
                                                {content.warn_20 && <span className="text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded">Vắng 20%</span>}
                                                {content.banned && <span className="text-[10px] font-bold bg-slate-900 text-white border border-slate-700 px-1.5 py-0.5 rounded">Cấm thi</span>}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-6 border-t pt-4">
                    <Button variant="outline" onClick={onClose}>Hủy</Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Lưu & Cập nhật
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
