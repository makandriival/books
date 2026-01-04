import { Injectable } from '@nestjs/common';
import { CrudRepository } from '../../baseModule/base.repository';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Book } from '../entities/book.entity';

@Injectable()
export class BookRepository extends CrudRepository<Book> {
  constructor(
    @InjectRepository(Book)
    repository: Repository<Book>,
  ) {
    super(repository);
  }
}
