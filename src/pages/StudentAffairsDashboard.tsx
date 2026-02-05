import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { type Report } from '../types';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Loader2, Search, CheckCircle, XCircle } from 'lucide-react';
import { Input } from '../components/ui/input';
import { ExportButton } from '../components/ExportButton';

export default function StudentAffairsDashboard() {
    const { user, profile } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // For handling upgrades
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [dvsvNote, setDvsvNote] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const isGuest = user?.role === ('guest' as any) || user?.id.startsWith('demo-');

    useEffect(() => {
        loadReports();
    }, [user]);

    const loadReports = async () => {
        if (!user || !profile) return;
        try {
            setLoading(true);
            const data = await api.fetchReports(user.id, isGuest, profile.role, profile.campus);
            // Filter only reports that have warnings? Or show all?
            // Usually DVSV cares about students with warnings.
            const warningReports = data.filter(r => r.warn_10 || r.warn_15_17 || r.warn_20 || r.banned);
            setReports(warningReports);
        } catch (error) {
            toast.error('Không thể tải dữ liệu báo cáo');
        } finally {
            setLoading(false);
        }
    };

    const handleCareAction = async (report: Report, status: 'success' | 'failed') => {
        setProcessingId(report.id);
        try {
            const updatedReport: Report = {
                ...report,
                dvsv_status: status,
                dvsv_note: dvsvNote || report.dvsv_note, // Use new note or keep old
            };

            await api.updateReport(updatedReport, isGuest);

            setReports(reports.map(r => r.id === report.id ? updatedReport : r));
            setSelectedReport(null);
            setDvsvNote('');
            toast.success('Đã cập nhật trạng thái chăm sóc');
        } catch (error) {
            toast.error('Lỗi khi cập nhật');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredReports = reports.filter(r =>
        r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.student_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Công tác Sinh viên ({profile?.campus})</h1>
                    <p className="text-slate-500">Theo dõi và chăm sóc sinh viên có cảnh báo học vụ.</p>
                    <div className="flex items-center gap-2">
                        <ExportButton data={filteredReports} />
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Tìm kiếm theo tên SV, mã SV..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <div className="text-center p-8 text-slate-500">
                            Hiện không có sinh viên nào cần chăm sóc.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredReports.map((report) => (
                                <Card key={report.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="p-4 flex flex-col md:flex-row gap-4">
                                        {/* Left Info */}
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-900">{report.student_name}</h3>
                                                    <p className="text-sm text-slate-500">{report.student_code} - Class: {report.class_name}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {report.warn_10 && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Cảnh báo 10%</Badge>}
                                                    {report.warn_15_17 && <Badge variant="secondary" className="bg-orange-100 text-orange-800">Cảnh báo 15-17%</Badge>}
                                                    {report.warn_20 && <Badge variant="secondary" className="bg-red-100 text-red-800">Cảnh báo 20%</Badge>}
                                                    {report.banned && <Badge variant="destructive">Cấm thi</Badge>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-slate-50 p-3 rounded-md">
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-500 uppercase">Tình trạng (GV)</p>
                                                    <p className="text-sm text-slate-800 mt-1">{report.status_detail || "Chưa nhập chi tiết"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-500 uppercase">Ghi chú GV</p>
                                                    <p className="text-sm text-slate-800 mt-1">{report.teacher_note || "Không có ghi chú"}</p>
                                                </div>
                                            </div>

                                            {/* DVSV Action Area */}
                                            <div className="mt-4 pt-4 border-t border-slate-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-sm font-semibold text-slate-700">Trạng thái chăm sóc:</p>
                                                    {report.dvsv_status === 'success' && <Badge className="bg-green-600">Đã chăm sóc thành công</Badge>}
                                                    {report.dvsv_status === 'failed' && <Badge className="bg-red-600">Chăm sóc thất bại</Badge>}
                                                    {report.dvsv_status === 'pending' && <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Chờ xử lý</Badge>}
                                                </div>

                                                {selectedReport?.id === report.id ? (
                                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                                        <Textarea
                                                            placeholder="Ghi chú chi tiết kết quả chăm sóc..."
                                                            value={dvsvNote}
                                                            onChange={(e) => setDvsvNote(e.target.value)}
                                                            className="min-h-[80px]"
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>Huỷ</Button>
                                                            <Button
                                                                size="sm"
                                                                className="bg-red-600 hover:bg-red-700 text-white"
                                                                onClick={() => handleCareAction(report, 'failed')}
                                                                disabled={processingId === report.id}
                                                            >
                                                                <XCircle className="w-4 h-4 mr-1" />
                                                                Thất bại
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                                onClick={() => handleCareAction(report, 'success')}
                                                                disabled={processingId === report.id}
                                                            >
                                                                {processingId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                                                Thành công
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        {report.dvsv_note && (
                                                            <p className="text-sm text-slate-600 italic mb-3">
                                                                <span className="font-medium not-italic text-slate-900">Ghi chú DVSV:</span> {report.dvsv_note}
                                                            </p>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedReport(report);
                                                                setDvsvNote(report.dvsv_note || '');
                                                            }}
                                                        >
                                                            {report.dvsv_status === 'pending' ? 'Tiến hành chăm sóc' : 'Cập nhật trạng thái'}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
