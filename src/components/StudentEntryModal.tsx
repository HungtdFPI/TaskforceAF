import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

interface StudentEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
}

export function StudentEntryModal({ isOpen, onClose, onSubmit, initialData }: StudentEntryModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        student_code: initialData?.student_code || '',
        student_name: initialData?.student_name || '',
        class_name: initialData?.class_name || '',
        subject: initialData?.subject || '',
        study_status: initialData?.study_status || 'Học đi',
        assessment_date: initialData?.assessment_date || new Date().toISOString().split('T')[0],
        warn_10: initialData?.warn_10 || false,
        warn_15_17: initialData?.warn_15_17 || false,
        warn_20: initialData?.warn_20 || false,
        banned: initialData?.banned || false,
        status_detail: initialData?.status_detail || '',
        teacher_note: initialData?.teacher_note || '',
    });

    if (!isOpen) return null;

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-slate-900">
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-900">
                        {initialData ? 'Cập nhật thông tin sinh viên' : 'Nhập thông tin sinh viên'}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5 text-slate-500" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="student_name">Họ và tên</Label>
                            <Input
                                id="student_name"
                                required
                                value={formData.student_name}
                                onChange={e => handleChange('student_name', e.target.value)}
                                placeholder="Nguyễn Văn A"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="student_code">Mã sinh viên</Label>
                            <Input
                                id="student_code"
                                required
                                value={formData.student_code}
                                onChange={e => handleChange('student_code', e.target.value)}
                                placeholder="SV001"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="class_name">Lớp</Label>
                            <Input
                                id="class_name"
                                required
                                value={formData.class_name}
                                onChange={e => handleChange('class_name', e.target.value)}
                                placeholder="GD08201"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subject">Môn học</Label>
                            <Input
                                id="subject"
                                required
                                value={formData.subject}
                                onChange={e => handleChange('subject', e.target.value)}
                                placeholder="Print Making"
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase mb-4">Trạng thái & Đánh giá</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                                <Label htmlFor="study_status">Trạng thái học tập</Label>
                                <select
                                    id="study_status"
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.study_status}
                                    onChange={e => handleChange('study_status', e.target.value)}
                                >
                                    <option value="Học đi">Học đi</option>
                                    <option value="Học lại">Học lại</option>
                                    <option value="Bảo lưu">Bảo lưu</option>
                                    <option value="Nghỉ học">Nghỉ học</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="assessment_date">Ngày đánh giá</Label>
                                <Input
                                    id="assessment_date"
                                    type="date"
                                    value={formData.assessment_date}
                                    onChange={e => handleChange('assessment_date', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.warn_10}
                                    onChange={e => handleChange('warn_10', e.target.checked)}
                                    className="accent-yellow-500 w-5 h-5"
                                />
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Vắng 10%</Badge>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.warn_15_17}
                                    onChange={e => handleChange('warn_15_17', e.target.checked)}
                                    className="accent-orange-500 w-5 h-5"
                                />
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Vắng 15-17%</Badge>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.warn_20}
                                    onChange={e => handleChange('warn_20', e.target.checked)}
                                    className="accent-red-500 w-5 h-5"
                                />
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Vắng 20%</Badge>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.banned}
                                    onChange={e => handleChange('banned', e.target.checked)}
                                    className="accent-slate-900 w-5 h-5"
                                />
                                <Badge variant="destructive">Cấm thi (AF)</Badge>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="status_detail">Tình trạng chi tiết (SV)</Label>
                                <textarea
                                    id="status_detail"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.status_detail}
                                    onChange={e => handleChange('status_detail', e.target.value)}
                                    placeholder="Ghi chú chi tiết về tình trạng sinh viên..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="teacher_note">Chăm sóc của Giảng viên</Label>
                                <textarea
                                    id="teacher_note"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.teacher_note}
                                    onChange={e => handleChange('teacher_note', e.target.value)}
                                    placeholder="Phương án hỗ trợ, nhắc nhở..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Hủy bỏ
                        </Button>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
                            {loading ? 'Đang lưu...' : 'Lưu thông tin'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
