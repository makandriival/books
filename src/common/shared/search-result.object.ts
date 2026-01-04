import { Field, ObjectType } from '@nestjs/graphql';
import { Book } from '../../modules/books/entities/book.entity';
import { PaginationObject } from './objectTypes/pagination.object';

@ObjectType()
export class SearchResult {
  @Field(() => [Book])
  books: Book[];

  @Field(() => PaginationObject)
  pagination: PaginationObject;
}
