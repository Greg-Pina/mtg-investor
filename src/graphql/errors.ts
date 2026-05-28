import { GraphQLError } from 'graphql';

export class InputValidationError extends Error {}

export function mapGraphQLError(error: unknown): never {
  if (error instanceof GraphQLError) throw error;
  if (error instanceof InputValidationError) {
    throw new GraphQLError(error.message, { extensions: { code: 'BAD_USER_INPUT' } });
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  throw new GraphQLError(message, { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
}
