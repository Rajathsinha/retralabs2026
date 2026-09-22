import {
  onRequest as apiHandler,
  onRequestPost as apiPost,
  onRequestGet as apiGet,
  onRequestOptions as apiOptions,
} from './_routes';

export const onRequest = apiHandler;
export const onRequestPost = apiPost;
export const onRequestGet = apiGet;
export const onRequestOptions = apiOptions;

// Durable Object classes must be exported from the Pages Functions entry
// module for the wrangler.toml binding (class_name = "MongoConnectionDO")
// to resolve them.
export { MongoConnectionDO } from './durable-objects/mongo-connection';
