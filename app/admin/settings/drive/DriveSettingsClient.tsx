
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DRIVE_CONFIG_KEYS, DriveConfigKey } from '@/lib/config/drive-config';

type ConfigState = Record<DriveConfigKey, { value: string; source: 'DB' | 'ENV' | 'DEFAULT' }>;

interface Props {
    initialConfigs: ConfigState;
}

export default function DriveSettingsClient({ initialConfigs }: Props) {
    const router = useRouter();
    const [configs, setConfigs] = useState<ConfigState>(initialConfigs);
    const [loading, setLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSave = async (key: DriveConfigKey, value: string) => {
        setLoading(key);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/system-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: DRIVE_CONFIG_KEYS[key],
                    value: value,
                    description: `Google Drive Folder ID for ${key}`,
                    category: 'drive_config',
                }),
            });

            if (!response.ok) throw new Error('Failed to update config');

            setMessage({ type: 'success', text: `Updated ${key} successfully` });
            router.refresh();

            // Update local state to reflect DB source
            setConfigs(prev => ({
                ...prev,
                [key]: { value, source: 'DB' }
            }));
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update configuration' });
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {message && (
                <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid gap-6">
                {(Object.keys(DRIVE_CONFIG_KEYS) as DriveConfigKey[]).map((key) => {
                    const config = configs[key];
                    const isEnv = config.source === 'ENV';
                    const isDefault = config.source === 'DEFAULT';

                    return (
                        <div key={key} className="bg-white p-6 rounded-lg shadow border border-gray-200">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">{key}</h3>
                                    <p className="text-sm text-gray-500 font-mono mt-1">{DRIVE_CONFIG_KEYS[key]}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.source === 'DB' ? 'bg-blue-100 text-blue-800' :
                                    config.source === 'ENV' ? 'bg-purple-100 text-purple-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                    Source: {config.source}
                                </span>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        defaultValue={config.value}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                        id={`input-${key}`}
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        const input = document.getElementById(`input-${key}`) as HTMLInputElement;
                                        handleSave(key, input.value);
                                    }}
                                    disabled={loading === key}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {loading === key ? 'Saving...' : 'Save'}
                                </button>
                            </div>

                            {isEnv && (
                                <p className="mt-2 text-xs text-purple-600">
                                    * Currently using Environment Variable. Saving will override this with a Database value.
                                </p>
                            )}
                            {isDefault && (
                                <p className="mt-2 text-xs text-gray-500">
                                    * Currently using Default value.
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="mt-8 pt-8 border-t border-gray-200 space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Manual Actions</h2>

                {/* Trigger Manual Backup */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Trigger Manual Backup</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Immediately run the daily backup process. This will sync all data (Contracts, Documents, APIS, Leads, Sales, Settlements) to Google Drive.
                    </p>
                    <button
                        onClick={async () => {
                            if (!confirm('Are you sure you want to start the backup process now? This may take a few minutes.')) return;
                            setLoading('manual_backup');
                            setMessage(null);
                            try {
                                const res = await fetch('/api/cron/drive-sync?manual=true');
                                const data = await res.json();
                                if (data.ok) {
                                    setMessage({ type: 'success', text: 'Backup process started successfully. Check Drive in a few minutes.' });
                                } else {
                                    throw new Error(data.error || 'Backup failed');
                                }
                            } catch (e: any) {
                                setMessage({ type: 'error', text: e.message || 'Failed to start backup' });
                            } finally {
                                setLoading(null);
                            }
                        }}
                        disabled={loading === 'manual_backup'}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                        {loading === 'manual_backup' ? 'Starting Backup...' : 'Run Backup Now'}
                    </button>
                </div>

                {/* Quick Links to Google Drive Folders */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Links to Google Drive Folders</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {configs.CASHFLOW && (
                            <a
                                href={`https://drive.google.com/drive/folders/${configs.CASHFLOW.value}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 border border-blue-200 rounded-md hover:bg-blue-50 transition"
                            >
                                <span className="text-2xl">💰</span>
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">Cashflow (판매원별 수당)</div>
                                    <div className="text-xs text-gray-500 font-mono truncate">{configs.CASHFLOW.value}</div>
                                </div>
                            </a>
                        )}
                        {configs.TOTALCASH && (
                            <a
                                href={`https://drive.google.com/drive/folders/${configs.TOTALCASH.value}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 border border-purple-200 rounded-md hover:bg-purple-50 transition"
                            >
                                <span className="text-2xl">🏢</span>
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">Totalcash (거래처용 월별)</div>
                                    <div className="text-xs text-gray-500 font-mono truncate">{configs.TOTALCASH.value}</div>
                                </div>
                            </a>
                        )}
                        {configs.SHARED_DRIVE && (
                            <a
                                href={`https://drive.google.com/drive/folders/${configs.SHARED_DRIVE.value}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition"
                            >
                                <span className="text-2xl">📂</span>
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">Shared Drive Root</div>
                                    <div className="text-xs text-gray-500 font-mono truncate">{configs.SHARED_DRIVE.value}</div>
                                </div>
                            </a>
                        )}
                        {configs.B2B_BACKUP && (
                            <a
                                href={`https://drive.google.com/drive/folders/${configs.B2B_BACKUP.value}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 border border-green-200 rounded-md hover:bg-green-50 transition"
                            >
                                <span className="text-2xl">💾</span>
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">B2B Backup</div>
                                    <div className="text-xs text-gray-500 font-mono truncate">{configs.B2B_BACKUP.value}</div>
                                </div>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
