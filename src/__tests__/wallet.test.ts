import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db/prisma';

const app = createApp();

describe('Researcher Wallet & Anti-Fraud Suite', () => {
  let almazToken: string;
  let almazId: string;
  let superAdminToken: string;

  beforeAll(async () => {
    // Login Dr. Almaz (Verified Researcher)
    const almazRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'almaz.bekele@aau.edu.et', password: 'Gootiraa2026Secure!' });
    almazToken = almazRes.body.data.token;
    almazId = almazRes.body.data.user.id;

    // Login Super Admin
    const superRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@gootiraa.org', password: 'Gootiraa2026Secure!' });
    superAdminToken = superRes.body.data.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should retrieve wallet balance and transaction ledger', async () => {
    const res = await request(app)
      .get('/api/v1/wallet/me')
      .set('Authorization', `Bearer ${almazToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.balanceCredits).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(res.body.data.transactions)).toBe(true);
  });

  it('should send a patronage tip to a researcher', async () => {
    const res = await request(app)
      .post('/api/v1/wallet/tip')
      .send({
        receiverUserId: almazId,
        amountCredits: 250,
        senderName: 'Addis Epidemiology Reader',
        message: 'Excellent study on malaria transmission dynamics!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transaction.type).toBe('TIP_RECEIVED');
  });

  it('should reject withdrawal below minimum threshold of 1,000 RC', async () => {
    const res = await request(app)
      .post('/api/v1/wallet/withdraw')
      .set('Authorization', `Bearer ${almazToken}`)
      .send({
        amountCredits: 400, // below 1000
        channel: 'TELEBIRR',
        accountNumber: '0911223344',
        accountName: 'Dr. Almaz Bekele',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should allow Super Admin to view pending payouts with fraud risk scoring', async () => {
    const res = await request(app)
      .get('/api/v1/admin/super/payouts')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].fraudRiskScore).toBeDefined();
  });

  it('should block non-super-admins from accessing financial payout approvals', async () => {
    const res = await request(app)
      .get('/api/v1/admin/super/payouts')
      .set('Authorization', `Bearer ${almazToken}`)
      .send();

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
