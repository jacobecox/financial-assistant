import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { financialTools, executeTool } from "@/lib/ai-tools";
import type { ChatMessage } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a personal finance assistant for a couple managing their household budget.
You have access to tools to look up their bills, paychecks, and financial data.
Be concise and direct. Use dollar amounts with cents when relevant.
Today's date is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { messages }: { messages: ChatMessage[] } = await req.json();

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
            system: SYSTEM_PROMPT,
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
                ),
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
