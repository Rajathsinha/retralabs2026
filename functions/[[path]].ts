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
