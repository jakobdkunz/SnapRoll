/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as functions_attendance from "../functions/attendance.js";
import type * as functions_auth from "../functions/auth.js";
import type * as functions_demo from "../functions/demo.js";
import type * as functions_enrollments from "../functions/enrollments.js";
import type * as functions_history from "../functions/history.js";
import type * as functions_polls from "../functions/polls.js";
import type * as functions_sections from "../functions/sections.js";
import type * as functions_seed from "../functions/seed.js";
import type * as functions_slideshow from "../functions/slideshow.js";
import type * as functions_students from "../functions/students.js";
import type * as functions_users from "../functions/users.js";
import type * as functions_wordcloud from "../functions/wordcloud.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "functions/attendance": typeof functions_attendance;
  "functions/auth": typeof functions_auth;
  "functions/demo": typeof functions_demo;
  "functions/enrollments": typeof functions_enrollments;
  "functions/history": typeof functions_history;
  "functions/polls": typeof functions_polls;
  "functions/sections": typeof functions_sections;
  "functions/seed": typeof functions_seed;
  "functions/slideshow": typeof functions_slideshow;
  "functions/students": typeof functions_students;
  "functions/users": typeof functions_users;
  "functions/wordcloud": typeof functions_wordcloud;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
