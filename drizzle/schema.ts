import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestampColumn = (name: string) =>
  integer(name, { mode: "timestamp" }).notNull().$defaultFn(() => new Date());

/**
 * Core user table backing auth flow.
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: timestampColumn("createdAt"),
  updatedAt: timestampColumn("updatedAt"),
  lastSignedIn: timestampColumn("lastSignedIn"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Workspaces table for organizing documents and conversations
 */
export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestampColumn("createdAt"),
  updatedAt: timestampColumn("updatedAt"),
});

export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = typeof workspaces.$inferInsert;

/**
 * Documents table for storing uploaded files
 */
export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  userId: integer("userId").notNull(),
  workspaceId: text("workspaceId").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  fileUrl: text("fileUrl"),
  mimeType: text("mimeType"),
  fileSize: integer("fileSize"),
  createdAt: timestampColumn("createdAt"),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Chat conversations table
 */
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  userId: integer("userId").notNull(),
  workspaceId: text("workspaceId").notNull(),
  title: text("title").notNull(),
  createdAt: timestampColumn("createdAt"),
  updatedAt: timestampColumn("updatedAt"),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Chat messages table
 */
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversationId").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestampColumn("createdAt"),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

