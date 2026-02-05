import { useState } from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { type Report } from '../types';
import { toast } from 'sonner';
import { cn, getClassColor } from '../lib/utils';
import { NoteHistoryModal } from './NoteHistoryModal';
import { ReportVersioningModal } from './ReportVersioningModal';
import { Clock, Calendar } from 'lucide-react';

interface EditableTableProps {
    reports: Report[];
    onUpdate: (report: Report) => void;
    onSave: (report: Report) => Promise<void>;
    onDelete: (reportId: string) => Promise<void>;
    readOnly?: boolean;
}

const isRecentlyUpdated = (dateString: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3; // Highlight if updated in last 3 days
};

export function EditableTable({ reports, onUpdate, onSave, onDelete, readOnly = false }: EditableTableProps) {
    return (
        <div className="overflow-x-auto rounded-md border bg-white shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 uppercase font-semibold text-xs border-b">
                    <tr>
                        <th className="px-4 py-3 min-w-[50px] w-[50px]">STT</th>
                        <th className="px-4 py-3 w-[80px] text-center">Cơ sở</th>
                        <th className="px-4 py-3 min-w-[100px]">Trạng thái</th>
                        <th className="px-4 py-3 min-w-[180px]">Sinh viên</th>
                        <th className="px-4 py-3 min-w-[100px]">Lớp / Môn</th>
                        <th className="px-4 py-3 min-w-[200px]">Tình trạng chi tiết</th>
                        <th className="px-4 py-3 min-w-[160px]">Cảnh báo</th>
                        <th className="px-4 py-3 min-w-[120px]">Ngày đánh giá</th>
                        <th className="px-4 py-3 min-w-[250px]">Chăm sóc của GV</th>
                        <th className="px-4 py-3 min-w-[200px]">Phản hồi DVSV</th>
                        <th className="px-4 py-3 w-[60px] text-center">Lưu</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {reports.map((report, index) => (
                        <EditableRow
                            key={report.id}
                            report={report}
                            index={index + 1}
                            onUpdate={onUpdate}
                            onSave={onSave}
                            onDelete={onDelete}
                            readOnly={readOnly}
                        />
                    ))}
                    {reports.length === 0 && (
                        <tr>
                            <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                                Chưa có dữ liệu sinh viên.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

function EditableRow({ report, index, onUpdate, onSave, onDelete, readOnly }: {
    report: Report,
    index: number,
    onUpdate: (r: Report) => void,
    onSave: (r: Report) => Promise<void>,
    onDelete: (id: string) => Promise<void>,
    readOnly: boolean
}) {
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [historyModal, setHistoryModal] = useState<{
        isOpen: boolean;
        type: 'status_detail' | 'teacher_note' | 'dvsv_note' | null;
        title: string;
        currentValue: string;
    }>({ isOpen: false, type: null, title: '', currentValue: '' });

    const [versioningModal, setVersioningModal] = useState<{
        isOpen: boolean;
        report: Report | null;
    }>({ isOpen: false, report: null });

    // Local state for immediate feedback
    const [formData, setFormData] = useState({
        warn_10: report.warn_10,
        warn_15_17: report.warn_15_17,
        warn_20: report.warn_20,
        banned: report.banned,
        status_detail: report.status_detail,
        teacher_note: report.teacher_note,
        dvsv_note: report.dvsv_note,
        dvsv_status: report.dvsv_status,
        study_status: report.study_status || 'Học đi',
        assessment_date: report.assessment_date,
    });

    const handleCheckboxChange = (field: keyof typeof formData) => {
        if (readOnly) return;
        setFormData(prev => {
            const newData = { ...prev, [field]: !prev[field as keyof typeof formData] };
            setIsDirty(true);
            return newData;
        });
    };

    // handleTextChange removed (unused)

    const saveRow = async () => {
        if (!isDirty || readOnly) return;
        setIsSaving(true);

        try {
            const updatedReport = {
                ...report,
                ...formData,
                updated_at: new Date().toISOString(),
            };

            await onSave(updatedReport);

            toast.success('Đã lưu dữ liệu');
            setIsDirty(false);
            onUpdate({ ...report, ...formData });
        } catch (err) {
            toast.error('Lưu thất bại');
            console.error(err);
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
    };

    const getRowColor = () => {
        if (formData.warn_20) return "bg-red-50 hover:bg-red-100/80";
        if (formData.warn_15_17) return "bg-orange-50 hover:bg-orange-100/80";
        if (isDirty) return "bg-blue-50/50 hover:bg-blue-100/50";
        return "hover:bg-gray-50 transition-colors";
    };

    return (
        <tr className={cn("transition-colors border-b", getRowColor())}>
            <td className="px-4 py-3 text-center text-gray-500">{index}</td>
            <td className="px-4 py-3 text-center">
                <Badge variant="outline" className={cn(
                    "font-medium",
                    report.campus === 'HN' && "bg-orange-50 text-orange-700 border-orange-200",
                    report.campus === 'DN' && "bg-blue-50 text-blue-700 border-blue-200",
                    report.campus === 'HCM' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                    report.campus === 'CT' && "bg-purple-50 text-purple-700 border-purple-200",
                )}>
                    {report.campus || 'HN'}
                </Badge>
            </td>
            <td className="px-4 py-3">
                <Badge variant="secondary" className={cn(
                    "font-normal",
                    formData.study_status === 'Học đi' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                    {formData.study_status}
                </Badge>
            </td>
            <td className="px-4 py-3">
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 cursor-pointer hover:underline" title="Xem chi tiết">
                        {report.student_name}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{report.student_code}</span>
                </div>
                {report.banned && <Badge variant="destructive" className="mt-1 text-[10px] h-5 w-fit">Cấm thi</Badge>}
            </td>
            <td className="px-4 py-3">
                <div className="flex flex-col">
                    <span className={cn(
                        "font-medium px-2 py-0.5 rounded-md w-fit text-xs border",
                        getClassColor(report.class_name)
                    )}>
                        {report.class_name}
                    </span>
                    <span className="text-xs text-slate-500 truncate max-w-[120px] mt-1" title={report.subject}>{report.subject}</span>
                </div>
            </td>

            <td className="px-4 py-3 align-top">
                <div className="relative group">
                    <div className="text-xs p-2 border rounded bg-slate-50 min-h-[80px] max-h-[120px] overflow-y-auto whitespace-pre-wrap text-slate-700">
                        {formData.status_detail || <span className="text-slate-400 italic">Chưa có ghi chú</span>}
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-1 right-1 h-6 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        onClick={() => setHistoryModal({
                            isOpen: true,
                            type: 'status_detail',
                            title: 'Tình trạng chi tiết',
                            currentValue: formData.status_detail
                        })}
                    >
                        <Clock className="w-3 h-3 mr-1" /> Lịch sử
                    </Button>
                </div>
            </td>

            {/* Checkboxes Group */}
            <td className="px-4 py-3">
                <div className="flex flex-col space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.warn_10}
                            onChange={() => handleCheckboxChange('warn_10')}
                            disabled={readOnly}
                            className="accent-yellow-500 w-4 h-4"
                        />
                        <span className={cn("text-xs", formData.warn_10 ? "text-yellow-600 font-medium" : "")}>Vắng 10%</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.warn_15_17}
                            onChange={() => handleCheckboxChange('warn_15_17')}
                            disabled={readOnly}
                            className="accent-orange-500 w-4 h-4"
                        />
                        <span className={cn("text-xs", formData.warn_15_17 ? "text-orange-600 font-bold" : "")}>Vắng 15-17%</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.warn_20}
                            onChange={() => handleCheckboxChange('warn_20')}
                            disabled={readOnly}
                            className="accent-red-500 w-4 h-4"
                        />
                        <span className={cn("text-xs", formData.warn_20 ? "text-red-600 font-bold" : "")}>Vắng 20%</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.banned}
                            onChange={() => handleCheckboxChange('banned')}
                            disabled={readOnly}
                            className="accent-black w-4 h-4"
                        />
                        <span className={cn("text-xs font-semibold", formData.banned ? "text-red-600 font-bold" : "text-gray-600")}>AF</span>
                    </label>
                </div>
            </td>

            <td className="px-4 py-3 text-xs text-gray-600">
                <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                        <span>{formData.assessment_date}</span>
                        {isRecentlyUpdated(report.updated_at) && (
                            <div title="Mới cập nhật gần đây" className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        )}
                    </div>
                    {!readOnly && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                            onClick={() => setVersioningModal({ isOpen: true, report })}
                            title="Cập nhật tiến độ / Thêm lịch sử"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </td>

            <td className="px-4 py-3 align-top">
                <div className="relative group">
                    <div className="text-xs p-2 border rounded bg-slate-50 min-h-[80px] max-h-[120px] overflow-y-auto whitespace-pre-wrap text-slate-700">
                        {formData.teacher_note || <span className="text-slate-400 italic">Chưa có ghi chú</span>}
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-1 right-1 h-6 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        onClick={() => setHistoryModal({
                            isOpen: true,
                            type: 'teacher_note',
                            title: 'Chăm sóc của GV',
                            currentValue: formData.teacher_note
                        })}
                    >
                        <Clock className="w-3 h-3 mr-1" /> Lịch sử
                    </Button>
                </div>
            </td>
            <td className="px-4 py-3 align-top">
                <div className="mb-1 flex justify-end">
                    {formData.dvsv_status === 'success' && <Badge className="bg-green-600 text-[10px] px-1 h-5">DVSV: Thành công</Badge>}
                    {formData.dvsv_status === 'failed' && <Badge className="bg-red-600 text-[10px] px-1 h-5">DVSV: Thất bại</Badge>}
                    {formData.dvsv_status === 'pending' && <Badge variant="outline" className="text-yellow-600 text-[10px] px-1 h-5 bg-yellow-50">DVSV: Chờ xử lý</Badge>}
                </div>
                <div className="relative group">
                    <div className="text-xs p-2 border rounded bg-slate-50 min-h-[80px] max-h-[120px] overflow-y-auto whitespace-pre-wrap text-slate-700">
                        {formData.dvsv_note || <span className="text-slate-400 italic">Chưa có phản hồi</span>}
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-1 right-1 h-6 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        onClick={() => setHistoryModal({
                            isOpen: true,
                            type: 'dvsv_note',
                            title: 'Phản hồi DVSV',
                            currentValue: formData.dvsv_note
                        })}
                    >
                        <Clock className="w-3 h-3 mr-1" /> Lịch sử
                    </Button>
                </div>
            </td>

            <td className="px-4 py-3 text-center align-top pt-8">
                {isDirty && (
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={saveRow}
                        disabled={isSaving}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                )}
                {!readOnly && (
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleDelete}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-1"
                        title="Xóa báo cáo"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </td>

            {historyModal.type && (
                <NoteHistoryModal
                    isOpen={historyModal.isOpen}
                    onClose={() => setHistoryModal(prev => ({ ...prev, isOpen: false }))}
                    reportId={report.id}
                    studentName={report.student_name}
                    type={historyModal.type!}
                    title={historyModal.title}
                    currentValue={historyModal.currentValue}
                    onSave={async (newValue) => {
                        const type = historyModal.type!;
                        // Update local state and save immediately
                        const updatedReport = {
                            ...report,
                            ...formData,
                            [type]: newValue,
                            updated_at: new Date().toISOString()
                        };

                        // Update form data state
                        setFormData(prev => ({ ...prev, [type]: newValue }));

                        // Save to backend
                        await onSave(updatedReport);
                        toast.success('Đã cập nhật ghi chú');

                        // Close modal
                        setHistoryModal(prev => ({ ...prev, isOpen: false }));

                        // Sync with parent list
                        onUpdate(updatedReport);
                    }}
                />
            )}
            {versioningModal.isOpen && versioningModal.report && (
                <ReportVersioningModal
                    isOpen={versioningModal.isOpen}
                    onClose={() => setVersioningModal({ isOpen: false, report: null })}
                    report={versioningModal.report}
                    onSuccess={(updatedReport) => {
                        // Sync Local State
                        setFormData(prev => ({
                            ...prev,
                            assessment_date: updatedReport.assessment_date,
                            status_detail: updatedReport.status_detail,
                            teacher_note: updatedReport.teacher_note,
                            warn_10: updatedReport.warn_10,
                            warn_15_17: updatedReport.warn_15_17,
                            warn_20: updatedReport.warn_20,
                            banned: updatedReport.banned
                        }));
                        onUpdate(updatedReport);
                        toast.success('Đã cập nhật trạng thái mới');
                    }}
                />
            )}
        </tr>
    );
}
