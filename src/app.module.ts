import { Module } from '@nestjs/common';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { AppConfigModule } from './config/appConfig.module';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { BooksModule } from './modules/books/books.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: true,
      autoSchemaFile: 'schema.gql',
      sortSchema: true,
      context: ({ req, res }) => ({ req, res }),
    }),
    AuthModule,
    AppConfigModule,
    DatabaseModule,
    UserModule,
    BooksModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
