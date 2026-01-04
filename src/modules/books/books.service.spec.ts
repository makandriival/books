import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BooksService } from './books.service';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { SearchInput } from '../../common/shared/search.input';

describe('BooksService', () => {
  let service: BooksService;
  let repository: Repository<Book>;
  let queryBuilder: SelectQueryBuilder<Book>;
  let cacheManager: any;

  beforeEach(async () => {
    // Mock QueryBuilder
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    } as any;

    // Mock Repository
    const mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    // Mock Cache Manager
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: getRepositoryToken(Book),
          useValue: mockRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
    repository = module.get<Repository<Book>>(getRepositoryToken(Book));
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    beforeEach(() => {
      // Reset cache mock to return null (cache miss) by default
      cacheManager.get.mockResolvedValue(null);
      cacheManager.set.mockResolvedValue(undefined);
    });

    it('should search books by query term', async () => {
      const mockInput: SearchInput = { query: 'fantasy' };
      const mockBooks = [
        {
          id: '1',
          title: 'Fantasy Book',
          description: 'A fantasy adventure',
          genre: 'Fiction',
        },
      ] as unknown as Book[];

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue(mockBooks);

      const result = await service.search(mockInput);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('book');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'book.authors',
        'author',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'book.comments',
        'comment',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        expect.stringContaining('book.title ILIKE :query'),
        { query: '%fantasy%' },
      );
      expect(result.books).toEqual(mockBooks);
      expect(result.source).toBe('database');
      expect(result.cacheKey).toBeDefined();
    });

    it('should search with case insensitivity', async () => {
      const mockInput: SearchInput = { query: 'FANTASY' };
      const mockBooks = [] as unknown as Book[];

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue(mockBooks);

      await service.search(mockInput);

      expect(queryBuilder.where).toHaveBeenCalledWith(expect.any(String), {
        query: '%FANTASY%',
      });
    });

    it('should apply genre filter', async () => {
      const mockInput: SearchInput = {
        query: 'book',
        filters: {
          genre: 'Fiction',
        },
      };
      const mockBooks = [
        { id: '1', title: 'Fiction Book', genre: 'Fiction' },
      ] as unknown as Book[];

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue(mockBooks);

      const result = await service.search(mockInput);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'book.genre = :genre',
        { genre: 'Fiction' },
      );
      expect(result.books).toEqual(mockBooks);
      expect(result.source).toBe('database');
    });

    it('should apply publication year range filter', async () => {
      const mockInput: SearchInput = {
        query: 'classic',
        filters: {
          publicationYear: [2000, 2020],
        },
      };
      const mockBooks = [
        { id: '1', title: 'Modern Classic', publicationYear: 2010 },
      ] as unknown as Book[];

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue(mockBooks);

      const result = await service.search(mockInput);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'book.publicationYear BETWEEN :startYear AND :endYear',
        { startYear: 2000, endYear: 2020 },
      );
      expect(result.books).toEqual(mockBooks);
      expect(result.source).toBe('database');
    });

    it('should apply both genre and year filters together', async () => {
      const mockInput: SearchInput = {
        query: 'book',
        filters: {
          genre: 'Science Fiction',
          publicationYear: [1980, 2000],
        },
      };
      const mockBooks = [
        {
          id: '1',
          title: 'Sci-Fi Book',
          genre: 'Science Fiction',
          publicationYear: 1990,
        },
      ] as unknown as Book[];

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue(mockBooks);

      const result = await service.search(mockInput);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'book.genre = :genre',
        { genre: 'Science Fiction' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'book.publicationYear BETWEEN :startYear AND :endYear',
        { startYear: 1980, endYear: 2000 },
      );
      expect(result.books).toEqual(mockBooks);
      expect(result.source).toBe('database');
    });

    it('should not apply genre filter if not provided', async () => {
      const mockInput: SearchInput = {
        query: 'book',
        filters: {
          publicationYear: [2000, 2020],
        },
      };
      const mockBooks = [] as unknown as Book[];

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue(mockBooks);

      await service.search(mockInput);

      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        'book.genre = :genre',
        expect.any(Object),
      );
    });

    it('should not apply year filter if not provided', async () => {
      const mockInput: SearchInput = {
        query: 'book',
        filters: {
          genre: 'Fiction',
        },
      };
      const mockBooks = [] as unknown as Book[];

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue(mockBooks);

      await service.search(mockInput);

      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        'book.publicationYear BETWEEN :startYear AND :endYear',
        expect.any(Object),
      );
    });

    it('should not apply year filter if array length is not 2', async () => {
      const mockInput: SearchInput = {
        query: 'book',
        filters: {
          publicationYear: [2000] as any, // Invalid: only one year
        },
      };
      const mockBooks = [] as unknown as Book[];

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue(mockBooks);

      await service.search(mockInput);

      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        'book.publicationYear BETWEEN :startYear AND :endYear',
        expect.any(Object),
      );
    });

    it('should return empty array when no books match', async () => {
      const mockInput: SearchInput = { query: 'nonexistent' };

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue([]);

      const result = await service.search(mockInput);

      expect(result.books).toEqual([]);
      expect(result.source).toBe('database');
    });

    it('should include authors in query', async () => {
      const mockInput: SearchInput = { query: 'author' };
      const mockBooks = [
        {
          id: '1',
          title: 'Book',
          authors: [{ id: '1', firstName: 'John', lastName: 'Doe' }],
        },
      ] as unknown as Book[];

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue(mockBooks);

      await service.search(mockInput);

      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'book.authors',
        'author',
      );
    });

    it('should include comments in query', async () => {
      const mockInput: SearchInput = { query: 'comment' };
      const mockBooks = [
        {
          id: '1',
          title: 'Book',
          comments: [{ id: '1', text: 'Great book!' }],
        },
      ] as unknown as Book[];

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue(mockBooks);

      await service.search(mockInput);

      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'book.comments',
        'comment',
      );
    });

    it('should search across multiple fields (title, description, genre, author)', async () => {
      const mockInput: SearchInput = { query: 'search term' };

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue([]);

      await service.search(mockInput);

      // Verify the where clause includes all searchable fields
      expect(queryBuilder.where).toHaveBeenCalledWith(
        expect.stringContaining('book.title ILIKE :query'),
        { query: '%search term%' },
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        expect.stringContaining('book.description ILIKE :query'),
        { query: '%search term%' },
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        expect.stringContaining('book.genre ILIKE :query'),
        { query: '%search term%' },
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        expect.stringContaining('author.firstName ILIKE :query'),
        { query: '%search term%' },
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        expect.stringContaining('author.lastName ILIKE :query'),
        { query: '%search term%' },
      );
    });

    it('should handle empty query string', async () => {
      const mockInput: SearchInput = { query: '' };
      const mockBooks = [] as unknown as Book[];

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue(mockBooks);

      const result = await service.search(mockInput);

      expect(queryBuilder.where).toHaveBeenCalledWith(expect.any(String), {
        query: '%%',
      });
      expect(result.books).toEqual([]);
      expect(result.source).toBe('database');
    });

    it('should handle special characters in query', async () => {
      const mockInput: SearchInput = { query: "book's title" };
      const mockBooks = [] as unknown as Book[];

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue(mockBooks);

      await service.search(mockInput);

      expect(queryBuilder.where).toHaveBeenCalledWith(expect.any(String), {
        query: "%book's title%",
      });
    });

    it('should propagate database errors', async () => {
      const mockInput: SearchInput = { query: 'test' };
      const error = new Error('Database connection failed');

      jest.spyOn(queryBuilder, 'getMany').mockRejectedValue(error);

      await expect(service.search(mockInput)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should return cached results on cache hit', async () => {
      const mockInput: SearchInput = { query: 'fantasy' };
      const cachedBooks = [
        {
          id: '1',
          title: 'Fantasy Book',
          description: 'Cached result',
          genre: 'Fiction',
        },
      ] as unknown as Book[];

      cacheManager.get.mockResolvedValue(cachedBooks);

      const result = await service.search(mockInput);

      expect(cacheManager.get).toHaveBeenCalled();
      expect(result.books).toEqual(cachedBooks);
      expect(result.source).toBe('cache');
      expect(result.cacheKey).toBeDefined();
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache on cache miss', async () => {
      const mockInput: SearchInput = { query: 'fantasy' };
      const mockBooks = [
        {
          id: '1',
          title: 'Fantasy Book',
          description: 'Fresh from DB',
          genre: 'Fiction',
        },
      ] as unknown as Book[];

      cacheManager.get.mockResolvedValue(null);
      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue(mockBooks);

      const result = await service.search(mockInput);

      expect(cacheManager.get).toHaveBeenCalled();
      expect(repository.createQueryBuilder).toHaveBeenCalled();
      expect(queryBuilder.getMany).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        mockBooks,
      );
      expect(result.books).toEqual(mockBooks);
      expect(result.source).toBe('database');
      expect(result.cacheKey).toBeDefined();
    });

    it('should generate different cache keys for different queries', async () => {
      const mockInput1: SearchInput = { query: 'fantasy' };
      const mockInput2: SearchInput = { query: 'scifi' };

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue([]);

      await service.search(mockInput1);
      const firstCacheKey = cacheManager.set.mock.calls[0][0];

      await service.search(mockInput2);
      const secondCacheKey = cacheManager.set.mock.calls[1][0];

      expect(firstCacheKey).not.toEqual(secondCacheKey);
    });

    it('should generate different cache keys for different filters', async () => {
      const mockInput1: SearchInput = {
        query: 'book',
        filters: { genre: 'Fiction' },
      };
      const mockInput2: SearchInput = {
        query: 'book',
        filters: { genre: 'Non-Fiction' },
      };

      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue([]);

      await service.search(mockInput1);
      const firstCacheKey = cacheManager.set.mock.calls[0][0];

      await service.search(mockInput2);
      const secondCacheKey = cacheManager.set.mock.calls[1][0];

      expect(firstCacheKey).not.toEqual(secondCacheKey);
    });

    it('should deduplicate concurrent identical search requests', async () => {
      const mockInput: SearchInput = { query: 'fantasy' };
      const mockBooks = [
        {
          id: '1',
          title: 'Fantasy Book',
          description: 'A fantasy adventure',
          genre: 'Fiction',
        },
      ] as unknown as Book[];

      cacheManager.get.mockResolvedValue(null);

      // Mock getMany to simulate a slow database query
      let resolveQuery: ((value: Book[]) => void) | undefined;
      const queryPromise = new Promise<Book[]>((resolve) => {
        resolveQuery = resolve;
      });
      jest.spyOn(queryBuilder, 'getMany').mockReturnValue(queryPromise as any);

      // Make 3 concurrent identical requests
      const promise1 = service.search(mockInput);
      const promise2 = service.search(mockInput);
      const promise3 = service.search(mockInput);

      // Resolve the database query
      if (resolveQuery) {
        resolveQuery(mockBooks);
      }

      const [result1, result2, result3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      // All should return the same data
      expect(result1.books).toEqual(mockBooks);
      expect(result2.books).toEqual(mockBooks);
      expect(result3.books).toEqual(mockBooks);

      // Database should only be queried once
      expect(queryBuilder.getMany).toHaveBeenCalledTimes(1);

      // Cache should only be set once
      expect(cacheManager.set).toHaveBeenCalledTimes(1);
    });

    it('should not deduplicate different search requests', async () => {
      const mockInput1: SearchInput = { query: 'fantasy' };
      const mockInput2: SearchInput = { query: 'scifi' };
      const mockBooks1 = [
        { id: '1', title: 'Fantasy Book' },
      ] as unknown as Book[];
      const mockBooks2 = [
        { id: '2', title: 'Scifi Book' },
      ] as unknown as Book[];

      cacheManager.get.mockResolvedValue(null);

      jest
        .spyOn(queryBuilder, 'getMany')
        .mockResolvedValueOnce(mockBooks1)
        .mockResolvedValueOnce(mockBooks2);

      const [result1, result2] = await Promise.all([
        service.search(mockInput1),
        service.search(mockInput2),
      ]);

      expect(result1.books).toEqual(mockBooks1);
      expect(result2.books).toEqual(mockBooks2);

      // Both queries should hit the database
      expect(queryBuilder.getMany).toHaveBeenCalledTimes(2);
    });

    it('should clean up promise map after search completes', async () => {
      const mockInput: SearchInput = { query: 'cleanup-test' };
      const mockBooks = [{ id: '1', title: 'Test Book' }] as unknown as Book[];

      cacheManager.get.mockResolvedValue(null);
      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue(mockBooks);

      await service.search(mockInput);

      // Try another search with the same input - should not deduplicate
      // because the previous promise should have been cleaned up
      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue(mockBooks);
      await service.search(mockInput);

      // Should have been called twice (no deduplication on second call)
      expect(queryBuilder.getMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidateCache', () => {
    it('should reset cache when invalidateCache is called', async () => {
      await service.invalidateCache();

      expect(cacheManager.reset).toHaveBeenCalled();
    });

    it('should reset cache when invalidateCache is called with pattern', async () => {
      await service.invalidateCache('search:*');

      expect(cacheManager.reset).toHaveBeenCalled();
    });
  });
});
