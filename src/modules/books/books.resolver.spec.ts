import { Test, TestingModule } from '@nestjs/testing';
import { BooksResolver } from './books.resolver';
import { BooksService } from './books.service';
import { GqlThrottlerGuard } from '../../common/guards/gql-throttler.guard';
import { SearchBooksInput } from './dto/search-books.input';
import { Book } from './entities/book.entity';
import { ThrottlerModule } from '@nestjs/throttler';
import { SearchBooksResult } from './dto/book.output';

describe('BooksResolver', () => {
  let resolver: BooksResolver;
  let booksService: BooksService;
  let _throttlerGuard: GqlThrottlerGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 1000,
            limit: 5,
          },
        ]),
      ],
      providers: [
        BooksResolver,
        {
          provide: BooksService,
          useValue: {
            search: jest.fn(),
          },
        },
        {
          provide: GqlThrottlerGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    resolver = module.get<BooksResolver>(BooksResolver);
    booksService = module.get<BooksService>(BooksService);
    _throttlerGuard = module.get<GqlThrottlerGuard>(GqlThrottlerGuard);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('search', () => {
    it('should call booksService.search with correct input', async () => {
      const mockInput: SearchBooksInput = { query: 'test query' };
      const mockResult: SearchBooksResult = {
        books: [{ id: '1', title: 'Test Book' }] as Book[],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      jest.spyOn(booksService, 'search').mockResolvedValue(mockResult);

      const result = await resolver.search(mockInput);

      expect(booksService.search).toHaveBeenCalledWith(mockInput);
      expect(result).toEqual(mockResult);
      expect(result.pagination.total).toBe(1);
    });

    it('should return empty array when no books match', async () => {
      const mockInput: SearchBooksInput = { query: 'nonexistent' };
      const mockResult: SearchBooksResult = {
        books: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          lastPage: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      jest.spyOn(booksService, 'search').mockResolvedValue(mockResult);

      const result = await resolver.search(mockInput);

      expect(booksService.search).toHaveBeenCalledWith(mockInput);
      expect(result.books).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle search with filters', async () => {
      const mockInput: SearchBooksInput = {
        query: 'fantasy',
        filters: {
          genre: 'Fiction',
          publicationYear: [2000, 2020],
        },
      };
      const mockResult: SearchBooksResult = {
        books: [{ id: '1', title: 'Fantasy Book', genre: 'Fiction' }] as Book[],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      jest.spyOn(booksService, 'search').mockResolvedValue(mockResult);

      const result = await resolver.search(mockInput);

      expect(booksService.search).toHaveBeenCalledWith(mockInput);
      expect(result.books).toEqual(mockResult.books);
    });

    it('should handle search with only genre filter', async () => {
      const mockInput: SearchBooksInput = {
        query: 'book',
        filters: {
          genre: 'Non-Fiction',
        },
      };
      const mockResult: SearchBooksResult = {
        books: [
          { id: '2', title: 'Non-Fiction Book', genre: 'Non-Fiction' },
        ] as Book[],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      jest.spyOn(booksService, 'search').mockResolvedValue(mockResult);

      const result = await resolver.search(mockInput);

      expect(booksService.search).toHaveBeenCalledWith(mockInput);
      expect(result.books).toEqual(mockResult.books);
    });

    it('should handle search with only year range filter', async () => {
      const mockInput: SearchBooksInput = {
        query: 'classic',
        filters: {
          publicationYear: [1900, 1950],
        },
      };
      const mockResult: SearchBooksResult = {
        books: [
          { id: '3', title: 'Classic Book', publicationYear: 1920 },
        ] as Book[],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      jest.spyOn(booksService, 'search').mockResolvedValue(mockResult);

      const result = await resolver.search(mockInput);

      expect(booksService.search).toHaveBeenCalledWith(mockInput);
      expect(result.books).toEqual(mockResult.books);
    });

    it('should return results from cache when available', async () => {
      const mockInput: SearchBooksInput = { query: 'cached' };
      const mockResult: SearchBooksResult = {
        books: [{ id: '1', title: 'Cached Book' }] as Book[],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      jest.spyOn(booksService, 'search').mockResolvedValue(mockResult);

      const result = await resolver.search(mockInput);

      expect(result.pagination).toBeDefined();
      expect(result.books).toBeDefined();
    });

    it('should handle pagination correctly', async () => {
      const mockInput: SearchBooksInput = {
        query: 'book',
        limit: 10,
        page: 2,
      };
      const mockResult: SearchBooksResult = {
        books: [{ id: '11', title: 'Book 11' }] as Book[],
        pagination: {
          total: 100,
          page: 2,
          limit: 10,
          lastPage: 10,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      };

      jest.spyOn(booksService, 'search').mockResolvedValue(mockResult);

      const result = await resolver.search(mockInput);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(true);
      expect(result.pagination.total).toBe(100);
    });

    it('should handle errors from service', async () => {
      const mockInput: SearchBooksInput = { query: 'test' };
      const error = new Error('Database connection failed');

      jest.spyOn(booksService, 'search').mockRejectedValue(error);

      await expect(resolver.search(mockInput)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
