import prisma from '@/lib/prisma';
import B2BLandingClient from './B2BLandingClient';
import { DEFAULT_B2B_LANDING_TEMPLATE } from '../../../lib/constants/b2b-landing-template';

const DEFAULT_TEMPLATE = DEFAULT_B2B_LANDING_TEMPLATE;

export default async function PartnerB2BLandingPage({ params }: { params: { partnerId: string } }) {
    // 1. Fetch Partner-Specific Template or Global Template
    let template = DEFAULT_TEMPLATE;

    try {
        // First, try to find partner-specific template
        const partnerProfile = await prisma.affiliateProfile.findFirst({
            where: {
                OR: [
                    { landingSlug: params.partnerId },
                    { User: { mallUserId: params.partnerId } },
                    { User: { phone: params.partnerId } },
                ]
            },
            select: {
                id: true,
                metadata: true,
                displayName: true,
            }
        });

        // Check if partner has custom template in metadata
        if (partnerProfile?.metadata) {
            const metadata = partnerProfile.metadata as any;
            if (metadata.b2bLandingTemplate) {
                template = metadata.b2bLandingTemplate;
                console.log(`[B2B Landing] Using partner-specific template for ${params.partnerId}`);
            } else {
                // No custom template, use global
                console.log(`[B2B Landing] No custom template for ${params.partnerId}, using global template`);
            }
        }

        // If no partner-specific template, fetch global template
        if (template === DEFAULT_TEMPLATE) {
            const config = await prisma.systemConfig.findUnique({
                where: { configKey: 'B2B_LANDING_TEMPLATE' }
            });

            if (config?.configValue) {
                template = config.configValue;
            } else {
                // Seed the DB if empty
                await prisma.systemConfig.create({
                    data: {
                        configKey: 'B2B_LANDING_TEMPLATE',
                        configValue: DEFAULT_TEMPLATE,
                        description: 'B2B Partner Landing Page HTML Template (Global Default)',
                        category: 'landing_page',
                        updatedAt: new Date(),
                    }
                });
            }
        }
    } catch (error) {
        console.error('[B2B Landing] Failed to fetch template:', error);
    }

    return <B2BLandingClient partnerId={params.partnerId} initialTemplate={template} />;
}
