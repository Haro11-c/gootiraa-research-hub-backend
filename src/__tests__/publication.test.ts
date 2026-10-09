import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db/prisma';

const app = createApp();

describe('Publication Discovery & Citations Suite', () => {
  let samplePubId: string;

  beforeAll(async () => {
    const pub = await prisma.publication.findFirst({
      where: { status: 'PUBLISHED' },
    });
    if (pub) {
      samplePubId = pub.id;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should search publications with Ethiopian regional filter', async () => {
    const res = await request(app)
      .get('/api/v1/publications?region=ETHIOPIA')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].region).toBe('ETHIOPIA');
  });

  it('should retrieve single publication details with verified review status', async () => {
    expect(samplePubId).toBeDefined();

    const res = await request(app)
      .get(`/api/v1/publications/${samplePubId}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(samplePubId);
    expect(['PEER_REVIEWED', 'PREPRINT', 'UNKNOWN']).toContain(res.body.data.reviewStatus);
    expect(Array.isArray(res.body.data.authors)).toBe(true);
  });

  it('should export citation in BibTeX format', async () => {
    expect(samplePubId).toBeDefined();

    const res = await request(app)
      .get(`/api/v1/publications/${samplePubId}/export/bibtex`)
      .send();

    expect(res.status).toBe(200);
    expect(res.text).toContain('@article{');
    expect(res.text).toContain('title = {');
  });

  it('should export citation in APA format', async () => {
    expect(samplePubId).toBeDefined();

    const res = await request(app)
      .get(`/api/v1/publications/${samplePubId}/export/apa`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.format).toBe('apa');
    expect(res.body.citation).toBeDefined();
  });
});
