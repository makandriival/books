import { ObjectType, Field } from '@nestjs/graphql';
import { BaseSchema } from '../../baseModule/baseSchema.entity';
import { Column, Entity, OneToMany, ManyToMany } from 'typeorm';
import { Role } from '../../../common/enums/userRole.enum';
import { Book } from '../../books/entities/book.entity';

@ObjectType()
@Entity('user')
export class User extends BaseSchema {
  @Column({ type: 'varchar', nullable: false })
  @Field(() => String)
  firstName: string;

  @Column({ type: 'varchar', nullable: false })
  @Field(() => String)
  lastName: string;

  @Column({ type: 'varchar', nullable: false, unique: true })
  @Field(() => String)
  email: string;

  @Column({ type: 'varchar', nullable: false, select: false })
  password: string;

  @Column({ type: 'boolean', default: false })
  @Field(() => Boolean)
  status: boolean;

  @Column({ type: 'varchar', nullable: true })
  @Field(() => String)
  token: string;

  @Column({ type: 'enum', enum: Role, default: Role.WRITER })
  @Field(() => Role)
  role: Role;

  @ManyToMany(() => Book, book => book.authors)
  @Field(() => [Book])
  authoredBooks: Book[];
}
