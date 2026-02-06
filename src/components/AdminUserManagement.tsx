import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { UserPlus, Pencil, Trash2, Loader2, FileDown, Shield, UserCog } from 'lucide-react';
import { type Profile, useAuth } from '../contexts/AuthContext';
import { type UserRole, type CampusCode, ROLE_NAMES, CAMPUS_NAMES } from '../types';
import * as XLSX from 'xlsx';

// Granular Permissions Definitions
const PERMISSIONS = [
    { id: 'view_all_campuses', label: 'Xem tất cả cơ sở' },
    { id: 'manage_users', label: 'Quản lý người dùng' },
    { id: 'approve_reports', label: 'Duyệt báo cáo' },
    { id: 'finalize_reports', label: 'Chốt báo cáo tháng' },
    { id: 'config_system', label: 'Cấu hình hệ thống' },
    { id: 'import_data', label: 'Import dữ liệu' },
];

export function AdminUserManagement() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Profile | null>(null);

    // Form State
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<UserRole>('gv');
    const [campus, setCampus] = useState<CampusCode>('HN');
    const [phone, setPhone] = useState('');
    const [unit, setUnit] = useState('');

    // New Fields
    const [employeeCode, setEmployeeCode] = useState('');
    const [position, setPosition] = useState('');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

    // Filter & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCampus, setFilterCampus] = useState<string>('all');

    const { demoUsers: contextDemoUsers, registerDemoUser, updateDemoUser } = useAuth();

    useEffect(() => {
        fetchUsers();
    }, [contextDemoUsers]);

    // Derived State
    const filteredUsers = users.filter(u => {
        const matchesSearch = (u.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (u.employee_code?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        const matchesCampus = filterCampus === 'all' || u.campus === filterCampus;
        return matchesSearch && matchesCampus;
    });

    const stats = {
        total: users.length,
        byRole: {
            gv: users.filter(u => u.role === 'gv').length,
            cnbm: users.filter(u => u.role === 'cnbm').length,
            truong_nganh: users.filter(u => u.role === 'truong_nganh').length,
            ho: users.filter(u => u.role === 'ho').length,
            dvsv: users.filter(u => u.role === 'dvsv').length,
        },
        byCampus: {
            HN: users.filter(u => u.campus === 'HN').length,
            DN: users.filter(u => u.campus === 'DN').length,
            HCM: users.filter(u => u.campus === 'HCM').length,
            CT: users.filter(u => u.campus === 'CT').length,
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('profiles').select('*');
            if (error) {
                if (contextDemoUsers && Object.keys(contextDemoUsers).length > 0) {
                    setUsers(Object.values(contextDemoUsers) as Profile[]);
                } else {
                    setUsers([]);
                }
            } else {
                setUsers(data || []);
            }
        } catch (err) {
            if (contextDemoUsers) setUsers(Object.values(contextDemoUsers) as Profile[]);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredUsers.map(u => ({
            'Mã CB': u.employee_code || '',
            'Họ Tên': u.full_name,
            'Email': u.email,
            'Vai trò': ROLE_NAMES[u.role],
            'Chức vụ': u.position || '',
            'Cơ sở': CAMPUS_NAMES[u.campus],
            'SĐT': u.phone,
            'Bộ môn': u.unit,
            'Trạng thái': u.status === 'inactive' ? 'Ngừng hoạt động' : 'Đang hoạt động'
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
        XLSX.writeFile(workbook, "Danh_sach_Nguoi_dung.xlsx");
    };

    const handleSaveUser = async () => {
        if (!email || !fullName) {
            toast.error('Vui lòng điền đủ thông tin');
            return;
        }

        const userData = {
            full_name: fullName,
            role,
            campus,
            phone,
            unit,
            employee_code: employeeCode,
            position,
            status,
            permissions: selectedPermissions
        };

        try {
            if (editingUser) {
                // Check if updating a Demo User
                if (editingUser.id.startsWith('demo-')) {
                    if (updateDemoUser) {
                        await updateDemoUser(editingUser.email, userData);
                        toast.success('Đã cập nhật (Local Demo Data)');
                    } else {
                        toast.warning('Chức năng cập nhật demo chưa sẵn sàng');
                    }
                } else {
                    // Update Real User
                    const { error } = await supabase.from('profiles').update(userData).eq('id', editingUser.id);
                    if (error && error.message !== 'Failed to fetch') throw error;
                    toast.success('Đã cập nhật!');
                }
            } else {
                // Create New User
                const newId = crypto.randomUUID();
                const { error } = await supabase.from('profiles').insert({
                    id: newId,
                    email,
                    ...userData,
                    created_at: new Date().toISOString()
                });

                if (error) {
                    // Fallback to local demo if DB fails
                    if (registerDemoUser) {
                        await registerDemoUser(email, fullName, campus, role);
                        if (updateDemoUser) await updateDemoUser(email, {
                            phone, unit, employee_code: employeeCode, position, status, permissions: selectedPermissions
                        });
                        toast.success('Đã thêm (Local Demo Data)');
                    } else {
                        throw error;
                    }
                } else {
                    toast.success('Đã thêm người dùng mới');
                }
            }
            setIsOpen(false);
            resetForm();
            fetchUsers();
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi lưu');
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!window.confirm('Xóa người dùng này?')) return;
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (error && error.message !== 'Failed to fetch') throw error;
            setUsers(prev => prev.filter(u => u.id !== id));
            toast.success('Đã xóa');
        } catch (error) { toast.error('Lỗi xóa'); }
    };

    const openEdit = (user: Profile) => {
        setEditingUser(user);
        setEmail(user.email);
        setFullName(user.full_name);
        setRole(user.role);
        setCampus(user.campus);
        setPhone(user.phone || '');
        setUnit(user.unit || '');
        setEmployeeCode(user.employee_code || '');
        setPosition(user.position || '');
        setStatus(user.status || 'active');
        setSelectedPermissions(user.permissions || []);
        setIsOpen(true);
    };

    const resetForm = () => {
        setEditingUser(null);
        setEmail('');
        setFullName('');
        setRole('gv');
        setCampus('HN');
        setPhone('');
        setUnit('');
        setEmployeeCode('');
        setPosition('');
        setStatus('active');
        setSelectedPermissions([]);
    };

    const togglePermission = (permId: string) => {
        setSelectedPermissions(prev =>
            prev.includes(permId)
                ? prev.filter(p => p !== permId)
                : [...prev, permId]
        );
    };

    return (
        <div className="space-y-6">
            {/* Statistics Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-blue-600 uppercase">Tổng User</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-blue-900">{stats.total}</div></CardContent>
                </Card>
                <Card className="bg-emerald-50 border-emerald-100">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-emerald-600 uppercase">Giảng Viên</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-emerald-900">{stats.byRole.gv}</div></CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-100">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-purple-600 uppercase">Cán Bộ QL</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900">
                            {stats.byRole.cnbm + stats.byRole.truong_nganh + stats.byRole.ho}
                        </div>
                        <p className="text-xs text-purple-400 mt-1">CNBM + Admin + HO</p>
                    </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-100">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-orange-600 uppercase">Theo Cơ sở</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-sm font-semibold text-orange-900 grid grid-cols-2 gap-x-2">
                            <span>HN: {stats.byCampus.HN}</span>
                            <span>DN: {stats.byCampus.DN}</span>
                            <span>HCM: {stats.byCampus.HCM}</span>
                            <span>CT: {stats.byCampus.CT}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <h2 className="text-xl font-bold text-slate-800">Danh sách Người dùng</h2>

                <div className="flex flex-1 w-full md:w-auto gap-2 flex-wrap md:flex-nowrap justify-end">
                    <Input
                        placeholder="Tìm kiếm..."
                        className="max-w-[200px]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    <Select value={filterCampus} onValueChange={setFilterCampus}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Cơ sở" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="HN">Hà Nội</SelectItem>
                            <SelectItem value="DN">Đà Nẵng</SelectItem>
                            <SelectItem value="HCM">Hồ Chí Minh</SelectItem>
                            <SelectItem value="CT">Cần Thơ</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={handleExport} className="border-green-600 text-green-700 hover:bg-green-50">
                        <FileDown className="w-4 h-4 mr-2" />
                        Xuất Excel
                    </Button>

                    <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => {
                        resetForm();
                        setIsOpen(true);
                    }}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Thêm Mới
                    </Button>
                </div>
            </div>

            {/* Enhanced Add/Edit Modal */}
            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="sm:max-w-[800px] bg-white text-slate-900 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {editingUser ? <UserCog className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                            {editingUser ? 'Cập nhật Hồ sơ & Phân quyền' : 'Thêm Người dùng Mới'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        {/* Section 1: Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b pb-1 mb-2">Thông tin cơ bản</h3>
                            <div className="space-y-2">
                                <Label>Email <span className="text-red-500">*</span></Label>
                                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@fpt.edu.vn" />
                            </div>
                            <div className="space-y-2">
                                <Label>Họ và Tên <span className="text-red-500">*</span></Label>
                                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
                            </div>
                            <div className="space-y-2">
                                <Label>Mã Cán bộ</Label>
                                <Input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="FE123456" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Số điện thoại</Label>
                                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxx" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Đơn vị / Bộ môn</Label>
                                    <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Bộ môn Đồ hoạ" />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Role & System Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b pb-1 mb-2">Vai trò & Hệ thống</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Vai trò Chính</Label>
                                    <Select value={role} onValueChange={(v: any) => setRole(v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gv">Giảng viên</SelectItem>
                                            <SelectItem value="cnbm">CNBM</SelectItem>
                                            <SelectItem value="truong_nganh">Trưởng ngành</SelectItem>
                                            <SelectItem value="dvsv">Dịch vụ SV</SelectItem>
                                            <SelectItem value="ho">Head Office</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Cơ sở Chính</Label>
                                    <Select value={campus} onValueChange={(v: any) => setCampus(v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HN">Hà Nội</SelectItem>
                                            <SelectItem value="DN">Đà Nẵng</SelectItem>
                                            <SelectItem value="HCM">Hồ Chí Minh</SelectItem>
                                            <SelectItem value="CT">Cần Thơ</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Chức vụ / Vị trí</Label>
                                <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Giảng viên cơ hữu, Cán bộ..." />
                            </div>

                            <div className="space-y-2">
                                <Label>Trạng thái</Label>
                                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                    <SelectTrigger className={status === 'active' ? 'text-green-600 font-medium' : 'text-slate-500'}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Đang hoạt động</SelectItem>
                                        <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Granular Permissions */}
                    <div className="mt-4 pt-4 border-t">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
                            <Shield className="w-4 h-4" /> Phân quyền chi tiết
                        </h3>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-md border border-slate-100">
                            {PERMISSIONS.map((perm) => (
                                <div key={perm.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={perm.id}
                                        checked={selectedPermissions.includes(perm.id)}
                                        onCheckedChange={() => togglePermission(perm.id)}
                                    />
                                    <label
                                        htmlFor={perm.id}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        {perm.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-2 italic">* Các quyền này sẽ bổ sung thêm cho quyền mặc định của Vai trò chính.</p>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy bỏ</Button>
                        <Button className="bg-primary" onClick={handleSaveUser}>
                            {editingUser ? 'Lưu Thay đổi' : 'Tạo Người dùng'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="border rounded-md bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-semibold text-slate-700">Người dùng</TableHead>
                            <TableHead className="font-semibold text-slate-700">Vai trò / Chức vụ</TableHead>
                            <TableHead className="font-semibold text-slate-700">Cơ sở</TableHead>
                            <TableHead className="font-semibold text-slate-700">Trạng thái</TableHead>
                            <TableHead className="text-right font-semibold text-slate-700">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
                        ) : filteredUsers.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Không tìm thấy người dùng.</TableCell></TableRow>
                        ) : (
                            filteredUsers.map((u) => (
                                <TableRow key={u.id} className="hover:bg-slate-50">
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 font-semibold">{u.full_name}</span>
                                            <span className="text-slate-500 text-xs">{u.email}</span>
                                            {u.employee_code && <span className="text-slate-400 text-[10px] uppercase">{u.employee_code}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-medium 
                                                ${u.role === 'gv' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                    u.role === 'cnbm' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                                        u.role === 'truong_nganh' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                            'bg-gray-50 text-gray-700 border border-gray-100'}`}>
                                                {ROLE_NAMES[u.role]}
                                            </span>
                                            {u.position && <span className="text-xs text-slate-500">{u.position}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-600">{CAMPUS_NAMES[u.campus]}</TableCell>
                                    <TableCell>
                                        {u.status === 'inactive' ? (
                                            <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-1 rounded">Ngưng hoạt động</span>
                                        ) : (
                                            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">Đang hoạt động</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} className="h-8 w-8 hover:bg-blue-50 text-slate-500 hover:text-blue-600">
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id)} className="h-8 w-8 hover:bg-red-50 text-slate-500 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
