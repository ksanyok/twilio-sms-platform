/**
 * Auth API Integration Tests
 * Тестирует аутентификацию, авторизацию и управление пользователями.
 * Работает с реальной БД (локальный PostgreSQL).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

const TEST_ADMIN = {
  email: 'test-admin@test.com',
  password: 'TestPass123!',
  firstName: 'Test',
  lastName: 'Admin',
};

let adminToken: string;
let adminUserId: string;

describe('Auth API', () => {
  beforeAll(async () => {
    // Создаём тестового админа
    const hash = await bcrypt.hash(TEST_ADMIN.password, 12);
    const user = await prisma.user.upsert({
      where: { email: TEST_ADMIN.email },
      create: {
        email: TEST_ADMIN.email,
        passwordHash: hash,
        firstName: TEST_ADMIN.firstName,
        lastName: TEST_ADMIN.lastName,
        role: 'ADMIN',
      },
      update: { passwordHash: hash, isActive: true },
    });
    adminUserId = user.id;
  });

  afterAll(async () => {
    // Удаляем зависимые записи перед удалением пользователей
    const testUsers = await prisma.user.findMany({
      where: { email: { startsWith: 'test-' } },
      select: { id: true },
    });
    const userIds = testUsers.map(u => u.id);
    if (userIds.length > 0) {
      await prisma.campaign.deleteMany({ where: { createdById: { in: userIds } } });
    }
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'test-' } },
    });
  });

  describe('POST /api/auth/login', () => {
    it('успешный логин с верными данными', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        email: TEST_ADMIN.email,
        firstName: TEST_ADMIN.firstName,
        lastName: TEST_ADMIN.lastName,
        role: 'ADMIN',
      });
      expect(res.body.user).not.toHaveProperty('passwordHash');
      adminToken = res.body.token;
    });

    it('отказ при неверном пароле', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_ADMIN.email, password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('отказ при несуществующем email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'any' });

      expect(res.status).toBe(401);
    });

    it('отказ без email или password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_ADMIN.email });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('возвращает текущего пользователя по токену', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        email: TEST_ADMIN.email,
        role: 'ADMIN',
      });
    });

    it('отказ без токена', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('отказ с невалидным токеном', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/register', () => {
    it('админ может создать нового пользователя', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test-rep@test.com',
          password: 'RepPass123!',
          firstName: 'Test',
          lastName: 'Rep',
          role: 'REP',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({
        email: 'test-rep@test.com',
        role: 'REP',
      });
    });

    it('отказ при дублировании email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test-rep@test.com',
          password: 'Pass123!',
          firstName: 'Another',
          lastName: 'Rep',
        });

      expect(res.status).toBe(409);
    });

    it('отказ без авторизации', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-new@test.com',
          password: 'Pass123!',
          firstName: 'New',
          lastName: 'User',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/users', () => {
    it('админ получает список пользователей', async () => {
      const res = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users).toBeInstanceOf(Array);
      expect(res.body.users.length).toBeGreaterThanOrEqual(1);
      // Проверяем что пароли не утекают
      res.body.users.forEach((u: any) => {
        expect(u).not.toHaveProperty('passwordHash');
      });
    });
  });

  describe('PUT /api/auth/users/:id', () => {
    it('админ может обновить пользователя', async () => {
      const res = await request(app)
        .put(`/api/auth/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.user.firstName).toBe('Updated');
    });
  });
});

describe('Health Check', () => {
  it('GET /api/health возвращает ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
