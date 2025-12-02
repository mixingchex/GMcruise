const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // boss1의 profileId 찾기
  const boss1Profile = await prisma.affiliateProfile.findFirst({
    where: {
      User: { mallUserId: "boss1" }
    },
    select: { id: true, type: true }
  });
  console.log("boss1 profile:", boss1Profile);

  // user1의 profileId 찾기
  const user1Profile = await prisma.affiliateProfile.findFirst({
    where: {
      User: { mallUserId: "user1" }
    },
    select: { id: true, type: true }
  });
  console.log("user1 profile:", user1Profile);

  if (!boss1Profile || !user1Profile) {
    console.log("프로필을 찾을 수 없습니다");
    return;
  }

  const now = new Date();

  // 테스트 전화상담 고객 생성 - 대리점장 채널
  const lead1 = await prisma.affiliateLead.create({
    data: {
      customerName: "테스트전화상담1",
      customerPhone: "01012345678",
      source: "phone-consultation",
      status: "NEW",
      managerId: boss1Profile.id,
      agentId: null,
      updatedAt: now,
      metadata: {
        productCode: "TEST-001",
        productName: "테스트 크루즈",
        channel: "파트너",
        isPhoneConsultation: true
      }
    }
  });
  console.log("Created lead1 (대리점장 채널):", lead1.id);

  // 테스트 전화상담 고객 생성 - 판매원 채널
  const lead2 = await prisma.affiliateLead.create({
    data: {
      customerName: "테스트전화상담2",
      customerPhone: "01087654321",
      source: "phone-consultation",
      status: "NEW",
      managerId: boss1Profile.id,
      agentId: user1Profile.id,
      updatedAt: now,
      metadata: {
        productCode: "TEST-001",
        productName: "테스트 크루즈",
        channel: "파트너",
        isPhoneConsultation: true
      }
    }
  });
  console.log("Created lead2 (판매원 채널):", lead2.id);

  // 테스트 전화상담 고객 생성 - 본사 채널
  const lead3 = await prisma.affiliateLead.create({
    data: {
      customerName: "테스트전화상담3(본사)",
      customerPhone: "01011112222",
      source: "phone-consultation",
      status: "NEW",
      managerId: null,
      agentId: null,
      updatedAt: now,
      metadata: {
        productCode: "TEST-001",
        productName: "테스트 크루즈",
        channel: "본사",
        isPhoneConsultation: true
      }
    }
  });
  console.log("Created lead3 (본사 채널):", lead3.id);

  console.log("\n테스트 데이터 생성 완료!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
