
import { getAllDriveConfigs } from '@/lib/config/drive-config';
import DriveSettingsClient from './DriveSettingsClient';

export const dynamic = 'force-dynamic';

export default async function DriveSettingsPage() {
    const configs = await getAllDriveConfigs();

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Google Drive Folder Settings</h1>
            <p className="mb-6 text-gray-600">
                Manage Google Drive folder IDs for various system backups and uploads.
                <br />
                <span className="text-sm text-gray-500">
                    Priority: <strong>Database (SystemConfig)</strong> {'>'} <strong>Environment Variable</strong> {'>'} <strong>Default</strong>
                </span>
            </p>

            <DriveSettingsClient initialConfigs={configs} />
        </div>
    );
}
