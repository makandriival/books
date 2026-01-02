import { seedDataSource } from './seed-data-source';
import { UserSeeder } from './user.seeder';
import { BookSeeder } from './book.seeder';
import { CommentSeeder } from './comment.seeder';

async function runSeeders() {
  try {
    await seedDataSource.initialize();

    const userSeeder = new UserSeeder(seedDataSource);
    const bookSeeder = new BookSeeder(seedDataSource);
    const commentSeeder = new CommentSeeder(seedDataSource);

    await userSeeder.run();
    await bookSeeder.run();
    await commentSeeder.run();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    if (seedDataSource.isInitialized) {
      await seedDataSource.destroy();
    }
  }
}

// Run if called directly
if (require.main === module) {
  runSeeders();
}
