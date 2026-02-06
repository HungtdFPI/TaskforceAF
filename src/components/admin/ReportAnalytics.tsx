import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { FileDown, Filter } from 'lucide-react';
import { api } from '../../lib/api';
import { exportToExcel } from '../ExportButton';

export function ReportAnalytics() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCampus, setFilterCampus] = useState('ALL');
    const [campuses, setCampuses] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [data, campusList] = await Promise.all([
                api.fetchReports('', true, 'ho', ''),
                api.fetchCampuses()
            ]);
            setReports(data);
            setCampuses(campusList);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Process Data for Charts
    const filteredReports = filterCampus === 'ALL'
        ? reports
        : reports.filter(r => r.campus === filterCampus);

    const statusData = [
        { name: 'Đang xử lý', value: filteredReports.filter(r => ['draft', 'submitted', 'pending'].includes(r.status)).length, color: '#FFBB28' },
        { name: 'Đã duyệt', value: filteredReports.filter(r => r.status === 'approved').length, color: '#0088FE' },
        { name: 'Cấm thi', value: filteredReports.filter(r => r.banned).length, color: '#FF8042' },
        { name: 'Đã chốt', value: filteredReports.filter(r => r.status === 'finalized').length, color: '#00C49F' }
    ];

    const campusData = campuses.map(c => ({
        name: c.name,
        reports: reports.filter(r => r.campus === c.id || r.campus === c.code).length,
        banned: reports.filter(r => (r.campus === c.id || r.campus === c.code) && r.banned).length
    }));

    const handleExport = () => {
        exportToExcel(filteredReports, `Bao_Cao_Thong_Ke_${filterCampus}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold">Báo cáo & Phân tích</h2>
                    <p className="text-gray-500">Số liệu thống kê toàn hệ thống học vụ.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={filterCampus} onValueChange={setFilterCampus}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Chọn cơ sở" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tất cả Cơ sở</SelectItem>
                            {campuses.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleExport}>
                        <FileDown className="w-4 h-4 mr-2" />
                        Xuất Excel
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Trạng thái Báo cáo</CardTitle>
                        <CardDescription>Tỷ lệ các trạng thái xử lý hiện tại.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Thống kê theo Cơ sở</CardTitle>
                        <CardDescription>Số lượng báo cáo và sinh viên cấm thi.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={campusData}>
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="reports" name="Tổng báo cáo" fill="#8884d8" />
                                <Bar dataKey="banned" name="Cấm thi" fill="#FF8042" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table simplified or just omitted relying on export */}
        </div>
    );
}
