
import prisma from '@/lib/prisma';

export const DRIVE_CONFIG_KEYS = {
    SIGNATURES: 'google_drive_signatures_folder_id',
    PASSPORTS: 'google_drive_passport_folder_id',
    ID_CARDS: 'google_drive_id_card_folder_id',
    BANKBOOKS: 'google_drive_bankbook_folder_id',
    B2B_BACKUP: 'google_drive_b2b_backup_folder_id',
    MEETING_RECORDINGS: 'google_drive_meeting_recordings_folder_id',
    PROFILES: 'google_drive_profiles_folder_id',
    PRODUCTS: 'google_drive_products_folder_id',
    CONTRACTS: 'google_drive_contracts_folder_id',
    AFFILIATE_DOCUMENTS: 'google_drive_affiliate_documents_folder_id',
    APIS_BACKUP: 'google_drive_apis_backup_folder_id',
    LEADS_BACKUP: 'google_drive_leads_backup_folder_id',
    SALES_BACKUP: 'google_drive_sales_backup_folder_id',
    SETTLEMENTS_BACKUP: 'google_drive_settlements_backup_folder_id',
    TRAVEL_GUIDES: 'google_drive_travel_guides_folder_id',
    UPLOADS_IMAGES: 'google_drive_uploads_images_folder_id',
    APIS_MAIN: 'google_drive_apis_main_folder_id',
    APIS_TEMPLATE_ID: 'google_drive_apis_template_id',
    ROOT: 'google_drive_root_folder_id',
} as const;

export type DriveConfigKey = keyof typeof DRIVE_CONFIG_KEYS;

// Default Fallbacks (from existing code or user provided)
export const DEFAULTS: Record<DriveConfigKey, string> = {
    SIGNATURES: '1PcdSnWQ3iCdd87Y-UI_63HSjlYqcFGyX', // 계약서 싸인 이미지
    PASSPORTS: '1OcqlLCumcXA84yOnH1YrDHQI7vHN-R8u',
    ID_CARDS: '1DFWpAiS-edjiBym5Y5AonDOl2wXyuDV0', // 신분증
    BANKBOOKS: '1IjNSTTTBjU9NZE6fm6DeAAHBx4puWCRl', // 통장사본
    B2B_BACKUP: '1_svzM0e22cLbgABfRHa9__Xtgi46q2nZ', // Backups/B2B_Leads
    MEETING_RECORDINGS: '1dhTmPheRvOsc0V0ukpKOqD2Ry1IN-OrH', // 구매고객 녹음 파일
    PRODUCTS: '0AJVz1C-KYWR0Uk9PVA',
    PROFILES: '0AJVz1C-KYWR0Uk9PVA',
    CONTRACTS: '1HN-w4tNLdmfW5K5N3zF52P_InrUdBkQ', // 모든 계약서 (Removed trailing underscore if typo, but user sent with _. I'll assume typo for now as it matches old signature ID exactly)
    AFFILIATE_DOCUMENTS: '1vPvuzpdNqGd1JAUK3zNMVkcF_9kRQMGI',
    APIS_BACKUP: '1XirPBgHqPq1fmTBjYAqtGEDmCNMzpZDB', // Backups/APIS
    LEADS_BACKUP: '1u3ntHUQHR1AQYqXBsZVdDhGV6eIOLkE6', // Backups/Leads
    SALES_BACKUP: '1XQk6nou684nm75djLgDq6eejvJUbWGXg', // Backups/Sales_Data
    SETTLEMENTS_BACKUP: '1oEzUJWJezJPAP-bGZY3do2oVN7eYJ09D', // Backups/Settlements
    TRAVEL_GUIDES: '17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck', // 크루즈정보사진 (Travel Guides)
    UPLOADS_IMAGES: '17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck', // Default to Travel Guides for images
    APIS_MAIN: '185t2eIIPDsEm-QW9KmhTbxkrywFJhGdk', // 여행별 APIS 메인 폴더
    APIS_TEMPLATE_ID: '1Le6IPNzyvMqpn-6ZnqgvH0JTQ8O5rKymWMU_pkfbQ5Q', // APIS 양식 시트
    ROOT: '0AJVz1C-KYWR0Uk9PVA',
};

