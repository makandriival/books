import { InputType, Field } from '@nestjs/graphql';
import { Pagination } from '../../../common/shared/pagination.input';
import { IsString, IsOptional, IsInt } from 'class-validator';

@InputType()
export class SearchBooksFiltersInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  genre?: string;

  @Field(() => [Number], { nullable: true })
  @IsOptional()
  @IsInt({ each: true })
  publicationYear?: [number, number];
}

@InputType()
export class SearchBooksInput extends Pagination {
  @Field(() => String)
  @IsString()
  query: string;

  @Field(() => SearchBooksFiltersInput, { nullable: true })
  @IsOptional()
  filters?: SearchBooksFiltersInput;
}
