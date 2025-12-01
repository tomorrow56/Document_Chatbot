import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createConversation,
  createDocument,
  createMessage,
  deleteConversation,
  deleteDocument,
  getConversation,
  getConversationMessages,
  getDocument,
  getUserConversations,
  getUserDocuments,
  updateConversation,
  createWorkspace,
  getUserWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceDocuments,
  getWorkspaceConversations,
} from "./db";
import { storagePut } from "./storage";
import { extractTextFromDocument, isSupportedDocument } from "./pdfUtils";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { invokeLLM } from "./_core/llm";
import { randomUUID } from "crypto";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return ctx.user;
      
      // Check if user has any workspaces
      const workspaces = await getUserWorkspaces(ctx.user.id);
      
      // Create default workspace if none exists
      if (workspaces.length === 0) {
        await createWorkspace({
          id: randomUUID(),
          userId: ctx.user.id,
          name: "デフォルトワークスペース",
          description: "自動的に作成されたワークスペース",
        });
      }
      
      return ctx.user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  workspaces: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserWorkspaces(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createWorkspace({
          id: randomUUID(),
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const workspace = await getWorkspace(input.id);
        if (!workspace || workspace.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await updateWorkspace(input.id, {
          name: input.name,
          description: input.description,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const workspace = await getWorkspace(input.id);
        if (!workspace || workspace.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await deleteWorkspace(input.id);
        return { success: true };
      }),
  }),

  documents: router({
    list: protectedProcedure
      .input(z.object({ workspaceId: z.string() }))
      .query(async ({ ctx, input }) => {
        const workspace = await getWorkspace(input.workspaceId);
        if (!workspace || workspace.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return getWorkspaceDocuments(input.workspaceId);
      }),

    upload: protectedProcedure
      .input(
        z.object({
          workspaceId: z.string(),
          name: z.string(),
          content: z.string(),
          fileData: z.string().optional(), // base64 encoded file data
          mimeType: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        console.log(`[DEBUG] === Document upload started ===`);
        console.log(`[DEBUG] Document name: ${input.name}`);
        console.log(`[DEBUG] Workspace ID: ${input.workspaceId}`);
        console.log(`[DEBUG] Has fileData: ${!!input.fileData}`);
        console.log(`[DEBUG] MimeType: ${input.mimeType}`);
        console.log(`[DEBUG] Content length: ${input.content.length}`);
        
        const docId = randomUUID();
        let fileUrl: string | undefined;
        let fileSize: number | undefined;
        let content = input.content;

        // Upload file to S3 if provided
        if (input.fileData && input.mimeType) {
          const buffer = Buffer.from(input.fileData, "base64");
          fileSize = buffer.length;
          const ext = input.mimeType.split("/")[1] || "bin";
          const result = await storagePut(
            `documents/${ctx.user.id}/${docId}.${ext}`,
            buffer,
            input.mimeType
          );
          fileUrl = result.url;

          // Extract text from document if it's a supported format (PDF, Word, Excel, PowerPoint, etc.)
          console.log(`[DEBUG] Checking if document is supported: ${input.name}`);
          console.log(`[DEBUG] isSupportedDocument result: ${isSupportedDocument(input.name)}`);
          
          if (isSupportedDocument(input.name)) {
            try {
              // Save document to temp file
              const tempDir = os.tmpdir();
              const fileExt = path.extname(input.name) || ".bin";
              const tempFilePath = path.join(tempDir, `${docId}${fileExt}`);
              console.log(`[DEBUG] Saving document to temp file: ${tempFilePath}`);
              await fs.writeFile(tempFilePath, buffer);
              console.log(`[DEBUG] Temp file saved, size: ${buffer.length} bytes`);

              // Extract text from document using MarkItDown
              console.log(`[DEBUG] Starting text extraction...`);
              const extractedText = await extractTextFromDocument(tempFilePath);
              console.log(`[DEBUG] Text extraction successful, length: ${extractedText.length} characters`);
              console.log(`[DEBUG] First 200 chars: ${extractedText.substring(0, 200)}`);
              content = extractedText;

              // Clean up temp file
              await fs.unlink(tempFilePath).catch(() => {});
              console.log(`[DEBUG] Temp file cleaned up`);
            } catch (error) {
              console.error("[ERROR] Document extraction error:", error);
              console.error("[ERROR] Error details:", error instanceof Error ? error.message : String(error));
              console.error("[ERROR] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
              // If extraction fails, use original content
            }
          } else {
            console.log(`[DEBUG] Document format not supported for extraction, using original content`);
          }
        }

        const workspace = await getWorkspace(input.workspaceId);
        if (!workspace || workspace.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return createDocument({
          id: docId,
          userId: ctx.user.id,
          workspaceId: input.workspaceId,
          name: input.name,
          content,
          fileUrl,
          mimeType: input.mimeType,
          fileSize,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const doc = await getDocument(input.id);
        if (!doc || doc.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await deleteDocument(input.id);
        return { success: true };
      }),
  }),

  conversations: router({
    list: protectedProcedure
      .input(z.object({ workspaceId: z.string() }))
      .query(async ({ ctx, input }) => {
        const workspace = await getWorkspace(input.workspaceId);
        if (!workspace || workspace.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return getWorkspaceConversations(input.workspaceId);
      }),

    create: protectedProcedure
      .input(z.object({ workspaceId: z.string(), title: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const workspace = await getWorkspace(input.workspaceId);
        if (!workspace || workspace.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return createConversation({
          id: randomUUID(),
          userId: ctx.user.id,
          workspaceId: input.workspaceId,
          title: input.title,
        });
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const conv = await getConversation(input.id);
        if (!conv || conv.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return conv;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const conv = await getConversation(input.id);
        if (!conv || conv.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await deleteConversation(input.id);
        return { success: true };
      }),
  }),

  messages: router({
    list: protectedProcedure
      .input(z.object({ conversationId: z.string() }))
      .query(async ({ ctx, input }) => {
        const conv = await getConversation(input.conversationId);
        if (!conv || conv.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return getConversationMessages(input.conversationId);
      }),

    send: protectedProcedure
      .input(
        z.object({
          conversationId: z.string(),
          content: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const conv = await getConversation(input.conversationId);
        if (!conv || conv.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Save user message
        const userMessage = await createMessage({
          id: randomUUID(),
          conversationId: input.conversationId,
          role: "user",
          content: input.content,
        });

        // Get documents from the conversation's workspace for context
        const docs = await getWorkspaceDocuments(conv.workspaceId);
        const context = docs.map(d => `Document: ${d.name}\n${d.content}`).join("\n\n---\n\n");

        // Get conversation history
        const history = await getConversationMessages(input.conversationId);
        const messages = history.slice(-10).map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        // Call LLM with context
        const systemPrompt = `You are a helpful assistant that answers questions based on the provided documents. Use the following documents as context to answer the user's questions. If the answer cannot be found in the documents, say so.

Documents:
${context}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            { role: "user", content: input.content },
          ],
        });

        const assistantContent = typeof response.choices[0].message.content === "string" 
          ? response.choices[0].message.content 
          : "I apologize, but I couldn't generate a response.";

        // Save assistant message
        const assistantMessage = await createMessage({
          id: randomUUID(),
          conversationId: input.conversationId,
          role: "assistant",
          content: assistantContent,
        });

        // Update conversation timestamp
        await updateConversation(input.conversationId, {});

        return {
          userMessage,
          assistantMessage,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;

