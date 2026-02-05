import { useEffect, useState } from 'react';
// import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { type Report } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Search, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { DateFilter, type DateFilterType } from '../components/DateFilter';
import { ExportButton } from '../components/ExportButton';

export default function ManagerDashboard() {
    const { user, profile } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState<DateFilterType>('all');

    useEffect(() => {
        if (user && profile) {
            fetchReports();
        }

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'mock_reports') {
                fetchReports();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Listen for internal updates too
        const handleInternalUpdate = () => fetchReports();
        window.addEventListener('reports_updated', handleInternalUpdate);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('reports_updated', handleInternalUpdate);
        };
    }, [user, profile]);

    const fetchReports = async () => {
        try {
            const data = await api.fetchReports(
                user?.id || '',
                // Check if guest/demo
                user?.role === ('guest' as any) || user?.id?.startsWith('demo-'),
                profile?.role, // FIX: Use profile.role (cnbm) instead of user.role (authenticated)
                profile?.campus
            );
            setReports(data);
        } catch (err) {
            console.error(err);
            toast.error('Lỗi tải dữ liệu báo cáo');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (reportId: string, currentStatus: string) => {
        if (currentStatus !== 'submitted') return;

        try {
            // Need a way to update status via API cleanly
            // Create a temporary object with just the fields we need to update
            // api.updateReport expects a full Report object usually, but for status update we can cheat slightly or fetch first
            // To be safe and reuse existing logic, let's find the report first
            const report = reports.find(r => r.id === reportId);
            if (!report) return;

            const updatedReport = { ...report, status: 'approved' as const };

            await api.updateReport(
                updatedReport,
                user?.role === ('guest' as any) || user?.id?.startsWith('demo-')
            );

            toast.success('Đã duyệt báo cáo');
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'approved' } : r));
        } catch (err) {
            toast.error('Lỗi khi duyệt');
            console.error(err);
        }
    };

    const handleReject = async (reportId: string, currentStatus: string) => {
        if (currentStatus !== 'submitted') return;
        if (!window.confirm('Trả lại báo cáo cho giảng viên sửa?')) return;

        try {
            const report = reports.find(r => r.id === reportId);
            if (!report) return;

            const updatedReport = { ...report, status: 'draft' as const };

            await api.updateReport(
                updatedReport,
                user?.role === ('guest' as any) || user?.id?.startsWith('demo-')
            );

            toast.info('Đã trả lại báo cáo');
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'draft' } : r));
        } catch (err) {
            toast.error('Lỗi khi trả lại');
        }
    };

    const filteredReports = reports.filter(r => {
        const matchesSearch = r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(now.setDate(diff));
                matchesDate = date >= monday;
            } else if (dateFilter === 'month') {
                matchesDate = date.getMonth() === new Date().getMonth() &&
                    date.getFullYear() === new Date().getFullYear();
            }
        }

        return matchesSearch && matchesDate;
    });

    // Group by Lecturer or Class could be added here. For now, flat list.

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-primary">Quản lý Báo cáo - {profile?.campus}</h1>
                <p className="text-muted-foreground">Duyệt và kiểm tra nội dung báo cáo từ Giảng viên</p>
            </div>
            <div className="flex justify-end">
                <ExportButton data={filteredReports} />
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                <div className="flex items-center gap-2 flex-1 w-full">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm theo tên SV hoặc Lớp..."
                        className="max-w-md"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <DateFilter value={dateFilter} onChange={setDateFilter} />
            </div>

            {loading ? (
                <div className="text-center py-10"><Loader2 className="animate-spin text-primary mx-auto" /></div>
            ) : (
                <div className="grid gap-4">
                    {filteredReports.map((report) => (
                        <Card key={report.id} className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg">{report.student_name}</h3>
                                        <Badge variant={
                                            report.status === 'submitted' ? 'warning' :
                                                report.status === 'approved' ? 'success' :
                                                    report.status === 'finalized' ? 'info' : 'secondary'
                                        }>
                                            {report.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-semibold">{(report as any).lecturer?.full_name}</span> • {report.class_name} • {report.subject}
                                    </p>
                                    <div className="mt-2 text-sm">
                                        {report.banned && <span className="text-red-600 font-bold mr-2">⚠ Cấm thi (AF)</span>}
                                        {report.warn_20 && <span className="text-red-500 font-bold mr-2">⚠ Vắng 20%</span>}
                                        {report.warn_15_17 && <span className="text-orange-500 font-medium mr-2">⚠ Vắng 15-17%</span>}
                                        {report.warn_10 && <span className="text-yellow-600 font-medium mr-2">⚠ Vắng 10%</span>}
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500 italic">
                                        "{report.status_detail}"
                                    </div>
                                </div>

                                {report.status === 'submitted' && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleReject(report.id, report.status)}
                                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                        >
                                            <XCircle className="w-4 h-4 mr-1" /> Trả lại
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleApprove(report.id, report.status)}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-1" /> Duyệt
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                    {filteredReports.length === 0 && (
                        <p className="text-center text-gray-500 py-8">Chưa có báo cáo nào cần duyệt.</p>
                    )}
                </div>
            )}
        </div>
    );
}
