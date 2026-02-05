import { useAuth } from '../contexts/AuthContext';
import LecturerDashboard from './LecturerDashboard';
import ManagerDashboard from './ManagerDashboard';
import AdminDashboard from './AdminDashboard';
// import StudentAffairsDashboard from './StudentAffairsDashboard';

export default function RoleDispatcher() {
    const { profile } = useAuth();

    if (!profile) return <div>Loading role...</div>;

    switch (profile.role) {
        case 'gv':
        case 'guest':
            return <LecturerDashboard />;
        case 'cnbm':
            return <ManagerDashboard />;
        case 'truong_nganh':
            return <AdminDashboard />;
        case 'dvsv':
            return <div>DVSV Dashboard temporarily disabled</div>;
        //     return <StudentAffairsDashboard />;
        case 'ho':
            // HO sees Admin view but read-only (simplified reuse for now) or specific view
            // For this spec, HO is a viewer. Let's reuse AdminDashboard but maybe hide actions?
            // Or just a Viewer Component. For now, let's return AdminDashboard but users handled via RLS will see finalized data.
            return <AdminDashboard />;
        default:
            return <div>Access Denied</div>;
    }
}
