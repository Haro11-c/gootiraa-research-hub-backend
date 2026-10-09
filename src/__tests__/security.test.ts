import request from 'supertest';
import { createApp } from '../app';
import { validatePdfHeader } from '../middleware/upload';
import fs from 'fs';
import path from 'path';

const app = createApp();

describe('Security, RBAC & Protection Suite', () => {
  it('should block unauthenticated access to admin stats', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .send();

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return security headers via Helmet', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('should reject non-existent route with standardized 404', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should validate PDF magic numbers correctly', () => {
    const tempDir = path.resolve('./uploads');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const validPdfPath = path.join(tempDir, 'valid_test.pdf');
    const fakePdfPath = path.join(tempDir, 'fake_test.pdf');

    fs.writeFileSync(validPdfPath, Buffer.from('%PDF-1.7\nTest PDF content'));
    fs.writeFileSync(fakePdfPath, Buffer.from('NOT A PDF FILE TEXT'));

    expect(validatePdfHeader(validPdfPath)).toBe(true);
    expect(validatePdfHeader(fakePdfPath)).toBe(false);

    // Clean up
    fs.unlinkSync(validPdfPath);
    fs.unlinkSync(fakePdfPath);
  });
});
