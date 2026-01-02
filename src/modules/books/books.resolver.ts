import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { BooksService } from './books.service';
import { Book } from './entities/book.entity';
import { Comment } from './entities/comment.entity';

@Resolver(() => Book)
export class BooksResolver {
  constructor(private readonly booksService: BooksService) {}

  @Query(() => [Book])
  async books(): Promise<Book[]> {
    return this.booksService.findAll();
  }

  @Query(() => Book)
  async book(@Args('id', { type: () => ID }) id: string): Promise<Book> {
    return this.booksService.findOne(id);
  }

  @Query(() => [Book])
  async searchBooks(@Args('query') query: string): Promise<Book[]> {
    return this.booksService.searchBooks(query);
  }

  @Query(() => [Comment])
  async bookComments(@Args('bookId', { type: () => ID }) bookId: string): Promise<Comment[]> {
    const book = await this.booksService.findOne(bookId);
    return book.comments;
  }
}
