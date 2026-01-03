import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1767367169930 implements MigrationInterface {
  name = 'Migrations1767367169930';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "book" ADD "genre" character varying`);
    await queryRunner.query(`ALTER TABLE "book" ADD "publicationYear" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "book" DROP COLUMN "publicationYear"`);
    await queryRunner.query(`ALTER TABLE "book" DROP COLUMN "genre"`);
  }
}
