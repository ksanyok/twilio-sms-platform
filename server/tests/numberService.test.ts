/**
 * Number Service Tests
 * Тестирует ротацию номеров, ramp-up, cooling, daily reset.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/config/database';
import { NumberService } from '../src/services/numberService';

const TEST_NUMBER_SID = 'PN_TEST_001';
const TEST_NUMBER_SID_2 = 'PN_TEST_002';
const TEST_PHONE = '+10009990001';
const TEST_PHONE_2 = '+10009990002';

describe('NumberService', () => {
  beforeAll(async () => {
    // Очищаем тестовые данные
    await prisma.numberAssignment.deleteMany({
      where: { phoneNumber: { twilioSid: { startsWith: 'PN_TEST_' } } },
    });
    await prisma.phoneNumber.deleteMany({
      where: { twilioSid: { startsWith: 'PN_TEST_' } },
    });

    // Создаём тестовые номера
    await prisma.phoneNumber.create({
      data: {
        twilioSid: TEST_NUMBER_SID,
        phoneNumber: TEST_PHONE,
        friendlyName: 'Test Number 1',
        status: 'ACTIVE',
        dailyLimit: 350,
        dailySentCount: 0,
        deliveryRate: 95.0,
      },
    });

    await prisma.phoneNumber.create({
      data: {
        twilioSid: TEST_NUMBER_SID_2,
        phoneNumber: TEST_PHONE_2,
        friendlyName: 'Test Number 2',
        status: 'ACTIVE',
        dailyLimit: 350,
        dailySentCount: 300,
        deliveryRate: 85.0,
      },
    });
  });

  afterAll(async () => {
    await prisma.numberAssignment.deleteMany({
      where: { phoneNumber: { twilioSid: { startsWith: 'PN_TEST_' } } },
    });
    await prisma.phoneNumber.deleteMany({
      where: { twilioSid: { startsWith: 'PN_TEST_' } },
    });
  });

  describe('getBestAvailableNumber', () => {
    it('возвращает подходящий номер для отправки', async () => {
      const number = await NumberService.getBestAvailableNumber();

      // Должен вернуть один из наших ACTIVE номеров с оставшимся лимитом
      expect(number).toBeTruthy();
      expect(number?.status).toBe('ACTIVE');
    });
  });

  describe('recordSend', () => {
    it('увеличивает dailySentCount и totalSent', async () => {
      const numberBefore = await prisma.phoneNumber.findUnique({
        where: { twilioSid: TEST_NUMBER_SID },
      });
      const countBefore = numberBefore!.dailySentCount;

      await NumberService.recordSend(numberBefore!.id, true);

      const numberAfter = await prisma.phoneNumber.findUnique({
        where: { twilioSid: TEST_NUMBER_SID },
      });
      expect(numberAfter!.dailySentCount).toBe(countBefore + 1);
      expect(numberAfter!.totalSent).toBeGreaterThan(numberBefore!.totalSent);
      expect(numberAfter!.totalDelivered).toBeGreaterThan(numberBefore!.totalDelivered);
    });

    it('увеличивает totalFailed при ошибке', async () => {
      const number = await prisma.phoneNumber.findUnique({
        where: { twilioSid: TEST_NUMBER_SID },
      });

      await NumberService.recordSend(number!.id, false);

      const updated = await prisma.phoneNumber.findUnique({
        where: { twilioSid: TEST_NUMBER_SID },
      });
      expect(updated!.totalFailed).toBeGreaterThan(number!.totalFailed);
    });
  });

  describe('coolNumber', () => {
    it('переводит номер в статус COOLING', async () => {
      const number = await prisma.phoneNumber.findUnique({
        where: { twilioSid: TEST_NUMBER_SID_2 },
      });

      await NumberService.coolNumber(number!.id, 'Test cooling', 24);

      const cooled = await prisma.phoneNumber.findUnique({
        where: { twilioSid: TEST_NUMBER_SID_2 },
      });
      expect(cooled!.status).toBe('COOLING');
      expect(cooled!.cooldownReason).toBe('Test cooling');
      expect(cooled!.coolingUntil).toBeTruthy();
    });
  });

  describe('resetDailyCounters', () => {
    it('сбрасывает dailySentCount для всех номеров', async () => {
      await NumberService.resetDailyCounters();

      const numbers = await prisma.phoneNumber.findMany({
        where: { twilioSid: { startsWith: 'PN_TEST_' } },
      });
      numbers.forEach((n) => {
        expect(n.dailySentCount).toBe(0);
      });
    });
  });
});
