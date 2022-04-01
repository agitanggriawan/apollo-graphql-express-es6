import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginDrainHttpServer, gql } from 'apollo-server-core';
import responseCachePlugin from 'apollo-server-plugin-response-cache';
import { BaseRedisCache } from 'apollo-server-cache-redis';
import Redis from 'ioredis';
import express from 'express';
import http from 'http';

const typeDefs = gql`
  scalar BigInt

  enum CacheControlScope {
    PUBLIC
    PRIVATE
  }

  directive @cacheControl(
    maxAge: Int
    scope: CacheControlScope
    inheritMaxAge: Boolean
  ) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION

  type Query {
    version(ts: BigInt): String @cacheControl(maxAge: 60)
  }
  type Mutation {
    base: String
  }
`;

const resolvers = {
  Query: {
    async version(_, args, context) {
      console.log('==> accessing version');

      return '1.0.0';
    },
  },
  Mutation: {
    async base(_, args) {
      console.log('==> accessing base');

      return 'Base';
    },
  },
};

async function startApolloServer(typeDefs, resolvers) {
  const app = express();
  const httpServer = http.createServer(app);

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    cache: new BaseRedisCache({
      client: new Redis({
        host: 'localhost',
        port: 6379,
        password: '',
        db: 0,
      }),
    }),
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      responseCachePlugin.default(),
    ],
  });

  await server.start();
  server.applyMiddleware({
    app,
    path: '/',
  });

  // Modified server startup
  await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
}

startApolloServer(typeDefs, resolvers);
