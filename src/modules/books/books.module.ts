import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksService } from './books.service';
import { BooksResolver } from './books.resolver';
import { Book } from './entities/book.entity';
import { Comment } from './entities/comment.entity';
import { BookRepository } from './repositories/book.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Comment])],
  providers: [BooksService, BooksResolver, BookRepository],
  exports: [BooksService],
})
export class BooksModule {}
