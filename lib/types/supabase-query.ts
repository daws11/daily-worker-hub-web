/**
 * Typed Supabase query builder utilities.
 *
 * Provides reusable type helpers to replace `any` type casts throughout
 * the codebase when working with:
 * - Complex join queries with custom select strings
 * - RPC (remote procedure) calls with typed arguments/returns
 * - Typed query result wrappers
 *
 * @module lib/types/supabase-query
 */

import type {
  PostgrestError,
} from "@supabase/postgrest-js";

import type {
  QueryResult,
  QueryData,
  QueryError,
} from "@supabase/supabase-js";

import type { Database } from "../supabase/types";

// ---------------------------------------------------------------------------
// Core type re-exports
// ---------------------------------------------------------------------------

export type { QueryResult, QueryData, QueryError };

// ---------------------------------------------------------------------------
// PostgrestBuilder type (inlined — avoids importing ClientServerOptions
// which is not re-exported from @supabase/supabase-js in older versions)
//
// PostgrestBuilder<ClientOptions, Schema, Row, Result, RelationName,
//                  Relationships, Method>
//
// We use `unknown` for ClientOptions / Schema / Row / RelationName /
// Relationships / Method so that the type only constrains the `Result`
// (the resolved data shape). This matches the actual usage pattern in the
// codebase where the goal is to type the query result, not to carry
// full row-level inference through the filter chain.
// ---------------------------------------------------------------------------

/**
 * A Postgrest builder whose resolved data type is `T`.
 *
 * Used as the target of `as` casts for:
 * - Complex join queries where Supabase cannot infer the result shape
 * - RPC calls where the function is not in the Database types
 *
 * @example
 * ```ts
 * // Replace `as any` in complex join queries:
 * const { data } = await (
 *   supabase
 *     .from("businesses")
 *     .select(`*, user:users!businesses_user_id_fkey (id, full_name, email)`)
 * ) as TypedBuilder<BusinessWithUser[]>;
 * ```
 */
export type TypedBuilder<T> = {
  then<TResult1 = T | null, TResult2 = PostgrestError | null>(
    onfulfilled?: ((value: T | null) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
  abortSignal: AbortSignal | undefined;
  readonly method: "GET" | "HEAD" | "POST" | "PATCH" | "DELETE";
  readonly path: string;
  eq(column: string, value: unknown): TypedBuilder<T>;
  neq(column: string, value: unknown): TypedBuilder<T>;
  gt(column: string, value: unknown): TypedBuilder<T>;
  gte(column: string, value: unknown): TypedBuilder<T>;
  lt(column: string, value: unknown): TypedBuilder<T>;
  lte(column: string, value: unknown): TypedBuilder<T>;
  like(column: string, value: string): TypedBuilder<T>;
  ilike(column: string, value: string): TypedBuilder<T>;
  is(column: string, value: unknown): TypedBuilder<T>;
  in(column: string, value: unknown[]): TypedBuilder<T>;
  not(column: string, operator: string, value: unknown): TypedBuilder<T>;
  or(filters: string): TypedBuilder<T>;
  filter(column: string, operator: string, value: unknown): TypedBuilder<T>;
  match(filters: Record<string, unknown>): TypedBuilder<T>;
  order(column: string, options?: { ascending?: boolean; nulls?: "first" | "last" }): TypedBuilder<T>;
  range(offset: number, end?: number): TypedBuilder<T>;
  single(): TypedBuilder<T>;
  maybeSingle(): TypedBuilder<T>;
  limit(count: number, options?: { head?: boolean; tail?: boolean }): TypedBuilder<T>;
  select(
    columns?: string,
  ): TypedBuilder<T>;
  insert(values: unknown, options?: { count?: "exact" | "planned" | "estimated" }): TypedBuilder<T>;
  update(values: unknown, options?: { count?: "exact" | "planned" | "estimated" }): TypedBuilder<T>;
  upsert(values: unknown, options?: { onConflict?: string; count?: "exact" | "planned" | "estimated"; ignoreDuplicates?: boolean }): TypedBuilder<T>;
  delete(options?: { count?: "exact" | "planned" | "estimated" }): TypedBuilder<T>;
};

// ---------------------------------------------------------------------------
// SupabaseRpcResult
// ---------------------------------------------------------------------------

/**
 * Typed result of a Supabase RPC call.
 *
 * Cast the result of `supabase.rpc(fnName, args)` with `as TypedRpcResult<T>`
 * so that the resolved `data` field carries a concrete type rather than
 * `unknown` or `any`.
 *
 * @example
 * ```ts
 * import type { TypedRpcResult } from "lib/types/supabase-query";
 *
 * const { data } = await (supabase.rpc(
 *   "calculate_days_worked",
 *   { p_business_id: businessId, p_worker_id: workerId, p_month: month },
 * ) as TypedRpcResult<{ calculate_days_worked: number | null }>);
 * ```
 */
export type TypedRpcResult<T> = TypedBuilder<T>;

// ---------------------------------------------------------------------------
// SupabaseQueryResult
// ---------------------------------------------------------------------------

/**
 * Typed result of a Supabase table query.
 *
 * Replaces `Promise<any>` return types on query helper functions with a
 * properly typed result that includes `data` and `error`.
 *
 * @example
 * ```ts
 * import type { SupabaseQueryResult } from "lib/types/supabase-query";
 *
 * async function getJobs(): Promise<SupabaseQueryResult<JobRow[]>> {
 *   const { data, error } = await supabase.from("jobs").select("*");
 *   if (error) throw error;
 *   return { data, error };
 * }
 * ```
 */
export type SupabaseQueryResult<T> = {
  data: T | null;
  error: QueryError | null;
};

// ---------------------------------------------------------------------------
// Table row / insert / update helpers
// ---------------------------------------------------------------------------

/**
 * Extract the `Row` type for a given table name from the Database schema.
 *
 * @example
 * ```ts
 * type BusinessRow = TableRow<"businesses">;
 * ```
 */
export type TableRow<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Row"];

/**
 * Extract the `Insert` type for a given table name from the Database schema.
 */
export type TableInsert<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Insert"];

/**
 * Extract the `Update` type for a given table name from the Database schema.
 */
export type TableUpdate<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Update"];

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Cast a Supabase query builder's select result to a typed result.
 *
 * This replaces the common `select(...) as any` pattern for complex join
 * queries where Supabase's type inference cannot determine the resulting shape.
 *
 * Usage:
 * ```ts
 * import { typedSelect } from "lib/types/supabase-query";
 *
 * const { data } = await typedSelect<BusinessWithUser>(
 *   supabase.from("businesses").select(`*, user:users!fk (id, full_name)`),
 * );
 * ```
 *
 * @param query - A Postgrest query builder that has been typed with a custom select
 * @returns The same builder, typed with the provided result type
 */
export function typedSelect<T>(query: TypedBuilder<T>): TypedBuilder<T>;
export function typedSelect<T>(query: unknown): TypedBuilder<T>;
export function typedSelect<T>(query: unknown): TypedBuilder<T> {
  return query as TypedBuilder<T>;
}
