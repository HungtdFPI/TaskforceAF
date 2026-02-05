import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { type Report } from '../types';
import { EditableTable } from '../components/ReportTable';
import { ReportCard } from '../components/ReportCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, Send, PlusCircle, Trash2, RefreshCw, PenSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import { StudentEntryModal } from '../components/StudentEntryModal';

import { DateFilter, type DateFilterType } from '../components/DateFilter';
import { ExportButton } from '../components/ExportButton';

export default function LecturerDashboard() {
    const { user, profile } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

    const isGuest = user?.role === ('guest' as any) || user?.id?.startsWith('demo-');

    useEffect(() => {
        if (user) fetchReports();
    }, [user]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const data = await api.fetchReports(
                user?.id || '',
                isGuest,
                user?.role,
                profile?.campus
            );
            setReports(data);
        } catch (error) {
            toast.error('Không thể tải danh sách báo cáo');
        }
        setLoading(false);
    };

    const handleUpdateReport = (updatedReport: Report) => {
        setReports(reports.map(r => r.id === updatedReport.id ? updatedReport : r));
    };

    const handleSaveReport = async (report: Report) => {
        await api.updateReport(report, isGuest);
    };

    const handleDeleteReport = async (reportId: string) => {
        try {
            await api.deleteReport(reportId, isGuest);
            setReports(prev => prev.filter(r => r.id !== reportId));
        } catch (error) {
            console.error(error);
            throw error; // Re-throw to let child component handle UI feedback if needed
        }
    };

    const handleCreateReport = async (data: any) => {
        if (!user || !profile) return;
        try {
            const reportData = {
                ...data,
                lecturer_id: user.id,
                campus: profile.campus,
            };
            await api.createReport(reportData, isGuest);
            toast.success('Đã thêm sinh viên thành công');
            fetchReports();
        } catch (error) {
            toast.error('Lỗi khi thêm sinh viên');
            console.error(error);
        }
    };

    const handleSubmitAll = async () => {
        const draftReports = reports.filter(r => r.status === 'draft');
        if (draftReports.length === 0) {
            toast.info('Không có báo cáo nào ở trạng thái Nháp để gửi.');
            return;
        }

        const confirm = window.confirm(`Bạn có chắc muốn gửi ${draftReports.length} báo cáo? Sau khi gửi bạn sẽ không thể chỉnh sửa.`);
        if (!confirm) return;

        try {
            await api.submitReports(draftReports.map(r => r.id), isGuest);
            toast.success('Đã gửi báo cáo thành công');
            fetchReports();
        } catch (error) {
            toast.error('Gửi báo cáo thất bại');
        }
    };

    const handleGenerateMock = async () => {
        if (!user || !profile) return;
        const confirm = window.confirm('Tạo dữ liệu mẫu (5 sinh viên)?');
        if (!confirm) return;
        try {
            await api.createMockData(user.id, profile.campus, isGuest);
            toast.success('Đã tạo dữ liệu mẫu');
            fetchReports();
        } catch (e) {
            toast.error('Lỗi tạo dữ liệu');
        }
    };

    const handleClearMock = async () => {
        if (!user) return;
        const confirm = window.confirm('Xóa TẤT CẢ các báo cáo đang ở trạng thái Nháp?');
        if (!confirm) return;
        try {
            await api.clearDrafts(user.id, isGuest);
            toast.success('Đã xóa dữ liệu nháp');
            fetchReports();
        } catch (e) {
            toast.error('Lỗi xóa dữ liệu');
        }
    }

    const filteredReports = reports.filter(r => {
        // Text Search
        const matchesSearch = r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.student_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.class_name.toLowerCase().includes(searchTerm.toLowerCase());

        // Date Filter
        let matchesDate = true;
        if (dateFilter !== 'all') {
            const date = new Date(r.created_at);
            const now = new Date();
            date.setHours(0, 0, 0, 0);
            now.setHours(0, 0, 0, 0);

            if (dateFilter === 'today') {
                matchesDate = date.getTime() === now.getTime();
            } else if (dateFilter === 'week') {
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                const monday = new Date(now.setDate(diff));
                matchesDate = date >= monday;
            } else if (dateFilter === 'month') {
                matchesDate = date.getMonth() === new Date().getMonth() &&
                    date.getFullYear() === new Date().getFullYear();
            }
        }

        return matchesSearch && matchesDate;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý Báo cáo</h1>
                    <p className="text-slate-500">Nhập và theo dõi tình hình học tập của sinh viên.</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleClearMock} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Xóa nháp
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsEntryModalOpen(true)} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                        <PenSquare className="w-4 h-4 mr-2" />
                        Nhập thông tin
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleGenerateMock} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Tạo mẫu
                    </Button>
                    <ExportButton data={filteredReports} />
                    <Button onClick={handleSubmitAll} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                        <Send className="w-4 h-4 mr-2" />
                        Gửi báo cáo
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="shadow-sm border-slate-200">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm theo tên SV, mã SV hoặc lớp..."
                            className="pl-10 border-slate-200 bg-slate-50 focus:bg-white transition-all w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <DateFilter value={dateFilter} onChange={setDateFilter} />
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex justify-center p-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            ) : (
                <>
                    {/* Desktop View */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <EditableTable
                            reports={filteredReports}
                            onUpdate={handleUpdateReport}
                            onSave={handleSaveReport}
                            onDelete={handleDeleteReport}
                        />
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                        {filteredReports.map(report => (
                            <ReportCard
                                key={report.id}
                                report={report}
                                onUpdate={handleUpdateReport}
                                onSave={handleSaveReport}
                                onDelete={handleDeleteReport}
                            />
                        ))}
                        {filteredReports.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-xl border border-dashed border-slate-300">
                                <div className="bg-slate-50 p-4 rounded-full mb-4">
                                    <Search className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Chưa có dữ liệu báo cáo</h3>
                                <p className="text-slate-500 text-center max-w-sm mb-8">
                                    Hiện tại chưa có sinh viên nào trong danh sách. Bạn có thể tạo dữ liệu mẫu để thử nghiệm.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button variant="outline" onClick={handleGenerateMock} className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">
                                        <PlusCircle className="w-4 h-4 mr-2" />
                                        Tạo 5 sinh viên mẫu
                                    </Button>
                                    <Button onClick={() => setIsEntryModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                                        Thêm sinh viên thủ công
                                    </Button>
                                    {reports.length > 0 && reports.length !== filteredReports.length && (
                                        <Button variant="ghost" onClick={() => setSearchTerm('')}>
                                            Xóa bộ lọc tìm kiếm
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            <StudentEntryModal
                isOpen={isEntryModalOpen}
                onClose={() => setIsEntryModalOpen(false)}
                onSubmit={handleCreateReport}
            />
        </div>
    );
}
