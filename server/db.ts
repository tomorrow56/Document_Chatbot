import path from "node:path";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { InsertUser, users, documents, InsertDocument, Document, conversations, InsertConversation, Conversation, messages, InsertMessage, Message, workspaces, InsertWorkspace, Workspace } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db) {
    try {
      const databasePath = ENV.databaseUrl || path.join(process.cwd(), "local.sqlite");
      const sqlite = new Database(databasePath);
      _db = drizzle(sqlite);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Document helpers
export async function createDocument(doc: InsertDocument): Promise<Document> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(documents).values(doc);
  const result = await db.select().from(documents).where(eq(documents.id, doc.id)).limit(1);
  return result[0];
}

export async function getUserDocuments(userId: number): Promise<Document[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt));
}

export async function getWorkspaceDocuments(workspaceId: string): Promise<Document[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(documents).where(eq(documents.workspaceId, workspaceId)).orderBy(desc(documents.createdAt));
}

export async function getDocument(id: string): Promise<Document | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result[0];
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(documents).where(eq(documents.id, id));
}

// Conversation helpers
export async function createConversation(conv: InsertConversation): Promise<Conversation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(conversations).values(conv);
  const result = await db.select().from(conversations).where(eq(conversations.id, conv.id)).limit(1);
  return result[0];
}

export async function getUserConversations(userId: number): Promise<Conversation[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.updatedAt));
}

export async function getWorkspaceConversations(workspaceId: string): Promise<Conversation[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(conversations).where(eq(conversations.workspaceId, workspaceId)).orderBy(desc(conversations.updatedAt));
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return result[0];
}

export async function updateConversation(id: string, updates: Partial<InsertConversation>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(conversations).set({ ...updates, updatedAt: new Date() }).where(eq(conversations.id, id));
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete all messages in the conversation first
  await db.delete(messages).where(eq(messages.conversationId, id));
  // Then delete the conversation
  await db.delete(conversations).where(eq(conversations.id, id));
}

// Message helpers
export async function createMessage(msg: InsertMessage): Promise<Message> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(messages).values(msg);
  const result = await db.select().from(messages).where(eq(messages.id, msg.id)).limit(1);
  return result[0];
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
}

// Workspace helpers
export async function createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(workspaces).values(workspace);
  const result = await db.select().from(workspaces).where(eq(workspaces.id, workspace.id)).limit(1);
  return result[0];
}

export async function getUserWorkspaces(userId: number): Promise<Workspace[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(workspaces).where(eq(workspaces.userId, userId)).orderBy(desc(workspaces.updatedAt));
}

export async function getWorkspace(id: string): Promise<Workspace | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  return result[0];
}

export async function updateWorkspace(id: string, updates: Partial<InsertWorkspace>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(workspaces).set({ ...updates, updatedAt: new Date() }).where(eq(workspaces.id, id));
}

export async function deleteWorkspace(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete all documents in the workspace
  await db.delete(documents).where(eq(documents.workspaceId, id));
  
  // Delete all conversations and their messages in the workspace
  const convs = await db.select().from(conversations).where(eq(conversations.workspaceId, id));
  for (const conv of convs) {
    await db.delete(messages).where(eq(messages.conversationId, conv.id));
  }
  await db.delete(conversations).where(eq(conversations.workspaceId, id));
  
  // Finally delete the workspace
  await db.delete(workspaces).where(eq(workspaces.id, id));
}

