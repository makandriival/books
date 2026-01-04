import { Field, InputType } from '@nestjs/graphql';
import { Pagination } from './pagination.input';

@InputType()
export class SearchFiltersInput {
  @Field(() => String, { nullable: true })
  genre?: string;

  @Field(() => [Number], { nullable: true })
  publicationYear?: [number, number];
}

@InputType()
export class SearchInput extends Pagination {
  @Field(() => String)
  query: string;

  @Field(() => SearchFiltersInput, { nullable: true })
  filters?: SearchFiltersInput;
}
