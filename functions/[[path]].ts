import { onRequest as netlifyHandler, onRequestPost as netlifyPost, onRequestGet as netlifyGet, onRequestOptions as netlifyOptions } from './_handlers/netlify';

export const onRequest = netlifyHandler;
export const onRequestPost = netlifyPost;
export const onRequestGet = netlifyGet;
export const onRequestOptions = netlifyOptions;
