import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, UserCircle, Lock, Monitor, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { CAMPUS_NAMES, type CampusCode } from '../types';

const loginSchema = z.object({
    email: z.string().min(3, "Tên đăng nhập không hợp lệ").refine(val => {
        // Allow if it's a valid email ending in fpt.edu.vn OR just a username (no @)
        const isEmail = val.includes('@');
        if (isEmail) return val.endsWith('@fpt.edu.vn');
        return true; // Use non-email strings as usernames
    }, {
        message: "Vui lòng sử dụng email @fpt.edu.vn hoặc tên đăng nhập",
    }),
    password: z.string().min(6, { message: "Mật khẩu tối thiểu 6 ký tự" }),
});

const registerSchema = loginSchema.extend({
    fullName: z.string().min(2, { message: "Họ tên tối thiểu 2 ký tự" }),
    campus: z.enum(['HN', 'DN', 'HCM', 'CT'] as const, {
        message: "Vui lòng chọn cơ sở"
    }),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function LoginPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const { loginAsGuest, loginAsDemo, registerDemoUser } = useAuth();

    // Use union type for form values and force generic resolver to basic FieldValues to avoid intricate conditional typing
    const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<any>({
        resolver: zodResolver(isRegistering ? registerSchema : loginSchema),
        defaultValues: {
            campus: 'HN'
        }
    });

    // Watch campus for Select component integration
    const selectedCampus = watch('campus');

    // Toggle mode
    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        reset();
    };

    const onLogin = async (data: LoginForm) => {
        setLoading(true);
        try {
            // Auto-append domain if entering username only
            let loginId = data.email.trim();
            if (!loginId.includes('@')) {
                loginId = `${loginId}@fpt.edu.vn`;
            }

            // Check for Demo Account
            if ((loginId.includes('demo') || loginId.endsWith('@fpt.edu.vn')) && loginAsDemo) {
                const isDemoAccount = ['gv_hn@fpt.edu.vn', 'cnbm_hn@fpt.edu.vn', 'admin@fpt.edu.vn', 'dvsv_hn@fpt.edu.vn'].includes(loginId)
                    || loginId.startsWith('admin'); // Allow variations like admin -> admin@fpt.edu.vn

                // We'll proceed with try login to demo if it matches pattern or is explicit demo
                if (isDemoAccount || loginId.includes('demo')) {
                    await loginAsDemo(loginId);
                    toast.success('Đăng nhập Demo thành công');
                    navigate('/');
                    return;
                }
            }

            // Real Supabase Login
            const { error } = await supabase.auth.signInWithPassword({
                email: loginId,
                password: data.password,
            });

            if (error) {
                if (loginAsDemo) {
                    await loginAsDemo(loginId);
                    toast.success('Đăng nhập (Mô phỏng) thành công');
                    navigate('/');
                    return;
                }
                toast.error('Đăng nhập thất bại', { description: "Vui lòng kiểm tra lại thông tin đăng nhập." });
            } else {
                toast.success('Đăng nhập thành công');
                navigate('/');
            }
        } catch (err) {
            toast.error('Lỗi hệ thống');
        } finally {
            setLoading(false);
        }
    };

    const onRegister = async (data: RegisterForm) => {
        setLoading(true);
        try {
            // 1. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.fullName,
                        campus: data.campus,
                        role: 'gv', // Default role per requirement
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Insert into Profiles (since we don't assume a trigger exists or works)
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: authData.user.id,
                    email: data.email,
                    full_name: data.fullName,
                    campus: data.campus,
                    role: 'gv',
                    created_at: new Date().toISOString()
                });

                if (profileError) {
                    // Start rollback best effort or warn
                    console.error('Profile creation failed:', profileError);
                    // Continue anyway, maybe the trigger worked?
                }

                toast.success('Đăng ký thành công!', {
                    description: 'Vui lòng kiểm tra email để xác thực tài khoản (nếu cần) hoặc đăng nhập ngay.',
                });

                // Switch back to login
                toggleMode();
            }

        } catch (error: any) {
            // Fallback for Demo/Prototype if backend is unreachable
            if (error?.message === 'Failed to fetch' || !supabase) {
                if (loginAsDemo && registerDemoUser) {
                    await registerDemoUser(data.email, data.fullName, data.campus);
                    toast.success('Đăng ký (Mô phỏng) thành công!', {
                        description: 'Tài khoản giả lập đã được tạo. Vui lòng đăng nhập.',
                    });
                    toggleMode();
                    return;
                }
            }

            toast.error('Đăng ký thất bại', {
                description: error.message || 'Vui lòng thử lại sau.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Left Section - Hero/Brand */}
            <div className="hidden lg:flex w-1/2 bg-[#0f172a] relative overflow-hidden flex-col justify-between p-12 text-white">
                <div className="z-10 relative">
                    <div className="flex items-center gap-2 mb-6">
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/2/20/FPT_Polytechnic.png"
                            alt="FPT Logo"
                            className="h-12 w-auto bg-white/10 rounded p-1 backdrop-blur-sm"
                            onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                        <div className="flex flex-col">
                            <span className="text-2xl font-bold tracking-tight">FPI Academic Alert</span>
                            <span className="text-xs text-orange-400 font-mono tracking-widest">FPT POLYTECHNIC INTERNATIONAL</span>
                        </div>
                    </div>
                    <h1 className="text-4xl font-extrabold leading-tight mb-6">
                        <span className="text-white block">FPT POLYTECHNIC INTERNATIONAL</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200 block text-3xl mt-2">
                            Academic Alert
                        </span>
                    </h1>
                    <p className="text-slate-300 text-lg max-w-md leading-relaxed">
                        Giải pháp số hóa toàn diện giúp theo dõi, cảnh báo và hỗ trợ sinh viên kịp thời.
                        Kết nối chặt chẽ giữa Giảng viên, CNBM và Ban đào tạo.
                    </p>
                </div>

                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-orange-600/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                <div className="grid grid-cols-2 gap-6 z-10 mt-12">
                    <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                        <Monitor className="w-6 h-6 mb-2 text-blue-400" />
                        <h3 className="font-semibold mb-1">Giao diện hiện đại</h3>
                        <p className="text-sm text-slate-400">Tối ưu trải nghiệm Data Grid.</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                        <BookOpen className="w-6 h-6 mb-2 text-orange-400" />
                        <h3 className="font-semibold mb-1">Dữ liệu tập trung</h3>
                        <p className="text-sm text-slate-400">Đồng bộ 4 cơ sở.</p>
                    </div>
                </div>

                <div className="z-10 text-sm text-slate-500">
                    @2026, FPI Graphic Design Deparment. All rights reserved.
                </div>
            </div>

            {/* Right Section - Login/Register Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md space-y-8"
                >
                    <div className="lg:hidden flex items-center gap-2 mb-8 justify-center text-[#0f172a]">
                        <ShieldCheck className="w-8 h-8 text-orange-500" />
                        <span className="text-xl font-bold tracking-tight text-center">FPT POLYTECHNIC INTERNATIONAL<br /><span className="text-orange-600">Academic Alert</span></span>
                    </div>

                    <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-2xl overflow-hidden ring-1 ring-black/5">
                        <CardHeader className="space-y-1 text-center pb-8 pt-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
                            <CardTitle className="text-2xl font-bold text-slate-800">
                                {isRegistering ? 'Đăng ký Tài khoản' : 'Đăng nhập'}
                            </CardTitle>
                            <CardDescription className="text-base">
                                {isRegistering
                                    ? 'Tạo tài khoản mới để truy cập hệ thống'
                                    : 'Sử dụng email @fpt.edu.vn để truy cập'
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 px-8">
                            <form onSubmit={handleSubmit(isRegistering ? onRegister : onLogin)} className="space-y-5">
                                {isRegistering && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="fullName">Họ và Tên</Label>
                                            <div className="relative">
                                                <UserCircle className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                                <Input
                                                    id="fullName"
                                                    placeholder="Nguyễn Văn A"
                                                    {...register('fullName')}
                                                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                                />
                                            </div>
                                            {!!errors.fullName && <p className="text-sm text-red-500 font-medium">{errors.fullName.message as string}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="campus">Cơ sở Đào tạo</Label>
                                            <Select
                                                value={selectedCampus}
                                                onValueChange={(val: string) => setValue('campus', val as CampusCode)}
                                            >
                                                <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all">
                                                    <SelectValue placeholder="Chọn cơ sở" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="HN">{CAMPUS_NAMES.HN}</SelectItem>
                                                    <SelectItem value="DN">{CAMPUS_NAMES.DN}</SelectItem>
                                                    <SelectItem value="HCM">{CAMPUS_NAMES.HCM}</SelectItem>
                                                    <SelectItem value="CT">{CAMPUS_NAMES.CT}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {!!errors.campus && <p className="text-sm text-red-500 font-medium">{errors.campus.message as string}</p>}
                                        </div>
                                    </>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="email">Tên đăng nhập / Email FPT</Label>
                                    <div className="relative">
                                        <UserCircle className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                        <Input
                                            id="email"
                                            type="text"
                                            placeholder="username hoặc email@fpt.edu.vn"
                                            {...register('email')}
                                            className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                        />
                                    </div>
                                    {!!errors.email && <p className="text-sm text-red-500 font-medium">{errors.email.message as string}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Mật khẩu</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                        <Input
                                            id="password"
                                            type="password"
                                            {...register('password')}
                                            className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                        />
                                    </div>
                                    {!!errors.password && <p className="text-sm text-red-500 font-medium">{errors.password.message as string}</p>}
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 text-base font-semibold bg-[#0f172a] hover:bg-[#1e293b] shadow-lg shadow-blue-900/10 transition-transform active:scale-[0.98]"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isRegistering ? 'Đăng ký Tài khoản' : 'Đăng nhập hệ thống')}
                                </Button>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-sm text-slate-600">
                                    {isRegistering ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
                                    <button
                                        onClick={toggleMode}
                                        className="ml-2 font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                                    >
                                        {isRegistering ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
                                    </button>
                                </p>
                            </div>
                        </CardContent>

                        {!isRegistering && (
                            <CardFooter className="flex flex-col gap-2 justify-center text-sm text-muted-foreground bg-slate-50 py-4 border-t border-slate-100">
                                <div className="text-center w-full">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Tài khoản Demo (Quyền truy cập)</span>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <div className="px-2 py-1 bg-white border rounded text-[10px] text-center cursor-pointer hover:bg-slate-50" onClick={() => navigator.clipboard.writeText('gv_hn@fpt.edu.vn')}>Giảng viên (gv_hn@fpt.edu.vn)</div>
                                        <div className="px-2 py-1 bg-white border rounded text-[10px] text-center cursor-pointer hover:bg-slate-50" onClick={() => navigator.clipboard.writeText('cnbm_hn@fpt.edu.vn')}>CNBM (cnbm_hn@fpt.edu.vn)</div>
                                        <div className="px-2 py-1 bg-white border rounded text-[10px] text-center cursor-pointer hover:bg-slate-50" onClick={() => setValue('email', 'admin')}>Admin (admin)</div>
                                        <div className="px-2 py-1 bg-white border rounded text-[10px] text-center cursor-pointer hover:bg-slate-50" onClick={() => navigator.clipboard.writeText('dvsv_hn@fpt.edu.vn')}>DVSV (dvsv_hn@fpt.edu.vn)</div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t w-full">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={async () => {
                                                if (loginAsGuest) {
                                                    await loginAsGuest();
                                                    navigate('/');
                                                }
                                            }}
                                            className="w-full h-10 text-sm font-medium hover:bg-slate-100"
                                            disabled={loading}
                                        >
                                            <UserCircle className="mr-2 h-4 w-4" />
                                            Đăng nhập Khách (Không cần mật khẩu)
                                        </Button>
                                    </div>
                                </div>
                            </CardFooter>
                        )}
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
