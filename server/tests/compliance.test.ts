/**
 * Compliance Service Tests
 * Тестирует STOP/HELP обработку, suppression list, quiet hours.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import prisma from '../src/config/database';
import { ComplianceService } from '../src/services/complianceService';

const TEST_PHONE = '+10005550001';
const TEST_PHONE_2 = '+10005550002';

describe('ComplianceService', () => {
  beforeAll(async () => {
    // Очищаем тестовые данные
    await prisma.suppressionEntry.deleteMany({
      where: { phone: { startsWith: '+1000555' } },
    });
    await prisma.lead.deleteMany({
      where: { phone: { startsWith: '+1000555' } },
    });
  });

  afterAll(async () => {
    await prisma.suppressionEntry.deleteMany({
      where: { phone: { startsWith: '+1000555' } },
    });
    await prisma.lead.deleteMany({
      where: { phone: { startsWith: '+1000555' } },
    });
  });

  describe('processInboundKeywords', () => {
    it('STOP — помечает как opt-out и возвращает ответ', async () => {
      // Создадим лида чтобы opt-out работал
      await prisma.lead.create({
        data: { firstName: 'Test', phone: TEST_PHONE, source: 'test' },
      });

      const result = await ComplianceService.processInboundKeywords(TEST_PHONE, 'STOP');

      expect(result.isKeyword).toBe(true);
      expect(result.response).toBeTruthy();

      // Проверяем suppression list
      const entry = await prisma.suppressionEntry.findUnique({
        where: { phone: TEST_PHONE },
      });
      expect(entry).not.toBeNull();
      expect(entry?.reason).toBe('STOP');
    });

    it('stop (строчные) — тоже работает', async () => {
      await prisma.lead.create({
        data: { firstName: 'Test2', phone: TEST_PHONE_2, source: 'test' },
      });

      const result = await ComplianceService.processInboundKeywords(TEST_PHONE_2, 'stop');

      expect(result.isKeyword).toBe(true);
    });

    it('HELP — возвращает справочный ответ', async () => {
      const result = await ComplianceService.processInboundKeywords('+10005550099', 'HELP');

      expect(result.isKeyword).toBe(true);
      expect(result.response).toContain('Secure Credit Lines');
    });

    it('обычное сообщение — не keyword', async () => {
      const result = await ComplianceService.processInboundKeywords('+10005550099', 'Hello, I am interested');

      expect(result.isKeyword).toBe(false);
    });
  });

  describe('canSendTo', () => {
    it('блокирует отправку на номер из suppression list', async () => {
      // TEST_PHONE уже в suppression list после теста STOP
      const result = await ComplianceService.canSendTo(TEST_PHONE);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeTruthy();
    });

    it('разрешает отправку на чистый номер', async () => {
      const result = await ComplianceService.canSendTo('+10005550077');

      expect(result.allowed).toBe(true);
    });
  });

  describe('handleOptOut / handleOptIn', () => {
    it('opt-in после opt-out — снимает suppression', async () => {
      // Сначала opt-in
      await ComplianceService.handleOptIn(TEST_PHONE);

      const entry = await prisma.suppressionEntry.findUnique({
        where: { phone: TEST_PHONE },
      });
      // Запись должна быть удалена
      expect(entry).toBeNull();

      // Теперь canSendTo должен разрешить
      const result = await ComplianceService.canSendTo(TEST_PHONE);
      expect(result.allowed).toBe(true);
    });
  });
});
