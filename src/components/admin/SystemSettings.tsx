import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Trash2, Edit2, Save, Building2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';

interface Campus {
    id: string;
    name: string;
    code: string;
}

interface SystemConfig {
    current_semester: string;
    warn_threshold: number;
    enable_notifications: boolean;
}

export function SystemSettings() {
    const [campuses, setCampuses] = useState<Campus[]>([]);
    const [config, setConfig] = useState<SystemConfig>({
        current_semester: '',
        warn_threshold: 3,
        enable_notifications: true
    });
    const [isEditingCampus, setIsEditingCampus] = useState<Campus | null>(null);
    const [newCampus, setNewCampus] = useState<Campus>({ id: '', name: '', code: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [campusData, settingsData] = await Promise.all([
                api.fetchCampuses(),
                api.fetchSettings()
            ]);
            setCampuses(campusData);
            setConfig(settingsData);
        } catch (error) {
            console.error(error);
            toast.error('Lỗi tải dữ liệu hệ thống');
        }
    };

    const handleSaveConfig = async () => {
        try {
            await api.updateSettings(config);
            toast.success('Đã lưu cấu hình hệ thống');
        } catch (error) {
            toast.error('Lỗi khi lưu cấu hình');
        }
    };

    const handleSaveCampus = async () => {
        if (!newCampus.name || !newCampus.code) {
            toast.error('Vui lòng điền đủ thông tin cơ sở');
            return;
        }

        try {
            await api.updateCampus(newCampus);
            toast.success(newCampus.id ? 'Đã cập nhật cơ sở' : 'Đã thêm cơ sở mới');
            setNewCampus({ id: '', name: '', code: '' });
            setIsEditingCampus(null);
            loadData();
        } catch (error) {
            toast.error('Lỗi khi lưu cơ sở');
        }
    };

    const handleDeleteCampus = async (id: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa cơ sở này?')) return;
        try {
            await api.deleteCampus(id);
            toast.success('Đã xóa cơ sở');
            loadData();
        } catch (error) {
            toast.error('Lỗi khi xóa cơ sở');
        }
    };

    const startEditCampus = (campus: Campus) => {
        setNewCampus(campus);
        setIsEditingCampus(campus);
    };

    const cancelEdit = () => {
        setNewCampus({ id: '', name: '', code: '' });
        setIsEditingCampus(null);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Cấu hình Hệ thống
                </h2>
                <p className="text-gray-500">Quản lý cơ sở đào tạo và các thiết lập chung toàn hệ thống.</p>
            </div>

            <Tabs defaultValue="campuses">
                <TabsList>
                    <TabsTrigger value="campuses" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Quản lý Cơ sở
                    </TabsTrigger>
                    <TabsTrigger value="config" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Thiết lập Chung
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="campuses" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Danh sách Cơ sở Đào tạo</CardTitle>
                            <CardDescription>Thêm, sửa, xóa các cơ sở trong hệ thống.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    {campuses.map(campus => (
                                        <div key={campus.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div>
                                                <div className="font-medium">{campus.name}</div>
                                                <div className="text-sm text-gray-500">Mã: {campus.code}</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="icon" variant="ghost" onClick={() => startEditCampus(campus)}>
                                                    <Edit2 className="w-4 h-4 text-blue-600" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => handleDeleteCampus(campus.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white border rounded-lg p-4 space-y-4 h-fit">
                                    <h3 className="font-medium">{isEditingCampus ? 'Chỉnh sửa Cơ sở' : 'Thêm Cơ sở Mới'}</h3>
                                    <div className="space-y-2">
                                        <Label>Tên Cơ sở</Label>
                                        <Input
                                            placeholder="Ví dụ: Hà Nội"
                                            value={newCampus.name}
                                            onChange={(e) => setNewCampus({ ...newCampus, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Mã Cơ sở</Label>
                                        <Input
                                            placeholder="Ví dụ: HN"
                                            value={newCampus.code}
                                            onChange={(e) => setNewCampus({ ...newCampus, code: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button className="w-full" onClick={handleSaveCampus}>
                                            {isEditingCampus ? 'Cập nhật' : 'Thêm mới'}
                                        </Button>
                                        {isEditingCampus && (
                                            <Button variant="outline" onClick={cancelEdit}>Hủy</Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="config">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cấu hình Chung</CardTitle>
                            <CardDescription>Các thiết lập áp dụng cho toàn bộ hoạt động học vụ.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 max-w-lg">
                            <div className="space-y-2">
                                <Label>Học kỳ Hiện tại</Label>
                                <Input
                                    value={config.current_semester}
                                    onChange={(e) => setConfig({ ...config, current_semester: e.target.value })}
                                    placeholder="Ví dụ: Summer 2024"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Ngưỡng cảnh báo (Số buổi nghỉ)</Label>
                                <Input
                                    type="number"
                                    value={config.warn_threshold}
                                    onChange={(e) => setConfig({ ...config, warn_threshold: Number(e.target.value) })}
                                />
                                <p className="text-xs text-gray-500">Sinh viên nghỉ quá số buổi này sẽ bị cảnh báo.</p>
                            </div>
                            <Button onClick={handleSaveConfig} className="mt-4">
                                <Save className="w-4 h-4 mr-2" /> Lưu Cấu hình
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
