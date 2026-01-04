import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Book } from './entities/book.entity';
import { SearchBooksInput } from './dto/search-books.input';
import { SearchBooksResult } from './dto/book.output';
import { BookRepository } from './repositories/book.repository';

interface SearchCacheData {
  books: Book[];
  total: number;
}

@Injectable()
export class BooksService {
  // Map to store in-flight search promises for deduplication
  private searchPromises = new Map<string, Promise<SearchCacheData>>();

  constructor(
    private readonly bookRepository: BookRepository,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  private generateCacheKey(input: SearchBooksInput): string {
    const filterKey = input.filters
      ? JSON.stringify(input.filters, Object.keys(input.filters).sort())
      : '{}';

    return `search:q=${input.query}:f=${filterKey}:p=${input.page}:l=${input.limit}`;
  }

  async search(input: SearchBooksInput): Promise<SearchBooksResult> {
    const cacheKey = this.generateCacheKey(input);
    const page = input.page || 1;
    const limit = input.limit || 20;

    const cachedResult = await this.cacheManager.get<SearchCacheData>(cacheKey);
    if (cachedResult) {
      const lastPage = Math.ceil(cachedResult.total / limit);
      return {
        books: cachedResult.books,
        pagination: {
          page,
          limit,
          total: cachedResult.total,
          lastPage,
          hasNextPage: page < lastPage,
          hasPreviousPage: page > 1,
        },
      };
    }

    const existingPromise = this.searchPromises.get(cacheKey);
    if (existingPromise) {
      const result = await existingPromise;
      const lastPage = Math.ceil(result.total / limit);
      return {
        books: result.books,
        pagination: {
          page,
          limit,
          total: result.total,
          lastPage,
          hasNextPage: page < lastPage,
          hasPreviousPage: page > 1,
        },
      };
    }

    const searchPromise = this.performDatabaseSearch(input);
    this.searchPromises.set(cacheKey, searchPromise);

    try {
      const result = await searchPromise;

      await this.cacheManager.set(cacheKey, result);

      const lastPage = Math.ceil(result.total / limit);
      return {
        books: result.books,
        pagination: {
          page,
          limit,
          total: result.total,
          lastPage,
          hasNextPage: page < lastPage,
          hasPreviousPage: page > 1,
        },
      };
    } finally {
      // Clean up the promise from the map after it's done
      this.searchPromises.delete(cacheKey);
    }
  }

  private async performDatabaseSearch(
    input: SearchBooksInput,
  ): Promise<SearchCacheData> {
    const { query, filters, page = 1, limit = 20 } = input;

    const skip = (page - 1) * limit;

    const bookQuery = this.bookRepository['repository']
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.authors', 'author')
      .leftJoinAndSelect('book.comments', 'comment');

    const searchCondition =
      '(book.title ILIKE :query OR book.description ILIKE :query OR book.genre ILIKE :query OR author.firstName ILIKE :query OR author.lastName ILIKE :query)';

    bookQuery.where(searchCondition, { query: `%${query}%` });

    if (filters) {
      if (filters.genre) {
        bookQuery.andWhere('book.genre = :genre', {
          genre: filters.genre,
        });
      }
      if (filters.publicationYear && filters.publicationYear.length === 2) {
        bookQuery.andWhere(
          'book.publicationYear BETWEEN :startYear AND :endYear',
          {
            startYear: filters.publicationYear[0],
            endYear: filters.publicationYear[1],
          },
        );
      }
    }

    bookQuery.skip(skip).take(limit);

    const [books, total] = await bookQuery.getManyAndCount();

    return { books, total };
  }
}
