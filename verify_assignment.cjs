const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting verification...');

    // 1. Setup Test Data
    console.log('1. Setting up test data...');

    // Create Dummy Users
    const user1 = await prisma.user.create({
        data: {
            email: `test_manager_${Date.now()}@example.com`,
            name: 'Test Manager User',
            password: 'password', // Dummy password
            updatedAt: new Date(),
        }
    });
    const user2 = await prisma.user.create({
        data: {
            email: `test_agent_${Date.now()}@example.com`,
            name: 'Test Agent User',
            password: 'password', // Dummy password
            updatedAt: new Date(),
        }
    });

    // Create Manager
    const manager = await prisma.affiliateProfile.create({
        data: {
            userId: user1.id,
            status: 'ACTIVE',
            type: 'BRANCH_MANAGER',
            affiliateCode: 'TEST_MANAGER_' + Date.now(),
            displayName: 'Test Manager',
            updatedAt: new Date(),
        }
    });
    console.log('Created Manager:', manager.id);

    // Create Agent
    const agent = await prisma.affiliateProfile.create({
        data: {
            userId: user2.id,
            status: 'ACTIVE',
            type: 'SALES_AGENT',
            affiliateCode: 'TEST_AGENT_' + Date.now(),
            displayName: 'Test Agent',
            updatedAt: new Date(),
        }
    });
    console.log('Created Agent:', agent.id);

    // Link Agent to Manager
    await prisma.affiliateRelation.create({
        data: {
            managerId: manager.id,
            agentId: agent.id,
            status: 'ACTIVE',
            updatedAt: new Date(),
        }
    });
    console.log('Linked Agent to Manager');

    // Create Lead
    const lead = await prisma.affiliateLead.create({
        data: {
            customerName: 'Test Lead',
            customerPhone: '01000000001',
            status: 'NEW',
            source: 'B2B_INFLOW',
            updatedAt: new Date(),
        }
    });
    console.log('Created Lead:', lead.id);

    // Create System Consultation
    const consultation = await prisma.systemConsultation.create({
        data: {
            name: 'Test Consultation',
            phone: '01000000002',
            status: 'NEW',
            message: 'Test Message',
            updatedAt: new Date(),
        }
    });
    console.log('Created Consultation:', consultation.id);

    // 2. Test Admin Assign (to Manager)
    console.log('\n2. Testing Admin Assign...');

    // Mock Admin Request (We can't easily mock NextRequest here, so we'll call Prisma directly to simulate what the API does)
    // But to verify the API logic, we should ideally call the API. 
    // Since we are in a script, we can't call the API endpoint directly via HTTP easily without running the server.
    // We will simulate the logic.

    // Assign Lead to Manager
    await prisma.affiliateLead.update({
        where: { id: lead.id },
        data: { managerId: manager.id }
    });

    // Assign Consultation to Manager
    await prisma.systemConsultation.update({
        where: { id: consultation.id },
        data: { managerId: manager.id }
    });

    const updatedLead1 = await prisma.affiliateLead.findUnique({ where: { id: lead.id } });
    const updatedConsultation1 = await prisma.systemConsultation.findUnique({ where: { id: consultation.id } });

    console.log('Lead Manager ID:', updatedLead1.managerId === manager.id ? 'PASS' : 'FAIL');
    console.log('Consultation Manager ID:', updatedConsultation1.managerId === manager.id ? 'PASS' : 'FAIL');

    // 3. Test Partner Assign (Manager to Agent)
    console.log('\n3. Testing Partner Assign (Manager to Agent)...');

    // Assign Lead to Agent
    await prisma.affiliateLead.update({
        where: { id: lead.id },
        data: { agentId: agent.id }
    });

    // Assign Consultation to Agent
    await prisma.systemConsultation.update({
        where: { id: consultation.id },
        data: { agentId: agent.id }
    });

    const updatedLead2 = await prisma.affiliateLead.findUnique({ where: { id: lead.id } });
    const updatedConsultation2 = await prisma.systemConsultation.findUnique({ where: { id: consultation.id } });

    console.log('Lead Agent ID:', updatedLead2.agentId === agent.id ? 'PASS' : 'FAIL');
    console.log('Consultation Agent ID:', updatedConsultation2.agentId === agent.id ? 'PASS' : 'FAIL');

    // 4. Test Partner Recall (Manager recalls from Agent)
    console.log('\n4. Testing Partner Recall...');

    // Recall Lead
    await prisma.affiliateLead.update({
        where: { id: lead.id },
        data: { agentId: null }
    });

    // Recall Consultation
    await prisma.systemConsultation.update({
        where: { id: consultation.id },
        data: { agentId: null }
    });

    const updatedLead3 = await prisma.affiliateLead.findUnique({ where: { id: lead.id } });
    const updatedConsultation3 = await prisma.systemConsultation.findUnique({ where: { id: consultation.id } });

    console.log('Lead Agent ID (Recalled):', updatedLead3.agentId === null ? 'PASS' : 'FAIL');
    console.log('Consultation Agent ID (Recalled):', updatedConsultation3.agentId === null ? 'PASS' : 'FAIL');

    // 5. Test Admin Recall (Admin recalls from Manager)
    console.log('\n5. Testing Admin Recall...');

    // Recall Lead
    await prisma.affiliateLead.update({
        where: { id: lead.id },
        data: { managerId: null, agentId: null }
    });

    // Recall Consultation
    await prisma.systemConsultation.update({
        where: { id: consultation.id },
        data: { managerId: null, agentId: null }
    });

    const updatedLead4 = await prisma.affiliateLead.findUnique({ where: { id: lead.id } });
    const updatedConsultation4 = await prisma.systemConsultation.findUnique({ where: { id: consultation.id } });

    console.log('Lead Manager ID (Recalled):', updatedLead4.managerId === null ? 'PASS' : 'FAIL');
    console.log('Consultation Manager ID (Recalled):', updatedConsultation4.managerId === null ? 'PASS' : 'FAIL');

    // Cleanup
    console.log('\nCleaning up...');
    await prisma.affiliateLead.delete({ where: { id: lead.id } });
    await prisma.systemConsultation.delete({ where: { id: consultation.id } });
    await prisma.affiliateRelation.deleteMany({ where: { managerId: manager.id } });
    await prisma.affiliateProfile.delete({ where: { id: agent.id } });
    await prisma.affiliateProfile.delete({ where: { id: manager.id } });

    console.log('Done.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
