import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './entities/book.entity';
import { SearchInput } from '../../common/shared/search.input';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
  ) {}

  async bookSearch(input: SearchInput): Promise<Book[]> {
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

    const books = await bookQuery.getMany();

    return books;
  }
}
