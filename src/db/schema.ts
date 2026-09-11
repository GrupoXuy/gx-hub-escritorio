import { pgTable, text, boolean, timestamp, integer, real, jsonb, serial } from "drizzle-orm/pg-core";

export const users = pgTable("gx_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default("Membro do ecossistema"),
  company: text("company").notNull().default("Grupo X"),
  avatar: text("avatar").notNull().default(""),
  color: text("color").notNull().default("#c7a66e"),
  avatarLook: text("avatar_look").notNull().default(""),
  roomId: text("room_id").notNull().default("recepcao"),
  status: text("status").notNull().default("available"),
  x: real("x").notNull().default(61),
  y: real("y").notNull().default(73),
  isDemo: boolean("is_demo").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  canAccessGroupSystem: boolean("can_access_group_system").notNull().default(false),
  isGuest: boolean("is_guest").notNull().default(false),
  guestInviteId: text("guest_invite_id"),
  guestExpiresAt: timestamp("guest_expires_at", { withTimezone: true }),
  gender: text("gender"),
  email: text("email"),
  passwordHash: text("password_hash"),
  accessToken: text("access_token"),
  action: text("action").notNull().default("idle"),
  direction: text("direction").notNull().default("dr"),
  sittingOn: text("sitting_on"),
  handRaised: boolean("hand_raised").notNull().default(false),
  callRoom: text("call_room"),
  micEnabled: boolean("mic_enabled").notNull().default(false),
  cameraEnabled: boolean("camera_enabled").notNull().default(false),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
});

export const rooms = pgTable("gx_rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  kind: text("kind").notNull(),
  capacity: integer("capacity").notNull().default(8),
  color: text("color").notNull(),
});

export const messages = pgTable("gx_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  senderId: text("sender_id").notNull().references(() => users.id),
  roomId: text("room_id").notNull().default("geral"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const meetings = pgTable("gx_meetings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  roomId: text("room_id").notNull().references(() => rooms.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  duration: integer("duration").notNull().default(30),
  organizerId: text("organizer_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const signals = pgTable("gx_signals", {
  id: serial("id").primaryKey(),
  fromId: text("from_id").notNull(),
  toId: text("to_id").notNull(),
  roomId: text("room_id").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invitations = pgTable("gx_invitations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdBy: text("created_by").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientInvites = pgTable("gx_client_invites", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdBy: text("created_by").notNull().references(() => users.id),
  meetingId: text("meeting_id").notNull().references(() => meetings.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  guestUserId: text("guest_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leads = pgTable("gx_leads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  gender: text("gender").notNull(),
  whatsapp: text("whatsapp").notNull(),
  email: text("email").notNull(),
  clientInviteId: text("client_invite_id").notNull().references(() => clientInvites.id),
  meetingId: text("meeting_id").notNull().references(() => meetings.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
