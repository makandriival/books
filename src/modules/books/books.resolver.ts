import { Resolver, Query, Args } from '@nestjs/graphql';
import { BooksService } from './books.service';
import { Book } from './entities/book.entity';
import { SearchInput } from '../../common/shared/search.input';

@Resolver(() => Book)
export class BooksResolver {
  constructor(private readonly booksService: BooksService) {}

  @Query(() => [Book])
  async bookSearch(@Args('input') input: SearchInput): Promise<Book[]> {
    return this.booksService.bookSearch(input);
  }
}
