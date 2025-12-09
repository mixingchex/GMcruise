import prisma from '@/lib/prisma';
import B2BLandingClient from './[partnerId]/B2BLandingClient';
import { DEFAULT_B2B_LANDING_TEMPLATE } from '../../lib/constants/b2b-landing-template';

export default async function B2BLandingPage() {
    let template = DEFAULT_B2B_LANDING_TEMPLATE;

    try {
        const config = await prisma.systemConfig.findUnique({
            where: { configKey: 'B2B_LANDING_TEMPLATE' }
        });

        if (config?.configValue) {
            template = config.configValue;
        }
    } catch (error) {
        console.error('[B2B Landing] Failed to fetch global template:', error);
    }

    return <B2BLandingClient initialTemplate={template} />;
}
