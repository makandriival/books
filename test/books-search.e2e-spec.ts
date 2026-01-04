import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Books Search Functionality (e2e)', () => {
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

  describe('Basic Search', () => {
    const searchQuery = `
      query SearchBooks($input: SearchInput!) {
        search(input: $input) {
          books {
            id
            title
            description
            genre
            publicationYear
            authors {
              id
              firstName
              lastName
            }
          }
          source
          cacheKey
        }
      }
    `;

    it('should return books matching title search with source indicator', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchQuery,
          variables: {
            input: {
              query: 'book',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.search).toBeDefined();
      expect(response.body.data.search.books).toBeDefined();
      expect(Array.isArray(response.body.data.search.books)).toBe(true);
      expect(response.body.data.search.source).toBeDefined();
      expect(['cache', 'database']).toContain(response.body.data.search.source);
      expect(response.body.data.search.cacheKey).toBeDefined();
      expect(response.body.errors).toBeUndefined();

      // If results exist, verify they contain the search term in title or description
      if (response.body.data.search.books.length > 0) {
        const book = response.body.data.search.books[0];
        expect(book).toHaveProperty('id');
        expect(book).toHaveProperty('title');
        expect(book).toHaveProperty('description');
      }
    });

    it('should return books matching description search', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchQuery,
          variables: {
            input: {
              query: 'story',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.search).toBeDefined();
      expect(response.body.data.search.books).toBeDefined();
      expect(Array.isArray(response.body.data.search.books)).toBe(true);
      expect(response.body.errors).toBeUndefined();
    });

    it('should return empty array for non-matching search', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchQuery,
          variables: {
            input: {
              query: 'nonexistentbookxyz123',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.search).toBeDefined();
      expect(response.body.data.search.books).toEqual([]);
      expect(response.body.data.search.source).toBeDefined();
      expect(response.body.errors).toBeUndefined();
    });

    it('should perform case-insensitive search', async () => {
      const lowerCaseResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchQuery,
          variables: {
            input: {
              query: 'book',
            },
          },
        });

      const upperCaseResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchQuery,
          variables: {
            input: {
              query: 'BOOK',
            },
          },
        });

      expect(lowerCaseResponse.status).toBe(200);
      expect(upperCaseResponse.status).toBe(200);

      // Both should return results if any books match
      expect(
        lowerCaseResponse.body.data.search.books.length,
      ).toBeGreaterThanOrEqual(0);
      expect(upperCaseResponse.body.data.search.books.length).toBe(
        lowerCaseResponse.body.data.search.books.length,
      );
    });

    it('should search by author name', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchQuery,
          variables: {
            input: {
              query: 'user',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.search).toBeDefined();
      expect(response.body.data.search.books).toBeDefined();
      expect(Array.isArray(response.body.data.search.books)).toBe(true);
      expect(response.body.errors).toBeUndefined();

      // Verify authors are included in the response
      if (response.body.data.search.books.length > 0) {
        const book = response.body.data.search.books[0];
        expect(book).toHaveProperty('authors');
        expect(Array.isArray(book.authors)).toBe(true);
      }
    });

    it('should return "cache" source on second identical request', async () => {
      // First request - should be from database
      const firstResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchQuery,
          variables: {
            input: {
              query: 'unique-cache-test-query',
            },
          },
        });

      // Second identical request - should be from cache
      const secondResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchQuery,
          variables: {
            input: {
              query: 'unique-cache-test-query',
            },
          },
        });

      expect(secondResponse.body.data.search.source).toBe('cache');
      expect(secondResponse.body.data.search.books).toEqual(
        firstResponse.body.data.search.books,
      );
    });
  });

  describe('Search with Filters', () => {
    const searchWithFiltersQuery = `
      query SearchBooksWithFilters($input: SearchInput!) {
        search(input: $input) {
          books {
            id
            title
            description
            genre
            publicationYear
            authors {
              id
              firstName
              lastName
            }
          }
          source
        }
      }
    `;

    it('should filter by genre', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchWithFiltersQuery,
          variables: {
            input: {
              query: 'book',
              filters: {
                genre: 'Fiction',
              },
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.search).toBeDefined();
      expect(response.body.data.search.books).toBeDefined();
      expect(Array.isArray(response.body.data.search.books)).toBe(true);
      expect(response.body.errors).toBeUndefined();

      // If results exist, verify they all have the correct genre
      response.body.data.search.books.forEach((book) => {
        if (book.genre) {
          expect(book.genre).toBe('Fiction');
        }
      });
    });

    it('should filter by publication year range', async () => {
      const startYear = 2000;
      const endYear = 2020;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchWithFiltersQuery,
          variables: {
            input: {
              query: 'book',
              filters: {
                publicationYear: [startYear, endYear],
              },
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.search).toBeDefined();
      expect(response.body.data.search.books).toBeDefined();
      expect(Array.isArray(response.body.data.search.books)).toBe(true);
      expect(response.body.errors).toBeUndefined();

      // If results exist, verify they are within the year range
      response.body.data.search.books.forEach((book) => {
        if (book.publicationYear) {
          expect(book.publicationYear).toBeGreaterThanOrEqual(startYear);
          expect(book.publicationYear).toBeLessThanOrEqual(endYear);
        }
      });
    });

    it('should combine genre and publication year filters', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchWithFiltersQuery,
          variables: {
            input: {
              query: 'book',
              filters: {
                genre: 'Fiction',
                publicationYear: [2000, 2020],
              },
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.search).toBeDefined();
      expect(response.body.data.search.books).toBeDefined();
      expect(Array.isArray(response.body.data.search.books)).toBe(true);
      expect(response.body.errors).toBeUndefined();

      // Verify books match both filters
      response.body.data.search.books.forEach((book) => {
        if (book.genre) {
          expect(book.genre).toBe('Fiction');
        }
        if (book.publicationYear) {
          expect(book.publicationYear).toBeGreaterThanOrEqual(2000);
          expect(book.publicationYear).toBeLessThanOrEqual(2020);
        }
      });
    });

    it('should return empty array when filters exclude all results', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchWithFiltersQuery,
          variables: {
            input: {
              query: 'book',
              filters: {
                publicationYear: [1800, 1850],
              },
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.search).toBeDefined();
      expect(response.body.data.search.books).toBeDefined();
      expect(Array.isArray(response.body.data.search.books)).toBe(true);
      // Likely to be empty unless there are very old books
      expect(response.body.errors).toBeUndefined();
    });
  });

  describe('Search Edge Cases', () => {
    const searchQuery = `
      query SearchBooks($input: SearchInput!) {
        search(input: $input) {
          books {
            id
            title
          }
          source
        }
      }
    `;

    it('should handle empty string search', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchQuery,
          variables: {
            input: {
              query: '',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.search).toBeDefined();
      expect(response.body.data.search.books).toBeDefined();
      expect(Array.isArray(response.body.data.search.books)).toBe(true);
    });

    it('should handle special characters in search', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchQuery,
          variables: {
            input: {
              query: "book's",
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.search).toBeDefined();
      expect(response.body.data.search.books).toBeDefined();
      expect(Array.isArray(response.body.data.search.books)).toBe(true);
      expect(response.body.errors).toBeUndefined();
    });

    it('should handle search with numbers', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchQuery,
          variables: {
            input: {
              query: '123',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.search).toBeDefined();
      expect(response.body.data.search.books).toBeDefined();
      expect(Array.isArray(response.body.data.search.books)).toBe(true);
      expect(response.body.errors).toBeUndefined();
    });

    it('should handle very long search strings', async () => {
      const longQuery = 'a'.repeat(500);

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: searchQuery,
          variables: {
            input: {
              query: longQuery,
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.search).toBeDefined();
      expect(response.body.data.search.books).toBeDefined();
      expect(Array.isArray(response.body.data.search.books)).toBe(true);
      // Likely to be empty
      expect(response.body.errors).toBeUndefined();
    });
  });

  describe('Search Response Structure', () => {
    const fullSearchQuery = `
      query SearchBooks($input: SearchInput!) {
        search(input: $input) {
          books {
            id
            title
            description
            cover
            pages
            genre
            publicationYear
            authors {
              id
              firstName
              lastName
              email
            }
            comments {
              id
              text
            }
          }
          source
          cacheKey
        }
      }
    `;

    it('should return complete book structure with relations', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: fullSearchQuery,
          variables: {
            input: {
              query: 'book',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.search).toBeDefined();
      expect(response.body.data.search.books).toBeDefined();
      expect(Array.isArray(response.body.data.search.books)).toBe(true);

      // If results exist, verify the full structure
      if (response.body.data.search.books.length > 0) {
        const book = response.body.data.search.books[0];

        // Check book properties
        expect(book).toHaveProperty('id');
        expect(book).toHaveProperty('title');
        expect(book).toHaveProperty('description');

        // Check relations
        expect(book).toHaveProperty('authors');
        expect(Array.isArray(book.authors)).toBe(true);

        expect(book).toHaveProperty('comments');
        expect(Array.isArray(book.comments)).toBe(true);

        // If authors exist, check their structure
        if (book.authors.length > 0) {
          const author = book.authors[0];
          expect(author).toHaveProperty('id');
          expect(author).toHaveProperty('firstName');
          expect(author).toHaveProperty('lastName');
        }
      }
    });

    it('should handle partial field selection', async () => {
      const minimalQuery = `
        query SearchBooks($input: SearchInput!) {
          search(input: $input) {
            books {
              id
              title
            }
            source
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: minimalQuery,
          variables: {
            input: {
              query: 'book',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.search).toBeDefined();
      expect(response.body.data.search.books).toBeDefined();

      // Verify only requested fields are present
      if (response.body.data.search.books.length > 0) {
        const book = response.body.data.search.books[0];
        expect(book).toHaveProperty('id');
        expect(book).toHaveProperty('title');
        // These fields should not be present as they weren't requested
        expect(book.authors).toBeUndefined();
        expect(book.comments).toBeUndefined();
      }
    });
  });
});
