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
import type * as functions_sections from "../functions/sections.js";
import type * as functions_users from "../functions/users.js";

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
  "functions/sections": typeof functions_sections;
  "functions/users": typeof functions_users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
