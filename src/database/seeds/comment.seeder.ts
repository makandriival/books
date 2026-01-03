import { faker } from '@faker-js/faker';
import { BaseSeeder } from './base.seeder';
import { Comment } from '../../modules/books/entities/comment.entity';
import { Book } from '../../modules/books/entities/book.entity';

export class CommentSeeder extends BaseSeeder {
  async run(): Promise<void> {
    await this.clearTable('comment');

    const comments: Comment[] = [];
    const commentRepository = this.dataSource.getRepository(Comment);
    const bookRepository = this.dataSource.getRepository(Book);

    // Get all books to assign comments to
    const books = await bookRepository.find();

    if (books.length === 0) {
      throw new Error('No books found. Please run book seeder first.');
    }

    // Create multiple comments per book (0-5 comments per book)
    for (const book of books) {
      const numComments = faker.datatype.number({ min: 0, max: 5 });

      for (let i = 0; i < numComments; i++) {
        const comment = new Comment();

        // Generate random comment content
        const contentType = faker.datatype.number({ min: 1, max: 3 });

        switch (contentType) {
          case 1: // Short review
            comment.content = faker.lorem.sentences(
              faker.datatype.number({ min: 1, max: 3 }),
            );
            break;
          case 2: // Detailed review
            comment.content = faker.lorem.paragraphs(
              faker.datatype.number({ min: 1, max: 2 }),
            );
            break;
          case 3: // Mixed content
            comment.content = `${faker.lorem.sentences(
              2,
            )} ${faker.lorem.paragraph()}`;
            break;
        }

        // Generate random rating (1-5 stars)
        comment.rating = faker.datatype.number({ min: 1, max: 5 });

        comment.book = book;
        comments.push(comment);
      }
    }

    await this.executeInTransaction(async () => {
      await commentRepository.save(comments);
    });
  }
}
