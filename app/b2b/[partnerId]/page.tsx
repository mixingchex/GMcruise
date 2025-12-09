import B2BLandingClient from './B2BLandingClient';
import { DEFAULT_B2B_LANDING_TEMPLATE } from '../../../lib/constants/b2b-landing-template';

export default async function PartnerB2BLandingPage({ params }: { params: { partnerId: string } }) {
    // 항상 최신 파일 템플릿 사용 (미니 클래스, 이미지 그리드 등 포함)
    // 모든 대리점장이 동일한 최신 템플릿을 사용하도록 함
    const template = DEFAULT_B2B_LANDING_TEMPLATE;

    return <B2BLandingClient partnerId={params.partnerId} initialTemplate={template} />;
}
