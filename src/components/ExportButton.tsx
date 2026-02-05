import React from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Button } from './ui/button';
import { Download } from 'lucide-react';
import { type Report } from '../types';

interface ExportButtonProps {
    data: Report[];
    fileName?: string;
    className?: string; // Allow custom styling
}

export const exportToExcel = (data: Report[], fileName: string) => {
    if (!data || data.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
    }

    // 1. Map data to Vietnamese headers
    const exportData = data.map((item, index) => ({
        STT: index + 1,
        'Cơ Sở': item.campus,
        'Giảng Viên ID': item.lecturer_id,
        'Mã Sinh Viên': item.student_code,
        'Tên Sinh Viên': item.student_name,
        'Lớp': item.class_name,
        'Môn Học': item.subject,
        'Tình Trạng Chi Tiết': item.status_detail,
        'Vắng 10%': item.warn_10 ? 'X' : '',
        'Vắng 15-17%': item.warn_15_17 ? 'X' : '',
        'Vắng 20%': item.warn_20 ? 'X' : '',
        'Cấm Thi (AF)': item.banned ? 'X' : '',
        'Ngày Tạo': new Date(item.created_at).toLocaleDateString('vi-VN'),
        'Ghi Chú Giảng Viên': item.teacher_note,
        'Phản Hồi DVSV': item.dvsv_note,
        'Trạng Thái DVSV': item.dvsv_status === 'success' ? 'Thành công' :
            item.dvsv_status === 'failed' ? 'Thất bại' :
                item.dvsv_status === 'pending' ? 'Chờ xử lý' : '',
        'Trạng Thái Báo Cáo': item.status === 'submitted' ? 'Đã gửi' :
            item.status === 'approved' ? 'Đã duyệt' :
                item.status === 'finalized' ? 'Đã chốt' : 'Nháp'
    }));

    // 2. Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // 3. Set column widths
    const wscols = [
        { wch: 5 },  // STT
        { wch: 8 },  // Co So
        { wch: 15 }, // GV ID
        { wch: 15 }, // Ma SV
        { wch: 25 }, // Ten SV
        { wch: 10 }, // Lop
        { wch: 15 }, // Mon
        { wch: 30 }, // Tinh trang
        { wch: 10 }, // Warn 10
        { wch: 10 }, // Warn 15
        { wch: 10 }, // Warn 20
        { wch: 10 }, // Banned
        { wch: 15 }, // Date
        { wch: 25 }, // GV Note
        { wch: 25 }, // DVSV Note
        { wch: 15 }, // DVSV Status
        { wch: 15 }, // Report Status
    ];
    worksheet['!cols'] = wscols;

    // 4. Create workbook and append sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo Cáo');

    // 5. Generate buffer and save
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    saveAs(dataBlob, fileName);
};

export function ExportButton({ data, fileName = 'Bao_Cao_Hoc_Vu.xlsx', className }: ExportButtonProps) {

    const handleExport = () => {
        exportToExcel(data, fileName);
    };

    return (
        <Button
            onClick={handleExport}
            variant="outline"
            className={`text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 ${className}`}
        >
            <Download className="w-4 h-4 mr-2" />
            Xuất Excel
        </Button>
    );
}
