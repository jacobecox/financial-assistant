import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Products, CountryCode } from "plaid";
import { plaidClient } from "@/lib/plaid";
import { getHouseholdId } from "@/lib/household";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "No household" }, { status: 400 });

  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "PayClarity",
    products: [Products.Transactions, Products.Investments],
    country_codes: [CountryCode.Us],
    language: "en",
    ...(process.env.PLAID_ENV === "production" && process.env.PLAID_REDIRECT_URI
      ? { redirect_uri: process.env.PLAID_REDIRECT_URI }
      : {}),
  });

  return NextResponse.json({ link_token: response.data.link_token });
}
