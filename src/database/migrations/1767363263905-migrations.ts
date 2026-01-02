import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1767363263905 implements MigrationInterface {
  name = 'Migrations1767363263905';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "book" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "title" character varying NOT NULL, "description" character varying NOT NULL, "cover" character varying, "pages" integer, CONSTRAINT "PK_a3afef72ec8f80e6e5c310b28a4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "comment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "content" text NOT NULL, "rating" integer NOT NULL DEFAULT '1', "bookId" uuid NOT NULL, CONSTRAINT "PK_0b0e4bbc8415ec426f87f3a88e2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "book_authors" ("bookId" uuid NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_209d288cb91544021c8b3527bdd" PRIMARY KEY ("bookId", "userId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8433d38595493ad358f0cb0a58" ON "book_authors" ("bookId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e0b3260b47d1bf119ac544e35d" ON "book_authors" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."user_role_enum" RENAME TO "user_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('Writer', 'Moderator', 'Consumer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role_enum" USING "role"::"text"::"public"."user_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'Writer'`,
    );
    await queryRunner.query(`DROP TYPE "public"."user_role_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "comment_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "book_authors" ADD CONSTRAINT "book_authors_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "book_authors" ADD CONSTRAINT "book_authors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "book_authors" DROP CONSTRAINT "book_authors_userId_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "book_authors" DROP CONSTRAINT "book_authors_bookId_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "comment_bookId_fkey"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum_old" AS ENUM('Writer', 'Moderator')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role_enum_old" USING "role"::"text"::"public"."user_role_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'Writer'`,
    );
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."user_role_enum_old" RENAME TO "user_role_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e0b3260b47d1bf119ac544e35d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8433d38595493ad358f0cb0a58"`,
    );
    await queryRunner.query(`DROP TABLE "book_authors"`);
    await queryRunner.query(`DROP TABLE "comment"`);
    await queryRunner.query(`DROP TABLE "book"`);
  }
}
