import { Field, ObjectType } from '@nestjs/graphql';
import { Book } from '../../modules/books/entities/book.entity';

@ObjectType()
export class SearchResultWithSource {
  @Field(() => [Book])
  books: Book[];

  @Field(() => String)
  source: 'cache' | 'database';

  @Field(() => String, { nullable: true })
  cacheKey?: string;
}
