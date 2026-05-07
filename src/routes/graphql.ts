import { Router } from 'express';
import { createHandler } from 'graphql-http/lib/use/express';
import { schema } from '../graphql/schema';
import { rootResolvers } from '../graphql/resolvers';

const router = Router();

router.all('/', createHandler({ schema, rootValue: rootResolvers }));

export default router;
