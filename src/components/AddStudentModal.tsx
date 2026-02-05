import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddStudentModal({ isOpen, onClose, onSuccess }: AddStudentModalProps) {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        student_code: '',
        student_name: '',
        class_name: '',
        subject: '',
        study_status: 'Học đi', // Default as per Excel
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !profile) return;
        setLoading(true);

        try {
            await api.createReport({
                lecturer_id: user.id,
                campus: profile.campus,
                student_code: formData.student_code,
                student_name: formData.student_name,
                class_name: formData.class_name,
                subject: formData.subject,
                study_status: formData.study_status,
                assessment_date: new Date().toLocaleDateString('vi-VN'),
                // Initial defaults
                warn_10: false,
                warn_15_17: false,
                warn_20: false,
                banned: false,
                teacher_note: '',
                status_detail: '',
                dvsv_note: '',
                status: 'draft'
            }, user.role === 'guest' || user.id.startsWith('demo-'));

            toast.success('Đã thêm sinh viên mới');
            setFormData({ student_code: '', student_name: '', class_name: '', subject: '', study_status: 'Học đi' });
            onSuccess();
            onClose();
        } catch (error) {
            toast.error('Lỗi khi thêm sinh viên');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h3 className="font-bold text-lg">Thêm sinh viên vào danh sách</h3>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Mã Sinh viên</Label>
                            <Input
                                placeholder="VD: SV00123"
                                required
                                value={formData.student_code}
                                onChange={e => setFormData({ ...formData, student_code: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Lớp</Label>
                            <Input
                                placeholder="VD: GD18301"
                                required
                                value={formData.class_name}
                                onChange={e => setFormData({ ...formData, class_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Họ và Tên</Label>
                        <Input
                            placeholder="Nhập họ tên sinh viên"
                            required
                            value={formData.student_name}
                            onChange={e => setFormData({ ...formData, student_name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Môn học</Label>
                        <Input
                            placeholder="VD: Thiết kế đồ họa"
                            required
                            value={formData.subject}
                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Trạng thái ban đầu</Label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={formData.study_status}
                            onChange={e => setFormData({ ...formData, study_status: e.target.value })}
                        >
                            <option value="Học đi">Học đi</option>
                            <option value="Học lại">Học lại</option>
                            <option value="Bảo lưu">Bảo lưu</option>
                        </select>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>Huỷ bỏ</Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Thêm vào danh sách'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
