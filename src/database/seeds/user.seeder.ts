import { faker } from '@faker-js/faker';
import { BaseSeeder } from './base.seeder';
import { User } from '../../modules/user/entities/user.entity';
import { Role } from '../../common/enums/userRole.enum';
import * as bcrypt from 'bcrypt';

export class UserSeeder extends BaseSeeder {
  async run(): Promise<void> {
    await this.clearTable('user');

    const users: User[] = [];
    const userRepository = this.dataSource.getRepository(User);

    // Create 50 writers
    for (let i = 0; i < 50; i++) {
      const user = new User();
      user.firstName = faker.person.firstName();
      user.lastName = faker.person.lastName();
      user.email = faker.internet.email({
        firstName: user.firstName.toLowerCase(),
        lastName: user.lastName.toLowerCase(),
      });
      user.password = await bcrypt.hash('password123', 10); // Default password
      user.role = Role.WRITER;
      user.status = faker.datatype.boolean(); // 90% active users

      users.push(user);
    }

    // Create 10 moderators
    for (let i = 0; i < 10; i++) {
      const user = new User();
      user.firstName = faker.person.firstName();
      user.lastName = faker.person.lastName();
      user.email = faker.internet.email({
        firstName: user.firstName.toLowerCase(),
        lastName: user.lastName.toLowerCase(),
      });
      user.password = await bcrypt.hash('password123', 10);
      user.role = Role.MODERATOR;
      user.status = true; // Moderators are always active

      users.push(user);
    }

    // Create 100 consumers
    for (let i = 0; i < 100; i++) {
      const user = new User();
      user.firstName = faker.person.firstName();
      user.lastName = faker.person.lastName();
      user.email = faker.internet.email({
        firstName: user.firstName.toLowerCase(),
        lastName: user.lastName.toLowerCase(),
      });
      user.password = await bcrypt.hash('password123', 10);
      user.role = Role.CONSUMER;
      user.status = faker.datatype.boolean(); // 95% active users

      users.push(user);
    }

    await this.executeInTransaction(async () => {
      await userRepository.save(users);
    });
  }
}
