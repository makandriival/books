import { Resolver, Query, Args } from '@nestjs/graphql';
import { BooksService } from './books.service';
import { Book } from './entities/book.entity';
import { SearchBooksInput } from './dto/search-books.input';
import { SearchBooksResult } from './dto/book.output';

@Resolver(() => Book)
export class BooksResolver {
  constructor(private readonly booksService: BooksService) {}

  @Query(() => SearchBooksResult)
  async search(
    @Args('input') input: SearchBooksInput,
  ): Promise<SearchBooksResult> {
    return this.booksService.search(input);
  }
}
