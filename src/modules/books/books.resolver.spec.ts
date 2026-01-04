import { Test, TestingModule } from '@nestjs/testing';
import { BooksResolver } from './books.resolver';
import { BooksService } from './books.service';
import { GqlThrottlerGuard } from '../../common/guards/gql-throttler.guard';
import { SearchInput } from '../../common/shared/search.input';
import { Book } from './entities/book.entity';
import { ThrottlerModule } from '@nestjs/throttler';
import { SearchResultWithSource } from '../../common/shared/search-result.object';

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
      const mockInput: SearchInput = { query: 'test query' };
      const mockResult: SearchResultWithSource = {
        books: [{ id: '1', title: 'Test Book' }] as Book[],
        source: 'database',
        cacheKey: 'search:test',
      };

      jest.spyOn(booksService, 'search').mockResolvedValue(mockResult);

      const result = await resolver.search(mockInput);

      expect(booksService.search).toHaveBeenCalledWith(mockInput);
      expect(result).toEqual(mockResult);
      expect(result.source).toBe('database');
    });

    it('should return empty array when no books match', async () => {
      const mockInput: SearchInput = { query: 'nonexistent' };
      const mockResult: SearchResultWithSource = {
        books: [],
        source: 'database',
        cacheKey: 'search:nonexistent',
      };

      jest.spyOn(booksService, 'search').mockResolvedValue(mockResult);

      const result = await resolver.search(mockInput);

      expect(booksService.search).toHaveBeenCalledWith(mockInput);
      expect(result.books).toEqual([]);
      expect(result.source).toBe('database');
    });

    it('should handle search with filters', async () => {
      const mockInput: SearchInput = {
        query: 'fantasy',
        filters: {
          genre: 'Fiction',
          publicationYear: [2000, 2020],
        },
      };
      const mockResult: SearchResultWithSource = {
        books: [{ id: '1', title: 'Fantasy Book', genre: 'Fiction' }] as Book[],
        source: 'database',
        cacheKey: 'search:fantasy',
      };

      jest.spyOn(booksService, 'search').mockResolvedValue(mockResult);

      const result = await resolver.search(mockInput);

      expect(booksService.search).toHaveBeenCalledWith(mockInput);
      expect(result.books).toEqual(mockResult.books);
      expect(result.source).toBe('database');
    });

    it('should handle search with only genre filter', async () => {
      const mockInput: SearchInput = {
        query: 'book',
        filters: {
          genre: 'Non-Fiction',
        },
      };
      const mockResult: SearchResultWithSource = {
        books: [
          { id: '2', title: 'Non-Fiction Book', genre: 'Non-Fiction' },
        ] as Book[],
        source: 'database',
        cacheKey: 'search:book',
      };

      jest.spyOn(booksService, 'search').mockResolvedValue(mockResult);

      const result = await resolver.search(mockInput);

      expect(booksService.search).toHaveBeenCalledWith(mockInput);
      expect(result.books).toEqual(mockResult.books);
    });

    it('should handle search with only year range filter', async () => {
      const mockInput: SearchInput = {
        query: 'classic',
        filters: {
          publicationYear: [1900, 1950],
        },
      };
      const mockResult: SearchResultWithSource = {
        books: [
          { id: '3', title: 'Classic Book', publicationYear: 1920 },
        ] as Book[],
        source: 'database',
        cacheKey: 'search:classic',
      };

      jest.spyOn(booksService, 'search').mockResolvedValue(mockResult);

      const result = await resolver.search(mockInput);

      expect(booksService.search).toHaveBeenCalledWith(mockInput);
      expect(result.books).toEqual(mockResult.books);
    });

    it('should indicate when results come from cache', async () => {
      const mockInput: SearchInput = { query: 'cached' };
      const mockResult: SearchResultWithSource = {
        books: [{ id: '1', title: 'Cached Book' }] as Book[],
        source: 'cache',
        cacheKey: 'search:cached',
      };

      jest.spyOn(booksService, 'search').mockResolvedValue(mockResult);

      const result = await resolver.search(mockInput);

      expect(result.source).toBe('cache');
      expect(result.cacheKey).toBeDefined();
    });

    it('should handle errors from service', async () => {
      const mockInput: SearchInput = { query: 'test' };
      const error = new Error('Database connection failed');

      jest.spyOn(booksService, 'search').mockRejectedValue(error);

      await expect(resolver.search(mockInput)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
