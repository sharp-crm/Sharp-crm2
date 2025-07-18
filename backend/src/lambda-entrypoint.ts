// src/lambda-entrypoint.ts
import serverlessExpress from '@vendia/serverless-express';
import app from './app'; // update this path if needed

export const handler = serverlessExpress({ app });
