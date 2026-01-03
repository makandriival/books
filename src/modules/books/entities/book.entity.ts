import { Field, ObjectType } from '@nestjs/graphql';
import { BaseSchema } from '../../baseModule/baseSchema.entity';
import { Column, Entity, ManyToMany, OneToMany, JoinTable } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Comment } from './comment.entity';

@ObjectType()
@Entity('book')
export class Book extends BaseSchema {
  @Column({ type: 'varchar', nullable: false })
  @Field(() => String)
  title: string;

  @Column({ type: 'varchar', nullable: false })
  @Field(() => String)
  description: string;

  @Column({ type: 'varchar', nullable: true })
  @Field(() => String, { nullable: true })
  cover: string;

  @Column({ type: 'int', nullable: true })
  @Field(() => Number, { nullable: true })
  pages: number;

  @Column({ type: 'varchar', nullable: true })
  @Field(() => String, { nullable: true })
  genre: string;

  @Column({ type: 'int', nullable: true })
  @Field(() => Number, { nullable: true })
  publicationYear: number;

  @ManyToMany(() => User, (user) => user.authoredBooks)
  @JoinTable({
    name: 'book_authors',
    joinColumn: {
      name: 'bookId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'userId',
      referencedColumnName: 'id',
    },
  })
  @Field(() => [User])
  authors: User[];

  @OneToMany(() => Comment, (comment) => comment.book, { cascade: true })
  @Field(() => [Comment])
  comments: Comment[];
}
