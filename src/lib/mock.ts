import { supabase } from './supabase';
// import { type Report } from '../types'; (unused)

const MOCK_NAMES = [
    'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Cường', 'Phạm Minh Duy', 'Hoàng Thị E',
    'Ngô Văn F', 'Đỗ Thị G', 'Bùi Văn H', 'Lý Thị I', 'Vũ Văn K'
];

const MOCK_CLASSES = ['GDB01', 'GDB02', 'WEB01', 'WEB02'];
const MOCK_SUBJECTS = ['Photoshop', 'Illustrator', 'Figma', 'ReactJS'];

export async function generateMockData(lecturerId: string, campus: 'HN' | 'DN' | 'HCM' | 'CT') {
    const reports = Array.from({ length: 5 }).map((_) => ({
        lecturer_id: lecturerId,
        student_code: `SV2024${Math.floor(1000 + Math.random() * 9000)}`,
        student_name: MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)],
        class_name: MOCK_CLASSES[Math.floor(Math.random() * MOCK_CLASSES.length)],
        subject: MOCK_SUBJECTS[Math.floor(Math.random() * MOCK_SUBJECTS.length)],
        campus: campus,
        status: 'draft',
        warn_10: Math.random() > 0.7,
        warn_15_17: false,
        warn_20: false,
        banned: false,
        status_detail: '',
        teacher_note: '',
        dvsv_note: ''
    }));

    const { error } = await supabase.from('reports').insert(reports);
    if (error) throw error;
}

export async function clearMockData(lecturerId: string) {
    const { error } = await supabase
        .from('reports')
        .delete()
        .eq('lecturer_id', lecturerId)
        .eq('status', 'draft'); // Only clear drafts to be safe
    if (error) throw error;
}
