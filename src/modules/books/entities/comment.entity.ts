import { ObjectType, Field } from '@nestjs/graphql';
import { BaseSchema } from '../../baseModule/baseSchema.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Book } from './book.entity';

@ObjectType()
@Entity('comment')
export class Comment extends BaseSchema {
  @Column({ type: 'text', nullable: false })
  @Field(() => String)
  content: string;

  @Column({ type: 'int', default: 1 })
  @Field(() => Number)
  rating: number; // 1-5 stars

  @ManyToOne(() => Book, (book) => book.comments, { nullable: false })
  @Field(() => Book)
  book: Book;
}
