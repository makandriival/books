import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './entities/book.entity';
import { SearchInput } from '../../common/shared/search.input';
import { SearchResultWithSource } from '../../common/shared/search-result.object';

@Injectable()
export class BooksService {
  // Map to store in-flight search promises for deduplication
  private searchPromises = new Map<string, Promise<Book[]>>();

  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  private generateCacheKey(input: SearchInput): string {
    // Create a deterministic cache key from search input
    return `search:${JSON.stringify({
      query: input.query,
      filters: input.filters || {},
    })}`;
  }

  async search(input: SearchInput): Promise<SearchResultWithSource> {
    const cacheKey = this.generateCacheKey(input);

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<Book[]>(cacheKey);
    if (cachedResult) {
      return {
        books: cachedResult,
        source: 'cache',
        cacheKey,
      };
    }

    // Check if there's already an in-flight request for this search
    const existingPromise = this.searchPromises.get(cacheKey);
    if (existingPromise) {
      const books = await existingPromise;
      return {
        books,
        source: 'database',
        cacheKey,
      };
    }

    // Create the promise for this search
    const searchPromise = this.performDatabaseSearch(input);
    this.searchPromises.set(cacheKey, searchPromise);

    try {
      const books = await searchPromise;

      // Store in cache
      await this.cacheManager.set(cacheKey, books);

      return {
        books,
        source: 'database',
        cacheKey,
      };
    } finally {
      // Clean up the promise from the map after it's done
      this.searchPromises.delete(cacheKey);
    }
  }

  private async performDatabaseSearch(input: SearchInput): Promise<Book[]> {
    // If not in cache, fetch from database
    const { query, filters } = input;

    let bookQuery = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.authors', 'author')
      .leftJoinAndSelect('book.comments', 'comment');

    const searchCondition =
      '(book.title ILIKE :query OR book.description ILIKE :query OR book.genre ILIKE :query OR author.firstName ILIKE :query OR author.lastName ILIKE :query)';

    bookQuery = bookQuery.where(searchCondition, { query: `%${query}%` });

    if (filters) {
      if (filters.genre) {
        bookQuery = bookQuery.andWhere('book.genre = :genre', {
          genre: filters.genre,
        });
      }
      if (filters.publicationYear && filters.publicationYear.length === 2) {
        bookQuery = bookQuery.andWhere(
          'book.publicationYear BETWEEN :startYear AND :endYear',
          {
            startYear: filters.publicationYear[0],
            endYear: filters.publicationYear[1],
          },
        );
      }
    }

    return await bookQuery.getMany();
  }

  // Optional: Method to invalidate cache (useful for mutations)
  async invalidateCache(pattern?: string): Promise<void> {
    if (pattern) {
      // For pattern-based deletion, we reset all cache
      await this.cacheManager.reset();
    } else {
      await this.cacheManager.reset();
    }
  }
}
