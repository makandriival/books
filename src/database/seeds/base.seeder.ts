import { DataSource } from 'typeorm';

export abstract class BaseSeeder {
  constructor(protected dataSource: DataSource) {}

  abstract run(): Promise<void>;

  protected async clearTable(tableName: string): Promise<void> {
    await this.dataSource.query(
      `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`,
    );
  }

  protected async executeInTransaction<T>(
    callback: () => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await callback();
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
