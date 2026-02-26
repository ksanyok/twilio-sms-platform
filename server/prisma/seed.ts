import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Admin credentials from .env
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@securecreditlines.com';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const adminLastName = process.env.ADMIN_LAST_NAME || 'SCL';

  // Create admin user
  const adminPassword = await bcrypt.hash(adminPass, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminPassword }, // Always sync password from env
    create: {
      email: adminEmail,
      passwordHash: adminPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: 'ADMIN',
    },
  });
  console.log(`  ✅ Admin user created/updated: ${admin.email}`);

  // Create demo rep
  const repPassword = await bcrypt.hash('rep123', 12);
  const rep = await prisma.user.upsert({
    where: { email: 'rep@securecreditlines.com' },
    update: {},
    create: {
      email: 'rep@securecreditlines.com',
      passwordHash: repPassword,
      firstName: 'John',
      lastName: 'Smith',
      role: 'REP',
    },
  });
  console.log(`  ✅ Rep user created: ${rep.email}`);

  // Create manager
  const managerPassword = await bcrypt.hash('manager123', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@securecreditlines.com' },
    update: {},
    create: {
      email: 'manager@securecreditlines.com',
      passwordHash: managerPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'MANAGER',
    },
  });
  console.log(`  ✅ Manager user created: ${manager.email}`);

  // Create pipeline stages
  const stages = [
    { name: 'New', order: 1, color: '#6366f1', isDefault: true },
    { name: 'Contacted', order: 2, color: '#3b82f6' },
    { name: 'Replied', order: 3, color: '#8b5cf6' },
    { name: 'Interested', order: 4, color: '#f59e0b' },
    { name: 'Docs Requested', order: 5, color: '#f97316' },
    { name: 'Submitted', order: 6, color: '#10b981' },
    { name: 'Funded', order: 7, color: '#22c55e' },
    { name: 'Not Interested', order: 8, color: '#ef4444' },
  ];

  for (const stage of stages) {
    await prisma.pipelineStage.upsert({
      where: { id: stage.name.toLowerCase().replace(/\s/g, '-') },
      update: stage,
      create: {
        id: stage.name.toLowerCase().replace(/\s/g, '-'),
        ...stage,
      },
    });
  }
  console.log(`  ✅ ${stages.length} pipeline stages created`);

  // Create tags
  const tags = [
    { name: 'Hot Lead', color: '#ef4444' },
    { name: 'Cold Lead', color: '#3b82f6' },
    { name: 'Purchased Lead', color: '#8b5cf6' },
    { name: 'Previously Funded', color: '#22c55e' },
    { name: 'Follow-Up Needed', color: '#f59e0b' },
    { name: 'VIP', color: '#f97316' },
    { name: 'Re-engagement', color: '#06b6d4' },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: tag,
      create: tag,
    });
  }
  console.log(`  ✅ ${tags.length} tags created`);

  // Create sample leads
  const sampleLeads = [
    { firstName: 'Michael', lastName: 'Brown', phone: '+15551234001', email: 'michael@example.com', company: 'Brown LLC', state: 'NY', source: 'purchased' },
    { firstName: 'Jessica', lastName: 'Davis', phone: '+15551234002', email: 'jessica@example.com', company: 'Davis Corp', state: 'CA', source: 'purchased' },
    { firstName: 'Robert', lastName: 'Wilson', phone: '+15551234003', email: 'robert@example.com', company: 'Wilson & Co', state: 'TX', source: 'referral' },
    { firstName: 'Emily', lastName: 'Taylor', phone: '+15551234004', email: 'emily@example.com', company: 'Taylor Industries', state: 'FL', source: 'purchased' },
    { firstName: 'David', lastName: 'Anderson', phone: '+15551234005', email: 'david@example.com', company: 'Anderson Group', state: 'IL', source: 'previously_funded' },
    { firstName: 'Jennifer', lastName: 'Martinez', phone: '+15551234006', email: 'jen@example.com', company: 'JM Services', state: 'NY', source: 'purchased' },
    { firstName: 'James', lastName: 'Thomas', phone: '+15551234007', email: 'james@example.com', company: 'Thomas LLC', state: 'PA', source: 'purchased' },
    { firstName: 'Amanda', lastName: 'Garcia', phone: '+15551234008', email: 'amanda@example.com', company: 'Garcia Inc', state: 'NJ', source: 'referral' },
  ];

  const defaultStage = await prisma.pipelineStage.findFirst({ where: { isDefault: true } });

  for (const leadData of sampleLeads) {
    const lead = await prisma.lead.upsert({
      where: { phone: leadData.phone },
      update: {},
      create: {
        ...leadData,
        assignedRepId: rep.id,
      },
    });

    // Create pipeline card
    if (defaultStage) {
      await prisma.pipelineCard.upsert({
        where: { leadId: lead.id },
        update: {},
        create: {
          leadId: lead.id,
          stageId: defaultStage.id,
        },
      });
    }
  }
  console.log(`  ✅ ${sampleLeads.length} sample leads created`);

  // Create a sample automation rule (follow-up sequence)
  const followUpRule = await prisma.automationRule.upsert({
    where: { id: 'default-follow-up' },
    update: {},
    create: {
      id: 'default-follow-up',
      name: 'Default Follow-Up Sequence',
      type: 'FOLLOW_UP_SEQUENCE',
      triggerConfig: { type: 'no_reply', delayDays: 3, maxAttempts: 3 },
      actionConfig: { type: 'send_template', stopOnReply: true },
      sendAfterHour: 9,
      sendBeforeHour: 20,
      sendOnWeekends: false,
    },
  });

  // Create follow-up templates
  const followUpTemplates = [
    {
      sequenceOrder: 1,
      delayDays: 3,
      messageTemplate: 'Hi {{firstName}}, this is SCL. We have business funding options that might be perfect for your needs. Would you like to learn more? Reply STOP to opt out.',
    },
    {
      sequenceOrder: 2,
      delayDays: 5,
      messageTemplate: 'Hi {{firstName}}, just following up from SCL. We help businesses like {{company}} access capital quickly. Interested in a quick chat? Reply STOP to opt out.',
    },
    {
      sequenceOrder: 3,
      delayDays: 7,
      messageTemplate: '{{firstName}}, last follow-up from SCL. If business funding isn\'t needed right now, no worries! But if it is, we\'d love to help. Reply STOP to opt out.',
    },
  ];

  for (const template of followUpTemplates) {
    await prisma.automationTemplate.upsert({
      where: {
        id: `follow-up-${template.sequenceOrder}`,
      },
      update: template,
      create: {
        id: `follow-up-${template.sequenceOrder}`,
        automationRuleId: followUpRule.id,
        ...template,
      },
    });
  }
  console.log('  ✅ Follow-up automation rule created with 3 templates');

  // Create number pool
  await prisma.numberPool.upsert({
    where: { id: 'primary-pool' },
    update: {},
    create: {
      id: 'primary-pool',
      name: 'Primary Sending Pool',
      description: 'Main pool for outbound campaigns',
      dailyLimit: 350,
    },
  });
  console.log('  ✅ Primary number pool created');

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('  Admin: admin@securecreditlines.com / admin123');
  console.log('  Manager: manager@securecreditlines.com / manager123');
  console.log('  Rep: rep@securecreditlines.com / rep123');
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
