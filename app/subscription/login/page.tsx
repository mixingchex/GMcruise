import { PrismaClient } from '@prisma/client';
import B2BLandingClient from '../../b2b/[partnerId]/B2BLandingClient';
import { DEFAULT_B2B_LANDING_TEMPLATE } from '../../../lib/constants/b2b-landing-template';

const prisma = new PrismaClient();

export default async function SubscriptionLoginPage() {
  // 1. Fetch Global Template
  let template = DEFAULT_B2B_LANDING_TEMPLATE;

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { configKey: 'B2B_LANDING_TEMPLATE' }
    });

    if (config?.configValue) {
      template = config.configValue;
    }
  } catch (error) {
    console.error('[Subscription Login] Failed to fetch template:', error);
  }

  // partnerId is optional in B2BLandingClient, so we don't pass it.
  return <B2BLandingClient template={template} />;
}
