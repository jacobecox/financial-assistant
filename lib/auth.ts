import { auth as clerkAuth } from "@clerk/nextjs/server";

export async function auth() {
  if (process.env.NODE_ENV === "development") {
    return { userId: process.env.DEV_USER_ID ?? "dev_user" };
  }
  return clerkAuth();
}
