import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ROLE_NAMES, CAMPUS_NAMES } from '../types';
import { toast } from 'sonner';
import { Loader2, Camera, Building2, Phone, Save, User, Upload } from 'lucide-react';

export default function ProfilePage() {
    const { profile, updateProfile } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form State
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [unit, setUnit] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [campus, setCampus] = useState('');

    // File Upload Ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setPhone(profile.phone || '');
            setUnit(profile.unit || '');
            setAvatarUrl(profile.avatar_url || '');
            setCampus(profile.campus || 'HN');
        }
    }, [profile]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validations
        if (file.size > 5 * 1024 * 1024) { // 5MB
            toast.error('File quá lớn. Vui lòng chọn ảnh dưới 5MB.');
            return;
        }

        if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chọn file hình ảnh.');
            return;
        }

        // Preview & Convert to Base64 (Simple solution works for both Demo & Real without Storage setup)
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setAvatarUrl(base64String);
            toast.success('Đã tải ảnh lên! Đừng quên nhấn "Lưu thay đổi".');
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!updateProfile) {
            toast.error('Hệ thống chưa hỗ trợ cập nhật. Vui lòng thử lại sau.');
            return;
        }
        setLoading(true);

        try {
            const updates = {
                full_name: fullName,
                phone,
                unit,
                avatar_url: avatarUrl,
                campus: campus as any,
            };

            const { error } = await updateProfile(updates);

            if (error) {
                console.error(error);
                toast.error('Lỗi khi cập nhật hồ sơ.');
            } else {
                toast.success('Hồ sơ đã được cập nhật thành công!');
            }
        } catch (error) {
            console.error(error);
            toast.error('Đã có lỗi xảy ra.');
        } finally {
            setLoading(false);
        }
    };

    if (!profile) return (
        <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Hồ sơ cá nhân</h1>
                <p className="text-slate-500">Quản lý thông tin tài khoản và cài đặt cá nhân.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column - Avatar & Core Info */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="pt-6 flex flex-col items-center text-center">
                            <div className="relative group cursor-pointer mb-4">
                                <div
                                    className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-sm bg-slate-100 flex items-center justify-center relative"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-16 h-16 text-slate-300" />
                                    )}

                                    {/* Overlay on Hover */}
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-8 h-8 text-white" />
                                    </div>
                                </div>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="w-3 h-3 mr-1" /> Tải ảnh lên
                                </Button>
                            </div>

                            <h2 className="font-bold text-xl">{profile.full_name}</h2>
                            <span className="inline-flex mt-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {ROLE_NAMES[profile.role]}
                            </span>
                            <div className="mt-4 text-sm text-slate-500 w-full text-center border-t pt-4">
                                <p>Cơ sở: <span className="font-semibold text-slate-700">{CAMPUS_NAMES[profile.campus]}</span></p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Thông tin tài khoản</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-slate-500">Email</span>
                                <span className="font-medium truncate max-w-[150px]">{profile.email}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-slate-500">ID người dùng</span>
                                <span className="font-mono text-xs text-slate-400 truncate max-w-[100px]">{profile.id}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Edit Form */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Chỉnh sửa thông tin</CardTitle>
                            <CardDescription>Cập nhật thông tin chi tiết của bạn để ban quản trị dễ dàng liên hệ.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Họ và Tên</Label>
                                <Input
                                    id="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Nhập họ và tên đầy đủ"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Số điện thoại</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="phone"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="pl-9"
                                            placeholder="0912 xxx xxx"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="unit">Đơn vị / Bộ môn</Label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="unit"
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            className="pl-9"
                                            placeholder="Ví dụ: Thiết kế đồ họa"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-full space-y-2">
                                    <Label>Cơ sở hoạt động</Label>
                                    <Select value={campus} onValueChange={(v) => setCampus(v)}>
                                        <SelectTrigger>
                                            <SelectValue>{CAMPUS_NAMES[campus as keyof typeof CAMPUS_NAMES] || campus}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HN">Hà Nội</SelectItem>
                                            <SelectItem value="DN">Đà Nẵng</SelectItem>
                                            <SelectItem value="HCM">Hồ Chí Minh</SelectItem>
                                            <SelectItem value="CT">Cần Thơ</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-slate-500">Chuyển cơ sở sẽ cập nhật các báo cáo hiển thị của bạn.</p>
                                </div>
                            </div>

                            <Separator />

                            <div className="flex justify-end pt-2">
                                <Button onClick={handleSave} disabled={loading} className="min-w-[120px]">
                                    {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Save className="mr-2 w-4 h-4" />}
                                    Lưu thay đổi
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
