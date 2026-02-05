export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'finalized';
export type UserRole = 'gv' | 'cnbm' | 'truong_nganh' | 'ho' | 'guest' | 'dvsv' | 'tbdt';
export type CampusCode = 'HN' | 'DN' | 'HCM' | 'CT';
export type DvsvStatus = 'pending' | 'success' | 'failed';

export interface Report {
    id: string;
    lecturer_id: string;
    student_code: string;
    student_name: string;
    class_name: string;
    subject: string;
    campus: CampusCode;

    warn_10: boolean;
    warn_15_17: boolean;
    warn_20: boolean;
    banned: boolean; // AF

    status_detail: string;
    teacher_note: string;
    dvsv_note: string;
    dvsv_status?: DvsvStatus;

    // Excel Alignment Fields
    study_status: string; // Trạng thái (Học đi, nghỉ học...)
    assessment_date: string; // Ngày đánh giá

    status: ReportStatus;
    created_at: string;
    updated_at: string;
}

export const CAMPUS_NAMES: Record<CampusCode, string> = {
    HN: 'Hà Nội',
    DN: 'Đà Nẵng',
    HCM: 'Hồ Chí Minh',
    CT: 'Cần Thơ',
};

export const ROLE_NAMES: Record<UserRole, string> = {
    gv: 'Giảng viên',
    cnbm: 'Chủ nhiệm bộ môn',
    truong_nganh: 'Trưởng ngành',
    ho: 'Head Office',
    dvsv: 'Dịch vụ sinh viên',
    guest: 'Khách tham quan',
    tbdt: 'Trưởng ban đào tạo',
};

export interface ReportLog {
    id: string;
    report_id: string;
    user_id: string;
    user_name: string;
    content: string;
    type: 'status_detail' | 'teacher_note' | 'dvsv_note' | 'full_update';
    created_at: string;
}

export interface Notification {
    id: string;
    campus: CampusCode;
    title: string;
    message: string;
    type: 'report_created' | 'report_updated' | 'report_approved' | 'report_rejected';
    read_by: string[]; // List of user IDs who have read this
    created_at: string;
    related_id?: string; // e.g., report_id
}
