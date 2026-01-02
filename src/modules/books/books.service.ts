import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './entities/book.entity';
import { Comment } from './entities/comment.entity';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) {}

  async findAll(): Promise<Book[]> {
    return this.bookRepository.find({
      relations: ['authors', 'comments'],
    });
  }

  async findOne(id: string): Promise<Book> {
    return this.bookRepository.findOne({
      where: { id },
      relations: ['authors', 'comments'],
    });
  }

  async searchBooks(query: string): Promise<Book[]> {
    return this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.authors', 'author')
      .leftJoinAndSelect('book.comments', 'comment')
      .where('book.title ILIKE :query OR book.description ILIKE :query OR author.firstName ILIKE :query OR author.lastName ILIKE :query',
             { query: `%${query}%` })
      .getMany();
  }

  async createComment(bookId: string, content: string, rating: number = 1): Promise<Comment> {
    const book = await this.bookRepository.findOne({ where: { id: bookId } });
    if (!book) {
      throw new Error('Book not found');
    }

    const comment = this.commentRepository.create({
      content,
      rating,
      book,
    });

    return this.commentRepository.save(comment);
  }
}
