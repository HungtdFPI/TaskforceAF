import { supabase } from './supabase';
import { type Report } from '../types';

const STORAGE_KEY = 'mock_reports';
const CHAT_KEY = 'mock_chat_messages';

export interface Message {
    id: string;
    user_id: string;
    user_name: string;
    content: string;
    campus: string;
    created_at: string;
    role: string;
    group_id?: string; // general, lecturers, staff, etc.
}

export const api = {
    // Chat Methods
    async fetchMessages(campus: string, isGuest: boolean, groupId: string = 'general'): Promise<Message[]> {
        if (isGuest || !supabase) {
            const stored = localStorage.getItem(CHAT_KEY);
            let messages: Message[] = stored ? JSON.parse(stored) : [];
            // Filter by campus slightly? For demo, we might just show all or filter. 
            // Let's filter by campus if provided
            if (campus) {
                messages = messages.filter(m => m.campus === campus && (m.group_id === groupId || (!m.group_id && groupId === 'general')));
            }
            return messages;
        }

        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('campus', campus)
            .eq('group_id', groupId) // Ensure your Supabase table has this column or ignore if just simulation
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) {
            console.error('Error fetching messages:', error);
            return []; // Fail gracefully
        }
        return data || [];
    },

    async sendMessage(message: Omit<Message, 'id' | 'created_at'>, isGuest: boolean): Promise<Message> {
        const newMessage: Message = {
            ...message,
            id: isGuest ? `msg-${Date.now()}` : crypto.randomUUID(),
            created_at: new Date().toISOString(),
        };

        if (isGuest || !supabase) {
            const stored = localStorage.getItem(CHAT_KEY);
            const messages: Message[] = stored ? JSON.parse(stored) : [];
            messages.push(newMessage);
            // Limit to last 50
            if (messages.length > 50) messages.shift();
            localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
            return newMessage;
        }

        const { error } = await supabase
            .from('messages')
            .insert({
                user_id: message.user_id,
                user_name: message.user_name,
                content: message.content,
                campus: message.campus,
                role: message.role,
                group_id: message.group_id
            });

        if (error) throw error;
        return newMessage;
    },

    async fetchReports(userId: string, isGuest: boolean = false, role: string = 'gv', campus: string = 'HN'): Promise<Report[]> {
        if (isGuest) {
            const stored = localStorage.getItem(STORAGE_KEY);
            let reports: Report[] = stored ? JSON.parse(stored) : [];

            // Robust filtering for local data
            if (role === 'gv') {
                // Ensure strict string comparison for IDs
                return reports.filter(r => r.lecturer_id === userId);
            } else if (['cnbm', 'dvsv'].includes(role)) {
                // Filter by campus
                // Filter by campus (allow legacy data with !r.campus)
                return reports.filter(r => !r.campus || r.campus === campus);
            } else if (['truong_nganh', 'ho', 'admin'].includes(role)) {
                // Admin sees all
                return reports;
            }

            // Fallback: if role is unknown or guest, maybe just return empty or all?
            // For safety in demo mode, let's return reports that match the user ID if possible, or empty
            return reports.filter(r => r.lecturer_id === userId);
        }

        let queryBuilder = supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply permissions/filtering for real Supabase data
        if (role === 'gv') {
            queryBuilder = queryBuilder.eq('lecturer_id', userId);
        } else if (role === 'cnbm' || role === 'dvsv') {
            queryBuilder = queryBuilder.eq('campus', campus);
        }
        // Admin (truong_nganh/ho) sees all by default

        const { data, error } = await queryBuilder;
        if (error) throw error;
        return data || [];
    },

    async updateReport(report: Report, isGuest: boolean = false): Promise<void> {
        if (isGuest) {
            const reports = await api.fetchReports('', true, 'ho', ''); // Fetch all for update
            const index = reports.findIndex(r => r.id === report.id);
            if (index !== -1) {
                reports[index] = {
                    ...report,
                    updated_at: new Date().toISOString()
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
            }
            return;
        }

        const { error } = await supabase
            .from('reports')
            .update({
                warn_10: report.warn_10,
                warn_15_17: report.warn_15_17,
                warn_20: report.warn_20,
                banned: report.banned,
                status_detail: report.status_detail,
                teacher_note: report.teacher_note,
                dvsv_note: report.dvsv_note,
                dvsv_status: report.dvsv_status,
                status: report.status,
                updated_at: new Date().toISOString()
            })
            .eq('id', report.id);

        if (error) throw error;
    },

    async createReport(report: Omit<Report, 'id' | 'created_at' | 'updated_at'>, isGuest: boolean = false): Promise<void> {
        const newReport = {
            ...report,
            id: isGuest ? `new-${Date.now()}` : crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Default fields if missing
            warn_10: report.warn_10 || false,
            warn_15_17: report.warn_15_17 || false,
            warn_20: report.warn_20 || false,
            banned: report.banned || false,
            status_detail: report.status_detail || '',
            teacher_note: report.teacher_note || '',
            dvsv_note: report.dvsv_note || '',
            dvsv_status: 'pending' as const,
            status: 'draft' as const,
            study_status: report.study_status || 'Học đi',
            assessment_date: report.assessment_date || new Date().toLocaleDateString('vi-VN')
        };

        if (isGuest) {
            const reports = await api.fetchReports('', true, 'ho', '');
            const merged = [newReport, ...reports] as Report[];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

            // Notify
            await api.createNotification({
                campus: report.campus,
                title: 'Báo cáo mới',
                message: `Giảng viên vừa tạo báo cáo cho ${report.student_name}`,
                type: 'report_created',
                related_id: newReport.id
            }, true);
            return;
        }

        const { error } = await supabase.from('reports').insert(newReport);
        if (error) throw error;

        // Notify real users
        await api.createNotification({
            campus: report.campus,
            title: 'Báo cáo mới',
            message: `Giảng viên vừa tạo báo cáo cho ${report.student_name}`,
            type: 'report_created',
            related_id: newReport.id
        }, false);
    },

    async submitReports(reportIds: string[], isGuest: boolean = false): Promise<void> {
        if (isGuest) {
            const reports = await api.fetchReports('', true, 'ho', '');
            const updated = reports.map(r =>
                reportIds.includes(r.id) ? { ...r, status: 'submitted' as const } : r
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return;
        }

        const { error } = await supabase
            .from('reports')
            .update({ status: 'submitted' })
            .in('id', reportIds);

        if (error) throw error;
    },

    async createMockData(lecturerId: string, campus: any, isGuest: boolean = false): Promise<void> {
        // Mock data generator
        const MOCK_NAMES = [
            'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Cường', 'Phạm Minh Duy', 'Hoàng Thị E',
            'Ngô Văn F', 'Đỗ Thị G', 'Bùi Văn H', 'Lý Thị I', 'Vũ Văn K'
        ];
        // Requested classes
        const MOCK_CLASSES = ['GD07201', 'GD07202'];
        const MOCK_SUBJECTS = ['Photoshop', 'Illustrator', 'Figma', 'ReactJS'];

        const newReports = Array.from({ length: 10 }).map((_, i) => {
            const rand = Math.random();
            return {
                id: isGuest ? `mock-${Date.now()}-${i}` : undefined,
                lecturer_id: lecturerId,
                student_code: `SV2024${Math.floor(1000 + Math.random() * 9000)}`,
                student_name: MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)],
                class_name: MOCK_CLASSES[Math.floor(Math.random() * MOCK_CLASSES.length)],
                subject: MOCK_SUBJECTS[Math.floor(Math.random() * MOCK_SUBJECTS.length)],
                campus: campus,
                status: 'draft',
                warn_10: rand > 0.3, // 70% chance
                warn_15_17: rand > 0.6, // 40% chance
                warn_20: rand > 0.85, // 15% chance
                banned: rand > 0.95,
                status_detail: '',
                teacher_note: '',
                dvsv_note: '',
                dvsv_status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
        });

        if (isGuest) {
            const current = await api.fetchReports('', true, 'ho', '');
            // newReports has IDs now
            const merged = [...newReports, ...current] as Report[];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return;
        }

        const { error } = await supabase.from('reports').insert(newReports);
        if (error) throw error;
    },

    async clearDrafts(lecturerId: string, isGuest: boolean = false): Promise<void> {
        if (isGuest) {
            const reports = await api.fetchReports('', true);
            const kept = reports.filter(r => r.status !== 'draft');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
            return;
        }

        const { error } = await supabase
            .from('reports')
            .delete()
            .eq('lecturer_id', lecturerId)
            .eq('status', 'draft');

        if (error) throw error;
    },

    async deleteReport(reportId: string, isGuest: boolean = false): Promise<void> {
        if (isGuest) {
            const reports = await api.fetchReports('', true, 'ho', ''); // Fetch all
            const filtered = reports.filter(r => r.id !== reportId);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
            return;
        }

        const { error } = await supabase
            .from('reports')
            .delete()
            .eq('id', reportId);

        if (error) throw error;
    },

    // Logs / History Methods
    async fetchLogs(reportId: string, isGuest: boolean): Promise<any[]> {
        if (isGuest || !supabase) {
            const stored = localStorage.getItem('mock_report_logs');
            const logs = stored ? JSON.parse(stored) : [];
            return logs.filter((l: any) => l.report_id === reportId).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        const { data, error } = await supabase
            .from('report_logs')
            .select('*')
            .eq('report_id', reportId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching logs:', error);
            return [];
        }
        return data || [];
    },

    async addLog(log: any, isGuest: boolean): Promise<void> {
        const newLog = {
            ...log,
            id: isGuest ? `log-${Date.now()}` : crypto.randomUUID(),
            created_at: new Date().toISOString()
        };

        if (isGuest || !supabase) {
            const stored = localStorage.getItem('mock_report_logs');
            const logs = stored ? JSON.parse(stored) : [];
            logs.push(newLog);
            localStorage.setItem('mock_report_logs', JSON.stringify(logs));
            return;
        }

        const { error } = await supabase
            .from('report_logs')
            .insert(newLog);

        if (error) throw error;
    },

    // Notification Methods
    async fetchNotifications(_userId: string, isGuest: boolean, campus?: string): Promise<any[]> {
        if (isGuest || !supabase) {
            const stored = localStorage.getItem('mock_notifications');
            let notifs = stored ? JSON.parse(stored) : [];

            // Filter by campus if provided (crucial for CNBM/Admin demo)
            if (campus) {
                notifs = notifs.filter((n: any) => !n.campus || n.campus === campus);
            }

            return notifs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        let query = supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false });

        if (campus) {
            query = query.eq('campus', campus);
        }

        const { data, error } = await query;
        if (error) return [];
        return data || [];
    },

    async createNotification(notif: any, isGuest: boolean): Promise<void> {
        const newNotif = {
            ...notif,
            id: isGuest ? `notif-${Date.now()}` : crypto.randomUUID(),
            created_at: new Date().toISOString(),
            read_by: [],
            campus: notif.campus || 'HN' // Ensure campus is always set
        };

        if (isGuest || !supabase) {
            const stored = localStorage.getItem('mock_notifications');
            const notifs = stored ? JSON.parse(stored) : [];
            notifs.push(newNotif);
            // Limit to last 50 notifications to prevent storage overflow
            if (notifs.length > 50) notifs.shift();
            localStorage.setItem('mock_notifications', JSON.stringify(notifs));
            return;
        }

        const { error } = await supabase.from('notifications').insert(newNotif);
        if (error) console.error('Error creating notification', error);
    },

    async markNotificationRead(notifId: string, userId: string, isGuest: boolean): Promise<void> {
        if (isGuest || !supabase) {
            const stored = localStorage.getItem('mock_notifications');
            if (stored) {
                const notifs = JSON.parse(stored);
                const updated = notifs.map((n: any) =>
                    n.id === notifId ? { ...n, read_by: [...(n.read_by || []), userId] } : n
                );
                localStorage.setItem('mock_notifications', JSON.stringify(updated));
            }
            return;
        }
        // Supabase implementation omitted for brevity, adding valid stub
    }
};
