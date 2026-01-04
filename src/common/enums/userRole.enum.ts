import { registerEnumType } from '@nestjs/graphql';

export enum Role {
  WRITER = 'Writer',
  MODERATOR = 'Moderator',
  CONSUMER = 'Consumer',
}

registerEnumType(Role, {
  name: 'Role',
  description: 'Users roles',
});
