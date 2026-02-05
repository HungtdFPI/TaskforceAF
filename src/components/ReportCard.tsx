import { useState } from 'react';
import { type Report } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Save, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReportCardProps {
    report: Report;
    onUpdate: (report: Report) => void;
    onSave: (report: Report) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    readOnly?: boolean;
}

export function ReportCard({ report, onUpdate, onSave, onDelete, readOnly = false }: ReportCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [formData, setFormData] = useState({
        warn_10: report.warn_10,
        warn_15_17: report.warn_15_17,
        warn_20: report.warn_20,
        banned: report.banned,
        status_detail: report.status_detail,
        teacher_note: report.teacher_note,
    });
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleCheckbox = (key: keyof typeof formData) => {
        if (readOnly) return;
        setFormData(prev => {
            const next = { ...prev, [key]: !prev[key as keyof typeof formData] };
            setIsDirty(true);
            return next;
        });
    };

    const handleText = (key: keyof typeof formData, val: string) => {
        if (readOnly) return;
        setFormData(prev => {
            const next = { ...prev, [key]: val };
            setIsDirty(true);
            return next;
        });
    };

    const handleSave = async () => {
        if (!isDirty) return;
        setIsSaving(true);
        try {
            const updatedReport = {
                ...report,
                ...formData,
                updated_at: new Date().toISOString()
            };

            await onSave(updatedReport);

            toast.success("Đã cập nhật!");
            onUpdate(updatedReport);
            setIsDirty(false);
        } catch (e) {
            toast.error("Lỗi khi lưu");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (readOnly) return;
        const confirm = window.confirm('Bạn có chắc muốn xóa báo cáo này?');
        if (confirm) {
            await onDelete(report.id);
            toast.success('Đã xóa báo cáo');
        }
    }

    return (
        <Card className="mb-4 border-l-4 border-l-primary shadow-sm">
            <CardHeader className="p-4 pb-2" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base font-bold text-primary">{report.student_name}</CardTitle>
                        <div className="text-xs text-muted-foreground mt-1">
                            {report.student_code} • {report.class_name}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {formData.banned && <Badge variant="destructive" className="text-[10px] h-5 px-1.5">Cấm thi</Badge>}
                        {formData.warn_20 && !formData.banned && <Badge variant="destructive" className="text-[10px] h-5 px-1.5 bg-red-500">20%</Badge>}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 pt-2">
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <label className={readOnly ? 'opacity-70' : ''}>
                        <input type="checkbox" checked={formData.warn_10} onChange={() => handleCheckbox('warn_10')} disabled={readOnly} className="mr-2" />
                        <span className="text-sm">Vắng 10%</span>
                    </label>
                    <label className={readOnly ? 'opacity-70' : ''}>
                        <input type="checkbox" checked={formData.warn_15_17} onChange={() => handleCheckbox('warn_15_17')} disabled={readOnly} className="mr-2" />
                        <span className="text-sm">Vắng 15-17%</span>
                    </label>
                    <label className={readOnly ? 'opacity-70' : ''}>
                        <input type="checkbox" checked={formData.warn_20} onChange={() => handleCheckbox('warn_20')} disabled={readOnly} className="mr-2" />
                        <span className="text-sm">Vắng 20%</span>
                    </label>
                    <label className={readOnly ? 'opacity-70' : ''}>
                        <input type="checkbox" checked={formData.banned} onChange={() => handleCheckbox('banned')} disabled={readOnly} className="mr-2 accent-red-600" />
                        <span className="text-sm font-bold text-red-600">Cấm thi</span>
                    </label>
                </div>

                {isExpanded && (
                    <div className="space-y-3 animate-accordion-down">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Tình trạng chi tiết</label>
                            <textarea
                                className="w-full text-sm p-2 border rounded resize-none h-20"
                                value={formData.status_detail}
                                onChange={(e) => handleText('status_detail', e.target.value)}
                                disabled={readOnly}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Chăm sóc của GV</label>
                            <textarea
                                className="w-full text-sm p-2 border rounded resize-none h-20"
                                value={formData.teacher_note}
                                onChange={(e) => handleText('teacher_note', e.target.value)}
                                disabled={readOnly}
                            />
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="p-2 bg-gray-50 flex justify-between items-center rounded-b-lg">
                <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-xs text-muted-foreground mr-auto">
                    {isExpanded ? <><ChevronUp className="w-3 h-3 mr-1" /> Thu gọn</> : <><ChevronDown className="w-3 h-3 mr-1" /> Xem thêm</>}
                </Button>

                {!readOnly && (
                    <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500 mr-2 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}

                {isDirty && !readOnly && (
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                        Lưu
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
