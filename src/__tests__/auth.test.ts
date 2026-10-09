import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db/prisma';

const app = createApp();

describe('Authentication & Authorization Suite', () => {
  const testUser = {
    email: `test_scholar_${Date.now()}@aau.edu.et`,
    password: 'SecureScholarPass123!',
    fullName: 'Test Scholar Addis',
    role: 'RESEARCHER',
    academicTitle: 'Postdoctoral Fellow',
  };

  afterAll(async () => {
    // Cleanup created test user
    await prisma.user.deleteMany({
      where: { email: { contains: 'test_scholar_' } },
    });
    await prisma.$disconnect();
  });

  it('should successfully register a new researcher', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.data.user.role).toBe('RESEARCHER');
    expect(res.body.data.token).toBeDefined();
  });

  it('should prevent registration with a duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('should authenticate user and return valid token on login', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject login with invalid password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'IncorrectPassword999!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
