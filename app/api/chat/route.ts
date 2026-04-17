import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { financialTools, executeTool } from "@/lib/ai-tools";
import { getHouseholdId } from "@/lib/household";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ChatMessage } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(selectedMonth?: string) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const monthContext = selectedMonth ? `\nThe user is currently viewing: ${selectedMonth}.` : "";
  return `You are a personal finance assistant for a couple managing their household budget.
You have access to tools to look up their bills, paychecks, and financial data.
Be concise and direct. Use dollar amounts with cents when relevant.
Today's date is ${today}.${monthContext}

## How savings are calculated
The formula for max savings per paycheck is:
  max_savings = paycheck_amount - bills_due_in_window - buffer_reserved

- "buffer" = the user's discretionary/buffer items (from get_buffer_summary). These are amounts intentionally kept liquid each pay period, NOT transferred to savings.
- "bills_due_in_window" = bills due on or after this paycheck date and before the next paycheck date. A bill due on the same day as a paycheck is paid from that paycheck, not the previous one.
- Planned one-time expenses reduce savings for that month but are spread across both paychecks.

When asked about savings per paycheck, always call suggest_savings_transfer — it runs this exact math and returns a per-paycheck breakdown. Do not estimate or use a percentage heuristic.

## Income sources
Always include ALL income when calculating savings — both regular paychecks and side income (freelance, gigs, one-time payments). The suggest_savings_transfer tool returns a side_income array and total_side_income for the month. Add this to the paycheck savings totals unless the user explicitly asks to exclude it.

## Linked accounts
The user may have bank and investment accounts linked via Plaid. Use get_account_balances when they ask about their net worth, account balances, savings account totals, investment balances, or anything related to what they have in their accounts. If no accounts are linked the tool will say so — do not guess balances.`;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return new Response("No household", { status: 404 });

  const rateLimit = await checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: "rate_limited",
        message: `You've used all ${rateLimit.limit} AI messages for today. Your limit resets at ${rateLimit.resetAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}.`,
        resetAt: rateLimit.resetAt.toISOString(),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
        },
      }
    );
  }

  const { messages, selectedMonth }: { messages: ChatMessage[]; selectedMonth?: string } = await req.json();

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();

  // Abort the entire stream if it takes longer than 90 seconds
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 90_000);

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const MAX_TOOL_LOOPS = 10;
        let loops = 0;

        while (loops < MAX_TOOL_LOOPS) {
          loops++;

          const stream = anthropic.messages.stream(
            {
              model: "claude-sonnet-4-6",
              max_tokens: 4096,
              system: buildSystemPrompt(selectedMonth),
              tools: financialTools,
              messages: anthropicMessages,
            },
            { signal: abort.signal }
          );

          // Forward text chunks to the client in real-time.
          // Tool-use responses produce no text, so this is safe to stream unconditionally.
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }

          const finalMessage = await stream.finalMessage();

          if (finalMessage.stop_reason === "tool_use") {
            // Execute tools silently, then loop for the next response
            const toolUseBlocks = finalMessage.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
            );
            const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
              toolUseBlocks.map(async (block) => ({
                type: "tool_result" as const,
                tool_use_id: block.id,
                content: await executeTool(
                  block.name,
                  block.input as Record<string, unknown>,
                  householdId
                ).catch((e) => {
                  console.error(`[chat] tool "${block.name}" threw:`, e);
                  return JSON.stringify({ error: String(e) });
                }),
              }))
            );
            anthropicMessages.push({ role: "assistant", content: finalMessage.content });
            anthropicMessages.push({ role: "user", content: toolResults });
          } else {
            break;
          }
        }
      } catch (err) {
        const message = abort.signal.aborted
          ? "\n\n_Response timed out. Please try again._"
          : "\n\n_Something went wrong. Please try again._";
        controller.enqueue(encoder.encode(message));
      } finally {
        clearTimeout(timeout);
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Prevent reverse proxies (nginx, CDN) from buffering the stream
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
