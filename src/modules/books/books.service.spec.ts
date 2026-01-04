import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BooksService } from './books.service';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { SearchBooksInput } from './dto/search-books.input';
import { BookRepository } from './repositories/book.repository';

describe('BooksService', () => {
  let service: BooksService;
  let _bookRepository: BookRepository;
  let repository: Repository<Book>;
  let queryBuilder: SelectQueryBuilder<Book>;
  let cacheManager: any;

  beforeEach(async () => {
    // Mock QueryBuilder
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    } as any;

    // Mock underlying TypeORM Repository
    const mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    // Mock BookRepository
    const mockBookRepository = {
      repository: mockRepository,
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
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
          provide: BookRepository,
          useValue: mockBookRepository,
        },
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
    _bookRepository = module.get<BookRepository>(BookRepository);
    repository = mockRepository as any;
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
      const mockInput: SearchBooksInput = { query: 'fantasy' };
      const mockBooks = [
        {
          id: '1',
          title: 'Fantasy Book',
          description: 'A fantasy adventure',
          genre: 'Fiction',
        },
      ] as unknown as Book[];

      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([mockBooks, 1]);

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
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(1);
    });

    it('should search with case insensitivity', async () => {
      const mockInput: SearchBooksInput = { query: 'FANTASY' };
      const mockBooks = [] as unknown as Book[];

      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([mockBooks, mockBooks.length]);

      await service.search(mockInput);

      expect(queryBuilder.where).toHaveBeenCalledWith(expect.any(String), {
        query: '%FANTASY%',
      });
    });

    it('should apply genre filter', async () => {
      const mockInput: SearchBooksInput = {
        query: 'book',
        filters: {
          genre: 'Fiction',
        },
      };
      const mockBooks = [
        { id: '1', title: 'Fiction Book', genre: 'Fiction' },
      ] as unknown as Book[];

      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([mockBooks, mockBooks.length]);

      const result = await service.search(mockInput);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'book.genre = :genre',
        { genre: 'Fiction' },
      );
      expect(result.books).toEqual(mockBooks);
      expect(result.pagination).toBeDefined();
    });

    it('should apply publication year range filter', async () => {
      const mockInput: SearchBooksInput = {
        query: 'classic',
        filters: {
          publicationYear: [2000, 2020],
        },
      };
      const mockBooks = [
        { id: '1', title: 'Modern Classic', publicationYear: 2010 },
      ] as unknown as Book[];

      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([mockBooks, mockBooks.length]);

      const result = await service.search(mockInput);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'book.publicationYear BETWEEN :startYear AND :endYear',
        { startYear: 2000, endYear: 2020 },
      );
      expect(result.books).toEqual(mockBooks);
      expect(result.pagination).toBeDefined();
    });

    it('should apply both genre and year filters together', async () => {
      const mockInput: SearchBooksInput = {
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

      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([mockBooks, mockBooks.length]);

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
      expect(result.pagination).toBeDefined();
    });

    it('should not apply genre filter if not provided', async () => {
      const mockInput: SearchBooksInput = {
        query: 'book',
        filters: {
          publicationYear: [2000, 2020],
        },
      };
      const mockBooks = [] as unknown as Book[];

      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([mockBooks, mockBooks.length]);

      await service.search(mockInput);

      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        'book.genre = :genre',
        expect.any(Object),
      );
    });

    it('should not apply year filter if not provided', async () => {
      const mockInput: SearchBooksInput = {
        query: 'book',
        filters: {
          genre: 'Fiction',
        },
      };
      const mockBooks = [] as unknown as Book[];

      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([mockBooks, mockBooks.length]);

      await service.search(mockInput);

      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        'book.publicationYear BETWEEN :startYear AND :endYear',
        expect.any(Object),
      );
    });

    it('should not apply year filter if array length is not 2', async () => {
      const mockInput: SearchBooksInput = {
        query: 'book',
        filters: {
          publicationYear: [2000] as any, // Invalid: only one year
        },
      };
      const mockBooks = [] as unknown as Book[];

      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([mockBooks, mockBooks.length]);

      await service.search(mockInput);

      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        'book.publicationYear BETWEEN :startYear AND :endYear',
        expect.any(Object),
      );
    });

    it('should return empty array when no books match', async () => {
      const mockInput: SearchBooksInput = { query: 'nonexistent' };

      jest.spyOn(queryBuilder, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.search(mockInput);

      expect(result.books).toEqual([]);
      expect(result.pagination).toBeDefined();
    });

    it('should include authors in query', async () => {
      const mockInput: SearchBooksInput = { query: 'author' };
      const mockBooks = [
        {
          id: '1',
          title: 'Book',
          authors: [{ id: '1', firstName: 'John', lastName: 'Doe' }],
        },
      ] as unknown as Book[];

      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([mockBooks, mockBooks.length]);

      await service.search(mockInput);

      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'book.authors',
        'author',
      );
    });

    it('should include comments in query', async () => {
      const mockInput: SearchBooksInput = { query: 'comment' };
      const mockBooks = [
        {
          id: '1',
          title: 'Book',
          comments: [{ id: '1', text: 'Great book!' }],
        },
      ] as unknown as Book[];

      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([mockBooks, mockBooks.length]);

      await service.search(mockInput);

      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'book.comments',
        'comment',
      );
    });

    it('should search across multiple fields (title, description, genre, author)', async () => {
      const mockInput: SearchBooksInput = { query: 'search term' };

      jest.spyOn(queryBuilder, 'getManyAndCount').mockResolvedValue([[], 0]);

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
      const mockInput: SearchBooksInput = { query: '' };
      const mockBooks = [] as unknown as Book[];

      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([mockBooks, mockBooks.length]);

      const result = await service.search(mockInput);

      expect(queryBuilder.where).toHaveBeenCalledWith(expect.any(String), {
        query: '%%',
      });
      expect(result.books).toEqual([]);
      expect(result.pagination).toBeDefined();
    });

    it('should handle special characters in query', async () => {
      const mockInput: SearchBooksInput = { query: "book's title" };
      const mockBooks = [] as unknown as Book[];

      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([mockBooks, mockBooks.length]);

      await service.search(mockInput);

      expect(queryBuilder.where).toHaveBeenCalledWith(expect.any(String), {
        query: "%book's title%",
      });
    });

    it('should propagate database errors', async () => {
      const mockInput: SearchBooksInput = { query: 'test' };
      const error = new Error('Database connection failed');

      jest.spyOn(queryBuilder, 'getManyAndCount').mockRejectedValue(error);

      await expect(service.search(mockInput)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should return cached results on cache hit', async () => {
      const mockInput: SearchBooksInput = { query: 'fantasy' };
      const cachedBooks = [
        {
          id: '1',
          title: 'Fantasy Book',
          description: 'Cached result',
          genre: 'Fiction',
        },
      ] as unknown as Book[];

      cacheManager.get.mockResolvedValue({
        books: cachedBooks,
        total: cachedBooks.length,
      });

      const result = await service.search(mockInput);

      expect(cacheManager.get).toHaveBeenCalled();
      expect(result.books).toEqual(cachedBooks);
      expect(result.pagination).toBeDefined();
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache on cache miss', async () => {
      const mockInput: SearchBooksInput = { query: 'fantasy' };
      const mockBooks = [
        {
          id: '1',
          title: 'Fantasy Book',
          description: 'Fresh from DB',
          genre: 'Fiction',
        },
      ] as unknown as Book[];

      cacheManager.get.mockResolvedValue(null);
      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([mockBooks, mockBooks.length]);

      const result = await service.search(mockInput);

      expect(cacheManager.get).toHaveBeenCalled();
      expect(repository.createQueryBuilder).toHaveBeenCalled();
      expect(queryBuilder.getManyAndCount).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(expect.any(String), {
        books: mockBooks,
        total: mockBooks.length,
      });
      expect(result.books).toEqual(mockBooks);
      expect(result.pagination).toBeDefined();
    });

    it('should generate different cache keys for different queries', async () => {
      const mockInput1: SearchBooksInput = { query: 'fantasy' };
      const mockInput2: SearchBooksInput = { query: 'scifi' };

      jest.spyOn(queryBuilder, 'getManyAndCount').mockResolvedValue([[], 0]);

      await service.search(mockInput1);
      const firstCacheKey = cacheManager.set.mock.calls[0][0];

      await service.search(mockInput2);
      const secondCacheKey = cacheManager.set.mock.calls[1][0];

      expect(firstCacheKey).not.toEqual(secondCacheKey);
    });

    it('should generate different cache keys for different filters', async () => {
      const mockInput1: SearchBooksInput = {
        query: 'book',
        filters: { genre: 'Fiction' },
      };
      const mockInput2: SearchBooksInput = {
        query: 'book',
        filters: { genre: 'Non-Fiction' },
      };

      jest.spyOn(queryBuilder, 'getManyAndCount').mockResolvedValue([[], 0]);

      await service.search(mockInput1);
      const firstCacheKey = cacheManager.set.mock.calls[0][0];

      await service.search(mockInput2);
      const secondCacheKey = cacheManager.set.mock.calls[1][0];

      expect(firstCacheKey).not.toEqual(secondCacheKey);
    });

    it('should deduplicate concurrent identical search requests', async () => {
      const mockInput: SearchBooksInput = { query: 'fantasy' };
      const mockBooks = [
        {
          id: '1',
          title: 'Fantasy Book',
          description: 'A fantasy adventure',
          genre: 'Fiction',
        },
      ] as unknown as Book[];

      cacheManager.get.mockResolvedValue(null);

      // Mock getManyAndCount to simulate a slow database query
      let resolveQuery: ((value: [Book[], number]) => void) | undefined;
      const queryPromise = new Promise<[Book[], number]>((resolve) => {
        resolveQuery = resolve;
      });
      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockReturnValue(queryPromise as any);

      // Make 3 concurrent identical requests
      const promise1 = service.search(mockInput);
      const promise2 = service.search(mockInput);
      const promise3 = service.search(mockInput);

      // Resolve the database query
      if (resolveQuery) {
        resolveQuery([mockBooks, mockBooks.length]);
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
      expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(1);

      // Cache should only be set once
      expect(cacheManager.set).toHaveBeenCalledTimes(1);
    });

    it('should not deduplicate different search requests', async () => {
      const mockInput1: SearchBooksInput = { query: 'fantasy' };
      const mockInput2: SearchBooksInput = { query: 'scifi' };
      const mockBooks1 = [
        { id: '1', title: 'Fantasy Book' },
      ] as unknown as Book[];
      const mockBooks2 = [
        { id: '2', title: 'Scifi Book' },
      ] as unknown as Book[];

      cacheManager.get.mockResolvedValue(null);

      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValueOnce([mockBooks1, mockBooks1.length])
        .mockResolvedValueOnce([mockBooks2, mockBooks2.length]);

      const [result1, result2] = await Promise.all([
        service.search(mockInput1),
        service.search(mockInput2),
      ]);

      expect(result1.books).toEqual(mockBooks1);
      expect(result2.books).toEqual(mockBooks2);

      // Both queries should hit the database
      expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(2);
    });

    it('should clean up promise map after search completes', async () => {
      const mockInput: SearchBooksInput = { query: 'cleanup-test' };
      const mockBooks = [{ id: '1', title: 'Test Book' }] as unknown as Book[];

      cacheManager.get.mockResolvedValue(null);
      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([mockBooks, mockBooks.length]);

      await service.search(mockInput);

      // Try another search with the same input - should not deduplicate
      // because the previous promise should have been cleaned up
      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([mockBooks, mockBooks.length]);
      await service.search(mockInput);

      // Should have been called twice (no deduplication on second call)
      expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(2);
    });
  });
});
