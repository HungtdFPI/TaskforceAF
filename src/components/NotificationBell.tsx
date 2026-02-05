import { useEffect, useState } from 'react';
import { Bell, CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { type Notification } from '../types';

export function NotificationBell() {
    const { user, profile } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            // Pass campus only for non-GV roles or roles that need filtering
            // For GV, usually they see their own or campus general? 
            // Better logic: if profile.campus is present, pass it?
            // Wait, api.ts logic says: if campus provided, filter by it OR global.
            // If user is GV, do they want to see campus news? Yes.
            // So let's always pass profile.campus if available.
            const shouldFilterByCampus = !['ho'].includes(user.role || ''); // HO sees all
            const campusToFilter = shouldFilterByCampus ? profile?.campus : undefined;

            const data = await api.fetchNotifications(
                user.id,
                user.role === 'guest' || user.id.startsWith('demo-'),
                campusToFilter
            );
            setNotifications(data);

            // Calculate unread
            const currentUserId = user.id;
            const unread = data.filter(n => !n.read_by?.includes(currentUserId));
            setUnreadCount(unread.length);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (user) fetchNotifications();

        // Listen for local storage changes (instant demo updates)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'mock_notifications') {
                fetchNotifications();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Also listen for custom event for same-tab updates
        const handleCustomEvent = () => fetchNotifications();
        window.addEventListener('notification_update', handleCustomEvent);

        const interval = setInterval(fetchNotifications, 30000);
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('notification_update', handleCustomEvent);
        };
    }, [user, profile]); // Add profile dependency for campus

    const handleMarkRead = async (notifId: string) => {
        setNotifications(prev => prev.map(n =>
            n.id === notifId ? { ...n, read_by: [...(n.read_by || []), user?.id || ''] } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));

        await api.markNotificationRead(
            notifId,
            user?.id || '',
            user?.role === 'guest' || (user?.id || '').startsWith('demo-')
        );
    };

    const getTypeStyles = (type: Notification['type'], isRead: boolean) => {
        if (isRead) return "opacity-60";
        switch (type) {
            case 'report_rejected': return "bg-red-50 border-l-2 border-l-red-500";
            case 'report_approved': return "bg-green-50 border-l-2 border-l-green-500";
            case 'report_updated': return "bg-amber-50 border-l-2 border-l-amber-500";
            case 'report_created': return "bg-blue-50 border-l-2 border-l-blue-500";
            default: return "bg-slate-50";
        }
    };

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'report_created': return <Info className="w-4 h-4 text-blue-500" />;
            case 'report_approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'report_rejected': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'report_updated': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            default: return <Bell className="w-4 h-4" />;
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-slate-600" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="font-normal text-xs text-slate-500">Thông báo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">Không có thông báo mới</div>
                    ) : (
                        notifications.map(notif => {
                            const isRead = notif.read_by?.includes(user?.id || '');
                            return (
                                <DropdownMenuItem
                                    key={notif.id}
                                    className={cn(
                                        "flex flex-col items-start gap-1 p-3 cursor-pointer mb-1 rounded-md transition-colors",
                                        getTypeStyles(notif.type, !!isRead)
                                    )}
                                    onClick={() => handleMarkRead(notif.id)}
                                >
                                    <div className="flex items-center gap-2 w-full">
                                        {getIcon(notif.type)}
                                        <span className={cn("font-medium text-sm text-slate-800 flex-1 truncate", isRead && "font-normal text-slate-500")}>
                                            {notif.title}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(notif.created_at).toLocaleDateString('vi-VN')}
                                        </span>
                                    </div>
                                    <p className={cn("text-xs text-slate-600 line-clamp-2 pl-6", isRead && "text-slate-400")}>
                                        {notif.message}
                                    </p>
                                </DropdownMenuItem>
                            );
                        })
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
