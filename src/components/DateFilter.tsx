import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CalendarIcon } from "lucide-react";

export type DateFilterType = 'all' | 'today' | 'week' | 'month';

interface DateFilterProps {
    value: DateFilterType;
    onChange: (value: DateFilterType) => void;
}

export function DateFilter({ value, onChange }: DateFilterProps) {
    return (
        <div className="flex items-center gap-2">
            <Select value={value} onValueChange={(v) => onChange(v as DateFilterType)}>
                <SelectTrigger className="w-[180px] bg-white border-slate-200">
                    <CalendarIcon className="w-4 h-4 mr-2 text-slate-500" />
                    <SelectValue placeholder="Chọn thời gian" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tất cả thời gian</SelectItem>
                    <SelectItem value="today">Hôm nay</SelectItem>
                    <SelectItem value="week">Tuần này</SelectItem>
                    <SelectItem value="month">Tháng này</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
