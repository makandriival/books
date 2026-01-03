import { Field, ObjectType } from '@nestjs/graphql';
import { Book } from '../../modules/books/entities/book.entity';
import { User } from '../../modules/user/entities/user.entity';
import { Comment } from '../../modules/books/entities/comment.entity';

@ObjectType()
export class SearchResult {
  @Field(() => [Book])
  books: Book[];

  @Field(() => [User])
  users: User[];

  @Field(() => [Comment])
  comments: Comment[];
}
