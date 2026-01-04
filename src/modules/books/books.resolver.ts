import { Resolver, Query, Args } from '@nestjs/graphql';
import { BooksService } from './books.service';
import { Book } from './entities/book.entity';
import { SearchInput } from '../../common/shared/search.input';
import { SearchResultWithSource } from '../../common/shared/search-result.object';

@Resolver(() => Book)
export class BooksResolver {
  constructor(private readonly booksService: BooksService) {}

  @Query(() => SearchResultWithSource)
  async search(
    @Args('input') input: SearchInput,
  ): Promise<SearchResultWithSource> {
    return this.booksService.search(input);
  }
}
