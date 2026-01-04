import { ObjectType, Field } from '@nestjs/graphql';
import { Book } from '../entities/book.entity';
import { PaginationObject } from '../../../common/shared/objectTypes/pagination.object';

@ObjectType()
export class SearchBooksResult {
  @Field(() => [Book])
  books: Book[];

  @Field(() => PaginationObject)
  pagination: PaginationObject;
}
