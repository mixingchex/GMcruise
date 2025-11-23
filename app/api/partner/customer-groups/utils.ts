import { Prisma } from '@prisma/client';

export const partnerGroupInclude = {
  CustomerGroupMember: {
    include: {
      User_CustomerGroupMember_userIdToUser: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
    },
  },
  other_CustomerGroup: {
    select: {
      id: true,
      name: true,
      color: true,
      parentGroupId: true,
      _count: {
        select: {
          CustomerGroupMember: true,
        },
      },
    },
  },
  ScheduledMessage: {
    select: {
      id: true,
      title: true,
      isActive: true,
    },
  },
  _count: {
    select: {
      CustomerGroupMember: true,
    },
  },
} satisfies Prisma.CustomerGroupInclude;

export type PartnerGroupWithRelations = Prisma.CustomerGroupGetPayload<{
  include: typeof partnerGroupInclude;
}>;

export const serializePartnerGroup = (group: PartnerGroupWithRelations, leadCount?: number) => ({
  id: group.id,
  adminId: group.adminId,
  name: group.name,
  description: group.description,
  color: group.color,
  parentGroupId: group.parentGroupId,
  affiliateProfileId: group.affiliateProfileId,
  createdAt: group.createdAt instanceof Date ? group.createdAt.toISOString() : group.createdAt,
  updatedAt: group.updatedAt instanceof Date ? group.updatedAt.toISOString() : group.updatedAt,
  leadCount: leadCount ?? 0, // AffiliateLead에서 계산된 고객 수
  members: group.CustomerGroupMember.map((member) => ({
    id: member.id,
    groupId: member.groupId,
    userId: member.userId,
    addedAt: member.addedAt instanceof Date ? member.addedAt.toISOString() : member.addedAt,
    addedBy: member.addedBy,
    user: member.User_CustomerGroupMember_userIdToUser,
  })),
  subGroups:
    (Array.isArray(group.other_CustomerGroup) ? group.other_CustomerGroup : []).map((subGroup) => ({
      id: subGroup.id,
      name: subGroup.name,
      color: subGroup.color,
      parentGroupId: subGroup.parentGroupId,
      _count: {
        members: subGroup._count.CustomerGroupMember,
      },
    })),
  scheduledMessages:
    (Array.isArray(group.ScheduledMessage) ? group.ScheduledMessage : []).map((message) => ({
      id: message.id,
      title: message.title,
      isActive: message.isActive,
    })),
  funnelTalkIds: Array.isArray(group.funnelTalkIds) ? group.funnelTalkIds : (group.funnelTalkIds ? [group.funnelTalkIds] : []),
  funnelSmsIds: Array.isArray(group.funnelSmsIds) ? group.funnelSmsIds : (group.funnelSmsIds ? [group.funnelSmsIds] : []),
  funnelEmailIds: Array.isArray(group.funnelEmailIds) ? group.funnelEmailIds : (group.funnelEmailIds ? [group.funnelEmailIds] : []),
  reEntryHandling: group.reEntryHandling || null,
  _count: {
    members: group._count.CustomerGroupMember,
  },
});

export const buildOwnershipFilter = (
  userId: number,
  affiliateProfileId?: number
): Prisma.CustomerGroupWhereInput => {
  if (affiliateProfileId) {
    return {
      OR: [{ adminId: userId }, { affiliateProfileId }],
    };
  }
  return { adminId: userId };
};

export const buildScopedGroupWhere = (
  groupId: number,
  userId: number,
  affiliateProfileId?: number
): Prisma.CustomerGroupWhereInput => ({
  AND: [{ id: groupId }, buildOwnershipFilter(userId, affiliateProfileId)],
});
