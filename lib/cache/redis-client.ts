/**
 * Redis Client for Upstash Redis
 *
 * This module provides a Redis client using Upstash REST API.
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
 */

import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;

/**
 * Get or create the Redis client instance.
 * Returns null if environment variables are not configured.
 */
export function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return redisClient;
}

/**
 * Check if Redis is available and configured.
 */
export function isRedisAvailable(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}
