import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookFields1767365472300 implements MigrationInterface {
  name = 'AddBookFields1767365472300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "book" ADD "genre" character varying`);
    await queryRunner.query(`ALTER TABLE "book" ADD "publicationYear" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "book" DROP COLUMN "publicationYear"`);
    await queryRunner.query(`ALTER TABLE "book" DROP COLUMN "genre"`);
  }
}
