import { faker } from '@faker-js/faker';
import { BaseSeeder } from './base.seeder';
import { Book } from '../../modules/books/entities/book.entity';
import { User } from '../../modules/user/entities/user.entity';
import { Role } from '../../common/enums/userRole.enum';

export class BookSeeder extends BaseSeeder {
  async run(): Promise<void> {
    await this.clearTable('book_authors');
    await this.clearTable('book');

    const books: Book[] = [];
    const bookRepository = this.dataSource.getRepository(Book);
    const userRepository = this.dataSource.getRepository(User);

    // Get all writers to use as authors
    const writers = await userRepository.find({
      where: { role: Role.WRITER },
    });

    if (writers.length === 0) {
      throw new Error('No writers found. Please run user seeder first.');
    }

    // Create 1000 books
    for (let i = 0; i < 1000; i++) {
      const book = new Book();

      // Generate random book title
      const titleWords = faker.number.int({ min: 2, max: 6 });
      book.title = faker.lorem.words(titleWords);

      // Generate random description
      const descriptionSentences = faker.number.int({ min: 3, max: 10 });
      book.description = faker.lorem.sentences(descriptionSentences);

      // Optional cover image URL
      if (faker.datatype.boolean(0.7)) {
        // 70% chance of having a cover
        book.cover = faker.image.url();
      }

      // Optional page count
      if (faker.datatype.boolean(0.8)) {
        // 80% chance of having page count
        book.pages = faker.number.int({ min: 50, max: 2000 });
      }

      // Assign random authors (1-3 authors per book)
      const numAuthors = faker.number.int({ min: 1, max: 3 });
      const selectedAuthors: User[] = [];

      // Select random unique authors
      const availableWriters = [...writers]; // Copy the array
      for (let j = 0; j < numAuthors && availableWriters.length > 0; j++) {
        const randomIndex = faker.number.int({
          min: 0,
          max: availableWriters.length - 1,
        });
        selectedAuthors.push(availableWriters[randomIndex]);
        availableWriters.splice(randomIndex, 1); // Remove selected author to avoid duplicates
      }

      book.authors = selectedAuthors;

      books.push(book);
    }

    await this.executeInTransaction(async () => {
      await bookRepository.save(books);
    });
  }
}
