import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { financialTools, executeTool } from "@/lib/ai-tools";
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

When asked about savings per paycheck, always call suggest_savings_transfer — it runs this exact math and returns a per-paycheck breakdown. Do not estimate or use a percentage heuristic.`;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { messages, selectedMonth }: { messages: ChatMessage[]; selectedMonth?: string } = await req.json();

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const stream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            system: buildSystemPrompt(selectedMonth),
            tools: financialTools,
            messages: anthropicMessages,
          });

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
                  userId
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
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
