import { Prisma } from '@prisma/client';

// PartnerCustomerGroup 모델을 위한 include 설정
// PartnerCustomerGroup은 간단한 구조로 CustomerGroupMember 등 관련 테이블이 없음
export const partnerGroupInclude = {
  AffiliateProfile: {
    select: {
      id: true,
      displayName: true,
      type: true,
    },
  },
} satisfies Prisma.PartnerCustomerGroupInclude;

export type PartnerGroupWithRelations = Prisma.PartnerCustomerGroupGetPayload<{
  include: typeof partnerGroupInclude;
}>;

export const serializePartnerGroup = (group: PartnerGroupWithRelations, leadCount?: number) => ({
  id: group.id,
  name: group.name,
  description: group.description,
  color: group.color,
  productCode: group.productCode,
  profileId: group.profileId,
  createdAt: group.createdAt instanceof Date ? group.createdAt.toISOString() : group.createdAt,
  updatedAt: group.updatedAt instanceof Date ? group.updatedAt.toISOString() : group.updatedAt,
  leadCount: leadCount ?? 0,
  funnelTalkIds: Array.isArray(group.funnelTalkIds) ? group.funnelTalkIds : (group.funnelTalkIds ? [group.funnelTalkIds] : []),
  funnelSmsIds: Array.isArray(group.funnelSmsIds) ? group.funnelSmsIds : (group.funnelSmsIds ? [group.funnelSmsIds] : []),
  funnelEmailIds: Array.isArray(group.funnelEmailIds) ? group.funnelEmailIds : (group.funnelEmailIds ? [group.funnelEmailIds] : []),
  reEntryHandling: group.reEntryHandling || null,
  affiliateProfile: group.AffiliateProfile ? {
    id: group.AffiliateProfile.id,
    displayName: group.AffiliateProfile.displayName,
    type: group.AffiliateProfile.type,
  } : null,
});

export const buildOwnershipFilter = (
  profileId: number
): Prisma.PartnerCustomerGroupWhereInput => {
  return { profileId };
};

export const buildScopedGroupWhere = (
  groupId: number,
  profileId: number
): Prisma.PartnerCustomerGroupWhereInput => ({
  AND: [{ id: groupId }, buildOwnershipFilter(profileId)],
});