// Env Var Mapping
export const ENV_MAPPING: Record<DriveConfigKey, string | undefined> = {
    SIGNATURES: process.env.GOOGLE_DRIVE_SIGNATURES_FOLDER_ID,
    PASSPORTS: process.env.GOOGLE_DRIVE_PASSPORTS_FOLDER_ID,
    ID_CARDS: process.env.GOOGLE_DRIVE_ID_CARDS_FOLDER_ID,
    BANKBOOKS: process.env.GOOGLE_DRIVE_BANKBOOKS_FOLDER_ID,
    B2B_BACKUP: process.env.GOOGLE_DRIVE_B2B_BACKUP_FOLDER_ID,
    MEETING_RECORDINGS: process.env.GOOGLE_DRIVE_MEETING_RECORDINGS_FOLDER_ID,
    PRODUCTS: process.env.GOOGLE_DRIVE_PRODUCTS_FOLDER_ID,
    PROFILES: process.env.GOOGLE_DRIVE_PROFILES_FOLDER_ID,
    CONTRACTS: process.env.GOOGLE_DRIVE_CONTRACTS_FOLDER_ID,
    AFFILIATE_DOCUMENTS: process.env.GOOGLE_DRIVE_AFFILIATE_DOCUMENTS_FOLDER_ID,
    APIS_BACKUP: process.env.GOOGLE_DRIVE_APIS_BACKUP_FOLDER_ID,
    LEADS_BACKUP: process.env.GOOGLE_DRIVE_LEADS_BACKUP_FOLDER_ID,
    SALES_BACKUP: process.env.GOOGLE_DRIVE_SALES_BACKUP_FOLDER_ID,
    SETTLEMENTS_BACKUP: process.env.GOOGLE_DRIVE_SETTLEMENTS_BACKUP_FOLDER_ID,
    TRAVEL_GUIDES: process.env.GOOGLE_DRIVE_TRAVEL_GUIDES_FOLDER_ID,
    UPLOADS_IMAGES: process.env.GOOGLE_DRIVE_UPLOADS_IMAGES_FOLDER_ID,
    APIS_MAIN: process.env.GOOGLE_DRIVE_APIS_MAIN_FOLDER_ID,
    APIS_TEMPLATE_ID: process.env.GOOGLE_DRIVE_APIS_TEMPLATE_ID,
    ROOT: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
};

export async function getDriveFolderId(key: DriveConfigKey): Promise<string> {
    try {
        // 1. Check SystemConfig (DB)
        const configKey = DRIVE_CONFIG_KEYS[key];
        const config = await prisma.systemConfig.findUnique({
            where: { configKey },
            select: { configValue: true },
        });

        if (config?.configValue) {
            return config.configValue;
        }

        // 2. Check Environment Variable
        const envVar = ENV_MAPPING[key];
        const envValue = process.env[envVar];
        if (envValue) {
            return envValue;
        }

        // 3. Return Default
        return DEFAULTS[key];
    } catch (error) {
        console.error(`[DriveConfig] Error fetching config for ${key}:`, error);
        // Fallback to env or default even on DB error
        return process.env[ENV_MAPPING[key]] || DEFAULTS[key];
    }
}

export async function getAllDriveConfigs() {
    const configs = await prisma.systemConfig.findMany({
        where: {
            configKey: {
                in: Object.values(DRIVE_CONFIG_KEYS),
            },
        },
    });

    const result = {} as Record<DriveConfigKey, { value: string; source: 'DB' | 'ENV' | 'DEFAULT' }>;

    for (const key of Object.keys(DRIVE_CONFIG_KEYS) as DriveConfigKey[]) {
        const dbConfig = configs.find((c) => c.configKey === DRIVE_CONFIG_KEYS[key]);

        if (dbConfig?.configValue) {
            result[key] = { value: dbConfig.configValue, source: 'DB' };
        } else if (process.env[ENV_MAPPING[key]]) {
            result[key] = { value: process.env[ENV_MAPPING[key]]!, source: 'ENV' };
        } else {
            result[key] = { value: DEFAULTS[key], source: 'DEFAULT' };
        }
    }

    return result;
}
