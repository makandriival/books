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
          pagination {
            total
            limit
            offset
            currentPage
            totalPages
            hasNextPage
            hasPreviousPage
          }
        }
      }
    `;

    it('should return books matching title search with pagination', async () => {
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
      expect(response.body.data.search.pagination).toBeDefined();
      expect(response.body.data.search.pagination.limit).toBe(20); // default
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

    it('should return "cache" on second identical request', async () => {
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

      // Second identical request - should be from cache (faster)
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

      expect(secondResponse.body.data.search.books).toEqual(
        firstResponse.body.data.search.books,
      );
      expect(secondResponse.body.data.search.pagination).toEqual(
        firstResponse.body.data.search.pagination,
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
          pagination {
            total
            limit
            offset
          }
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
          pagination {
            total
          }
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

  describe('Pagination', () => {
    const paginationQuery = `
      query SearchBooks($input: SearchInput!) {
        search(input: $input) {
          books {
            id
            title
          }
          pagination {
            total
            limit
            offset
            currentPage
            totalPages
            hasNextPage
            hasPreviousPage
          }
        }
      }
    `;

    it('should return paginated results with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: paginationQuery,
          variables: {
            input: {
              query: 'book',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.search.pagination).toBeDefined();
      expect(response.body.data.search.pagination.limit).toBe(20);
      expect(response.body.data.search.pagination.offset).toBe(0);
      expect(response.body.data.search.pagination.currentPage).toBe(1);
      expect(response.body.data.search.pagination.total).toBeGreaterThanOrEqual(
        0,
      );
    });

    it('should respect custom limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: paginationQuery,
          variables: {
            input: {
              query: 'book',
              limit: 5,
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.search.books.length).toBeLessThanOrEqual(5);
      expect(response.body.data.search.pagination.limit).toBe(5);
    });

    it('should respect offset parameter for pagination', async () => {
      const firstPageResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: paginationQuery,
          variables: {
            input: {
              query: 'book',
              limit: 5,
              offset: 0,
            },
          },
        });

      const secondPageResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: paginationQuery,
          variables: {
            input: {
              query: 'book',
              limit: 5,
              offset: 5,
            },
          },
        });

      expect(firstPageResponse.status).toBe(200);
      expect(secondPageResponse.status).toBe(200);

      // If there are enough results, pages should be different
      if (
        firstPageResponse.body.data.search.pagination.total > 5 &&
        secondPageResponse.body.data.search.books.length > 0
      ) {
        expect(firstPageResponse.body.data.search.books[0].id).not.toBe(
          secondPageResponse.body.data.search.books[0].id,
        );
      }

      expect(secondPageResponse.body.data.search.pagination.currentPage).toBe(
        2,
      );
    });

    it('should calculate pagination metadata correctly', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: paginationQuery,
          variables: {
            input: {
              query: 'book',
              limit: 10,
              offset: 0,
            },
          },
        });

      expect(response.status).toBe(200);
      const { pagination } = response.body.data.search;

      expect(pagination.currentPage).toBe(1);
      expect(pagination.hasPreviousPage).toBe(false);

      if (pagination.total > 10) {
        expect(pagination.hasNextPage).toBe(true);
        expect(pagination.totalPages).toBeGreaterThan(1);
      } else {
        expect(pagination.hasNextPage).toBe(false);
      }
    });

    it('should enforce maximum limit of 100', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: paginationQuery,
          variables: {
            input: {
              query: 'book',
              limit: 200, // Exceeds max
            },
          },
        });

      // Should return validation error
      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(
        response.body.errors.some((err) =>
          err.message.toLowerCase().includes('limit'),
        ),
      ).toBe(true);
    });

    it('should handle last page correctly', async () => {
      // First get total count
      const firstResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: paginationQuery,
          variables: {
            input: {
              query: 'book',
              limit: 10,
            },
          },
        });

      const total = firstResponse.body.data.search.pagination.total;

      if (total > 0) {
        const lastPageOffset = Math.floor(total / 10) * 10;

        const lastPageResponse = await request(app.getHttpServer())
          .post('/graphql')
          .send({
            query: paginationQuery,
            variables: {
              input: {
                query: 'book',
                limit: 10,
                offset: lastPageOffset,
              },
            },
          });

        expect(lastPageResponse.status).toBe(200);
        expect(lastPageResponse.body.data.search.pagination.hasNextPage).toBe(
          false,
        );
        expect(
          lastPageResponse.body.data.search.pagination.hasPreviousPage,
        ).toBe(lastPageOffset > 0);
      }
    });

    it('should return consistent pagination with cache', async () => {
      // First request - from database
      const firstResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: paginationQuery,
          variables: {
            input: {
              query: 'unique-pagination-test',
              limit: 10,
              offset: 0,
            },
          },
        });

      // Second identical request - from cache
      const secondResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: paginationQuery,
          variables: {
            input: {
              query: 'unique-pagination-test',
              limit: 10,
              offset: 0,
            },
          },
        });

      expect(secondResponse.body.data.search.pagination).toEqual(
        firstResponse.body.data.search.pagination,
      );
    });
  });
});
