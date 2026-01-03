import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SearchFiltersInput {
  @Field(() => String, { nullable: true })
  genre?: string;

  @Field(() => [Number], { nullable: true })
  publicationYear?: [number, number];
}

@InputType()
export class SearchInput {
  @Field(() => String)
  query: string;

  @Field(() => SearchFiltersInput, { nullable: true })
  filters?: SearchFiltersInput;
}
