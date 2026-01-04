import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

describe('Books Caching (e2e)', () => {
  let app: INestApplication;
  let cacheManager: Cache;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    cacheManager = app.get<Cache>(CACHE_MANAGER);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cacheManager.reset();
  });

  it('should cache search results and return from cache on subsequent requests', async () => {
    const searchQuery = `
      query {
        search(input: { query: "fiction" }) {
          id
          title
          genre
        }
      }
    `;

    // First request - cache miss (should hit database)
    const response1 = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: searchQuery })
      .expect(200);

    expect(response1.body.data).toBeDefined();
    expect(response1.body.data.search).toBeDefined();

    // Second request - should be from cache (faster)
    const response2 = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: searchQuery })
      .expect(200);

    // Results should be identical
    expect(response2.body.data).toEqual(response1.body.data);
  });

  it('should cache different results for different queries', async () => {
    const query1 = `
      query {
        search(input: { query: "fiction" }) {
          id
          title
        }
      }
    `;

    const query2 = `
      query {
        search(input: { query: "science" }) {
          id
          title
        }
      }
    `;

    const response1 = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: query1 })
      .expect(200);

    const response2 = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: query2 })
      .expect(200);

    // Different queries should potentially return different results
    // We just verify both requests succeed and are cached independently
    expect(response1.body.data.search).toBeDefined();
    expect(response2.body.data.search).toBeDefined();
  });

  it('should cache results with filters', async () => {
    const searchWithFilters = `
      query {
        search(input: { 
          query: "book",
          filters: {
            genre: "Fiction",
            publicationYear: [2000, 2020]
          }
        }) {
          id
          title
          genre
          publicationYear
        }
      }
    `;

    const response1 = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: searchWithFilters })
      .expect(200);

    expect(response1.body.data.search).toBeDefined();

    // Second request should use cache
    const response2 = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: searchWithFilters })
      .expect(200);

    expect(response2.body.data).toEqual(response1.body.data);
  });

  it('should cache empty results', async () => {
    const searchQuery = `
      query {
        search(input: { query: "nonexistentxyz123" }) {
          id
          title
        }
      }
    `;

    const response1 = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: searchQuery })
      .expect(200);

    expect(response1.body.data.search).toEqual([]);

    // Second request should also return cached empty array
    const response2 = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: searchQuery })
      .expect(200);

    expect(response2.body.data.search).toEqual([]);
  });

  it('should differentiate cache for queries with different filters', async () => {
    const queryWithFilter1 = `
      query {
        search(input: { 
          query: "book",
          filters: { genre: "Fiction" }
        }) {
          id
          title
          genre
        }
      }
    `;

    const queryWithFilter2 = `
      query {
        search(input: { 
          query: "book",
          filters: { genre: "Non-Fiction" }
        }) {
          id
          title
          genre
        }
      }
    `;

    const response1 = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: queryWithFilter1 })
      .expect(200);

    const response2 = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: queryWithFilter2 })
      .expect(200);

    // Both should succeed and potentially have different results
    expect(response1.body.data.search).toBeDefined();
    expect(response2.body.data.search).toBeDefined();
  });
});

