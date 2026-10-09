import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db/prisma';

const app = createApp();

describe('AI Research Assistant Grounding Suite', () => {
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

  it('should generate a 3-part structured grounded summary with citations', async () => {
    expect(samplePubId).toBeDefined();

    const res = await request(app)
      .post('/api/v1/ai/summarize')
      .send({ publicationId: samplePubId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.objective).toBeDefined();
    expect(res.body.data.methodology).toBeDefined();
    expect(res.body.data.findings).toBeDefined();
    expect(Array.isArray(res.body.data.groundedCitations)).toBe(true);
    expect(res.body.data.groundedCitations.length).toBeGreaterThan(0);
    expect(res.body.data.disclaimer).toContain('Gootiraa Grounded AI Assistant');
  });

  it('should answer question grounded in document passages', async () => {
    expect(samplePubId).toBeDefined();

    const res = await request(app)
      .post('/api/v1/ai/ask')
      .send({
        publicationId: samplePubId,
        question: 'What is the methodology and sample size?',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answer).toBeDefined();
    expect(res.body.data.groundedCitations).toBeDefined();
  });

  it('should explain scientific terminology in academic context', async () => {
    const res = await request(app)
      .post('/api/v1/ai/explain')
      .send({
        term: 'molecular surveillance',
        contextSnippet: 'nested PCR amplification and Pfk13 genotyping',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.term).toBe('molecular surveillance');
    expect(res.body.data.explanation).toBeDefined();
  });
});
