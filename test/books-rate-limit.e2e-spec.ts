import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Books Search Rate Limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Search Query Rate Limiting', () => {
    const searchQuery = `
      query SearchBooks($input: SearchInput!) {
        search(input: $input) {
          id
          title
        }
      }
    `;

    const searchVariables = {
      input: {
        query: 'test',
      },
    };

    it('should enforce rate limit of 3 requests per 60 seconds', async () => {
      const responses = [];

      // Make 4 requests sequentially - first 3 should succeed, 4th should be rate limited
      for (let i = 0; i < 4; i++) {
        // Small delay to ensure requests are processed separately
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const response = await request(app.getHttpServer())
          .post('/graphql')
          .send({
            query: searchQuery,
            variables: searchVariables,
          });

        responses.push(response);
      }

      // Verify first 3 requests succeeded with data
      expect(responses[0].status).toBe(200);
      expect(responses[0].body.data).toBeDefined();
      expect(responses[0].body.errors).toBeUndefined();

      expect(responses[1].status).toBe(200);
      expect(responses[1].body.data).toBeDefined();
      expect(responses[1].body.errors).toBeUndefined();

      expect(responses[2].status).toBe(200);
      expect(responses[2].body.data).toBeDefined();
      expect(responses[2].body.errors).toBeUndefined();

      // Verify 4th request was rate limited - GraphQL returns errors array
      expect(responses[3].status).toBe(200);
      expect(responses[3].body.errors).toBeDefined();
      expect(responses[3].body.errors[0].message).toContain(
        'Too Many Requests',
      );
    });
  });
});
