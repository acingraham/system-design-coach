import { getProblem } from "../lib/problems";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

type TestCase = {
  label: string;
  step: string;
  problemId: string;
  answer: string;
  includeConstraints: boolean;
  expectedRange: [number, number];
};

type StructuredFeedback = {
  score: number;
  summary: string;
  positives: string[];
  suggestions: string[];
};

type TestResult = {
  label: string;
  expectedRange: [number, number];
  passed: boolean;
  feedback?: StructuredFeedback;
  error?: string;
};

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

const TEST_CASES: TestCase[] = [
  // ==========================================================================
  // URL Shortener
  // ==========================================================================

  // === URL Shortener — Step 1A (Functional Requirements) ===
  {
    label: "URL Shortener 1A — excellent (core + extras + scoping)",
    step: "1A",
    problemId: "url-shortener",
    includeConstraints: false,
    expectedRange: [3, 4],
    answer: `1. Users should be able to submit a long URL and receive a shortened version.
   - Optionally, users can provide a custom alias.
   - Optionally, users can set an expiration date.
2. Users should be able to access the original URL by clicking the shortened link.

Out of scope:
- User authentication
- Click analytics`,
  },
  {
    label: "URL Shortener 1A — minimal correct (two terse lines)",
    step: "1A",
    problemId: "url-shortener",
    includeConstraints: false,
    expectedRange: [3, 4],
    answer: `Users can shorten URLs
Users can click short links to go to the original page`,
  },
  {
    label: "URL Shortener 1A — bad (implementation-focused)",
    step: "1A",
    problemId: "url-shortener",
    includeConstraints: false,
    expectedRange: [1, 2],
    answer: `The system should store URLs in a database and have a web interface`,
  },
  {
    label: "URL Shortener 1A — many extras (7 requirements)",
    step: "1A",
    problemId: "url-shortener",
    includeConstraints: false,
    expectedRange: [3, 4],
    answer: `1. Users can submit a long URL and get a shortened version back
2. Users can visit the short URL and be redirected to the original
3. Users can view analytics on how many times their link was clicked
4. Users can create an account to manage their links
5. Users can set expiration dates on links
6. Users can create custom aliases for their short URLs
7. Links should be shareable on social media with preview cards`,
  },
  {
    label: "URL Shortener 1A — half missing (only creation)",
    step: "1A",
    problemId: "url-shortener",
    includeConstraints: false,
    expectedRange: [1, 2],
    answer: `- Users can shorten a URL`,
  },
  {
    label: "URL Shortener 1A — wrong abstraction level (API details)",
    step: "1A",
    problemId: "url-shortener",
    includeConstraints: false,
    expectedRange: [1, 2],
    answer: `POST /api/shorten takes a URL and returns a short code stored in PostgreSQL.
GET /api/:code does a 302 redirect by looking up the code in a hash table.
We should use Redis for caching the most popular links.`,
  },
  {
    label: "URL Shortener 1A — gibberish",
    step: "1A",
    problemId: "url-shortener",
    includeConstraints: false,
    expectedRange: [1, 1],
    answer: `asdf`,
  },

  // === URL Shortener — Step 1B (Scale Question) ===
  {
    label: "URL Shortener 1B — good specific question",
    step: "1B",
    problemId: "url-shortener",
    includeConstraints: false,
    expectedRange: [3, 4],
    answer: `How many daily active users should we support, and how many total shortened URLs do we expect to store?`,
  },
  {
    label: "URL Shortener 1B — domain-specific (urls)",
    step: "1B",
    problemId: "url-shortener",
    includeConstraints: false,
    expectedRange: [2, 4],
    answer: `How many urls do we need to support?`,
  },
  {
    label: "URL Shortener 1B — derived metric (RPS)",
    step: "1B",
    problemId: "url-shortener",
    includeConstraints: false,
    expectedRange: [2, 3],
    answer: `How many requests per second do we need to support?`,
  },
  {
    label: "URL Shortener 1B — vague question",
    step: "1B",
    problemId: "url-shortener",
    includeConstraints: false,
    expectedRange: [1, 2],
    answer: `How big should this system be?`,
  },
  {
    label: "URL Shortener 1B — irrelevant question",
    step: "1B",
    problemId: "url-shortener",
    includeConstraints: false,
    expectedRange: [1, 1],
    answer: `What programming language should we use?`,
  },

  // === URL Shortener — Step 1C (Nonfunctional Requirements) ===
  {
    label: "URL Shortener 1C — excellent (all reference points)",
    step: "1C",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [3, 4],
    answer: `1. Uniqueness — each short code maps to exactly one long URL
2. Low latency redirection (< 100ms p99)
3. High availability — 99.99% uptime, prioritize availability over consistency
4. Read-to-write ratio is ~1000:1 — 100M DAU accessing URLs daily vs ~100M new links/month means reads vastly outweigh writes. This should heavily influence caching strategy.`,
  },
  {
    label: "URL Shortener 1C — vague (no quantification)",
    step: "1C",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [1, 2],
    answer: `- Low latency
- High availability
- Should be consistent`,
  },
  {
    label: "URL Shortener 1C — bad (one-liner)",
    step: "1C",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [1, 1],
    answer: `The system needs to be fast and reliable.`,
  },
  {
    label: "URL Shortener 1C — extras (durability, security, burst)",
    step: "1C",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [3, 4],
    answer: `1. Uniqueness — short codes must be unique
2. Low latency < 100ms
3. High availability 99.99%
4. Read-heavy (1000:1 ratio) — derived from 100M DAU vs 100M new links/month
5. Data should be durable — we can never lose a URL mapping once created
6. Short codes should be unpredictable for security (no sequential IDs)
7. System should handle burst traffic gracefully (viral links)`,
  },
  {
    label: "URL Shortener 1C — missing read-write ratio",
    step: "1C",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [2, 3],
    answer: `1. Uniqueness — each short code maps to one URL
2. Low latency < 100ms for redirects
3. High availability — 99.99%`,
  },
  {
    label: "URL Shortener 1C — consistency misconception",
    step: "1C",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [1, 2],
    answer: `1. Strong consistency — every short URL must resolve to the exact same long URL everywhere at all times
2. Low latency < 100ms
3. We should prioritize consistency over availability because data integrity is critical`,
  },

  // === URL Shortener — Step 2 (Core Entities) ===
  {
    label: "URL Shortener 2 — good (merged URL entity + User)",
    step: "2",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [3, 4],
    answer: `1. URL — stores the mapping: id, short_code, original_url, created_at, expires_at, user_id
2. User — who created the link: id, email, name`,
  },
  {
    label: "URL Shortener 2 — excellent (all 3 reference entities)",
    step: "2",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [3, 4],
    answer: `1. Original URL — the long URL
2. Short URL — the shortened version with code, reference to original, optional alias, expiration
3. User — who created it`,
  },
  {
    label: "URL Shortener 2 — over-engineered (full DDL schema)",
    step: "2",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [2, 4],
    answer: `1. URL: id (bigint), short_code (varchar(10) UNIQUE NOT NULL), original_url (text NOT NULL), custom_alias (varchar(50) NULLABLE), created_at (timestamp), updated_at (timestamp), expires_at (timestamp NULLABLE), user_id (bigint FK), click_count (int DEFAULT 0), is_active (boolean DEFAULT true)
2. User: id (bigint), email (varchar(255) UNIQUE), password_hash (varchar(255)), name (varchar(100)), created_at (timestamp), last_login (timestamp)
3. Click: id (bigint), url_id (bigint FK), ip_address (varchar(45)), user_agent (text), referrer (text), country (varchar(2)), clicked_at (timestamp)
4. ApiKey: id (bigint), user_id (bigint FK), key_hash (varchar(255)), created_at (timestamp), expires_at (timestamp)`,
  },
  {
    label: "URL Shortener 2 — bad (too terse)",
    step: "2",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [1, 2],
    answer: `URLs and users`,
  },

  // === URL Shortener — Step 3 (API Design) ===
  {
    label: "URL Shortener 3 — excellent (all reference points)",
    step: "3",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [3, 4],
    answer: `POST /urls
{ "long_url": "https://example.com/long", "custom_alias": "optional", "expiration_date": "optional" }
→ { "short_url": "http://short.ly/abc123" }

GET /{short_code}
→ HTTP 302 Redirect to original URL

Notes: Use 302 (not 301) so we maintain control over link expiration and updates. User identity comes from JWT in auth header, not the request body.`,
  },
  {
    label: "URL Shortener 3 — non-RESTful (verbs in URLs)",
    step: "3",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [1, 3],
    answer: `POST /shorten
{ url: "https://example.com" }
→ { short_url: "http://short.ly/abc" }

GET /redirect?code=abc
→ redirect to original URL`,
  },
  {
    label: "URL Shortener 3 — function-style (no HTTP)",
    step: "3",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [1, 2],
    answer: `createShortUrl(longUrl) -> shortUrl
getOriginalUrl(shortCode) -> originalUrl`,
  },
  {
    label: "URL Shortener 3 — minimal correct",
    step: "3",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [2, 3],
    answer: `POST /urls { long_url } → { short_url }

GET /{short_code} → 302 redirect`,
  },
  {
    label: "URL Shortener 3 — extras (DELETE, stats, rate limiting)",
    step: "3",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [3, 4],
    answer: `POST /urls
{ "long_url": "...", "custom_alias": "optional", "expiration": "optional" }
→ 201 Created { "short_url": "http://short.ly/abc" }

GET /{short_code}
→ 302 Redirect

DELETE /urls/{short_code}
→ 204 No Content

GET /urls/{short_code}/stats
→ { clicks: 1234, created_at: "...", last_accessed: "..." }

Notes:
- 302 not 301 to maintain control
- Auth via Bearer token in Authorization header
- Rate limiting on POST to prevent abuse`,
  },
  {
    label: "URL Shortener 3 — 301 misconception",
    step: "3",
    problemId: "url-shortener",
    includeConstraints: true,
    expectedRange: [1, 3],
    answer: `POST /urls { long_url } → { short_url }

GET /{short_code} → HTTP 301 Permanent Redirect to original URL

I chose 301 because it's cached by the browser so subsequent visits don't hit our server, reducing load.`,
  },

  // ==========================================================================
  // Chat App
  // ==========================================================================

  // === Chat App — Step 1A (Functional Requirements) ===
  {
    label: "Chat App 1A — excellent (all 4 core reqs)",
    step: "1A",
    problemId: "chat-app",
    includeConstraints: false,
    expectedRange: [3, 4],
    answer: `1. Users should be able to start group chats with multiple participants (up to 100)
2. Users should be able to send and receive messages in real time
3. Users should receive messages sent while they were offline (up to 30 days)
4. Users should be able to send and receive media (images, videos) in messages`,
  },
  {
    label: "Chat App 1A — mediocre (missing offline + media)",
    step: "1A",
    problemId: "chat-app",
    includeConstraints: false,
    expectedRange: [1, 2],
    answer: `1. Users can send messages to other users
2. Users can create group chats`,
  },
  {
    label: "Chat App 1A — bad (too vague)",
    step: "1A",
    problemId: "chat-app",
    includeConstraints: false,
    expectedRange: [1, 1],
    answer: `The system should let people chat with each other`,
  },

  // === Chat App — Step 1B (Scale Question) ===
  {
    label: "Chat App 1B — good specific question",
    step: "1B",
    problemId: "chat-app",
    includeConstraints: false,
    expectedRange: [3, 4],
    answer: `How many total users should we support, and how many do we expect to be connected simultaneously at peak?`,
  },
  {
    label: "Chat App 1B — vague question",
    step: "1B",
    problemId: "chat-app",
    includeConstraints: false,
    expectedRange: [1, 3],
    answer: `How many users will use this app?`,
  },

  // === Chat App — Step 1C (Nonfunctional Requirements) ===
  {
    label: "Chat App 1C — excellent (all reference points)",
    step: "1C",
    problemId: "chat-app",
    includeConstraints: true,
    expectedRange: [3, 4],
    answer: `1. Messages should be delivered to available users with low latency (< 500ms)
2. Guaranteed message delivery — messages must eventually reach the recipient even if offline
3. System must handle billions of users with ~40K messages/sec throughput
4. Messages stored on centralized servers no longer than necessary (privacy)
5. System should be resilient against individual component failures`,
  },
  {
    label: "Chat App 1C — missing delivery guarantee + privacy",
    step: "1C",
    problemId: "chat-app",
    includeConstraints: true,
    expectedRange: [1, 2],
    answer: `1. Low latency message delivery < 500ms
2. High availability`,
  },

  // === Chat App — Step 2 (Core Entities) ===
  {
    label: "Chat App 2 — excellent (all 4 entities incl. Clients)",
    step: "2",
    problemId: "chat-app",
    includeConstraints: true,
    expectedRange: [3, 4],
    answer: `1. Users — represents a person using the system
2. Chats — a conversation between 2-100 users
3. Messages — the content sent within a chat (text, media references)
4. Clients — a user might have multiple devices (phone, desktop, tablet)`,
  },
  {
    label: "Chat App 2 — missing Clients entity",
    step: "2",
    problemId: "chat-app",
    includeConstraints: true,
    expectedRange: [2, 3],
    answer: `1. User — a person
2. Chat — a conversation
3. Message — content in a chat`,
  },

  // === Chat App — Step 3 (API Design) ===
  {
    label: "Chat App 3 — excellent (WebSocket + ack)",
    step: "3",
    problemId: "chat-app",
    includeConstraints: true,
    expectedRange: [3, 4],
    answer: `WebSocket-based API (bidirectional):

Client → Server:
createChat: { participants[], name } → { chatId }
sendMessage: { chatId, message, attachments } → { status, messageId }
createAttachment: { body, hash } → { attachmentId }
modifyChatParticipants: { chatId, userId, op: ADD|REMOVE } → { status }

Server → Client:
newMessage: { chatId, userId, message, attachments } → client sends ack
chatUpdate: { chatId, participants[] } → client sends ack

Notes: WebSockets over TLS. Client ack is crucial for delivery guarantees.`,
  },
  {
    label: "Chat App 3 — REST instead of WebSocket",
    step: "3",
    problemId: "chat-app",
    includeConstraints: true,
    expectedRange: [1, 2],
    answer: `POST /chats { participants, name } → { chatId }
POST /chats/:chatId/messages { content } → { messageId }
GET /chats/:chatId/messages?since=timestamp → { messages[] }
DELETE /chats/:chatId/participants/:userId → 200 OK`,
  },
  {
    label: "Chat App 3 — WebSocket but no ack",
    step: "3",
    problemId: "chat-app",
    includeConstraints: true,
    expectedRange: [2, 3],
    answer: `Using WebSockets for real-time messaging:

sendMessage(chatId, content) → messageId
createChat(participants) → chatId

Server pushes newMessage events to connected clients`,
  },

  // ==========================================================================
  // Twitter Feed
  // ==========================================================================

  // === Twitter Feed — Step 1A (Functional Requirements) ===
  {
    label: "Twitter Feed 1A — excellent (all 4 core reqs)",
    step: "1A",
    problemId: "twitter-feed",
    includeConstraints: false,
    expectedRange: [3, 4],
    answer: `1. Users should be able to create posts
2. Users should be able to follow other users (one-directional, not mutual)
3. Users should be able to view a feed of posts from people they follow, in reverse chronological order
4. Users should be able to page through their feed`,
  },
  {
    label: "Twitter Feed 1A — missing follow + pagination",
    step: "1A",
    problemId: "twitter-feed",
    includeConstraints: false,
    expectedRange: [1, 2],
    answer: `1. Users can post tweets
2. Users can see a feed of tweets`,
  },
  {
    label: "Twitter Feed 1A — wrong focus (likes, comments, DMs)",
    step: "1A",
    problemId: "twitter-feed",
    includeConstraints: false,
    expectedRange: [1, 1],
    answer: `1. Users can like posts
2. Users can comment on posts
3. Users can send direct messages
4. Users can report abusive content`,
  },

  // === Twitter Feed — Step 1B (Scale Question) ===
  {
    label: "Twitter Feed 1B — good specific question",
    step: "1B",
    problemId: "twitter-feed",
    includeConstraints: false,
    expectedRange: [3, 4],
    answer: `How many total users should we support, and what is the expected read-to-write ratio for posts and feed views?`,
  },

  // === Twitter Feed — Step 1C (Nonfunctional Requirements) ===
  {
    label: "Twitter Feed 1C — excellent (all reference points)",
    step: "1C",
    problemId: "twitter-feed",
    includeConstraints: true,
    expectedRange: [3, 4],
    answer: `1. Highly available — prioritize availability over consistency
2. Eventual consistency acceptable — posts visible in feeds within 1 minute
3. Low latency — posting and viewing feed < 500ms
4. 2B users at massive scale
5. Unlimited followers creates fan-out challenge for celebrity accounts
6. Read-to-write ratio is ~100:1, optimize heavily for reads`,
  },
  {
    label: "Twitter Feed 1C — consistency misconception + missing fan-out",
    step: "1C",
    problemId: "twitter-feed",
    includeConstraints: true,
    expectedRange: [1, 2],
    answer: `1. Low latency < 500ms for reads
2. High availability
3. Strong consistency — users should always see the latest posts`,
  },

  // === Twitter Feed — Step 2 (Core Entities) ===
  {
    label: "Twitter Feed 2 — excellent (User, Follow, Post)",
    step: "2",
    problemId: "twitter-feed",
    includeConstraints: true,
    expectedRange: [3, 4],
    answer: `1. User — person on the platform (id, username, bio)
2. Follow — uni-directional relationship: follower -> followee (followerId, followeeId)
3. Post — content created by a user (id, authorId, content, createdAt)`,
  },
  {
    label: "Twitter Feed 2 — missing Follow entity",
    step: "2",
    problemId: "twitter-feed",
    includeConstraints: true,
    expectedRange: [1, 2],
    answer: `1. User — has an id, name, bio
2. Post — has id, content, timestamp, author`,
  },
  {
    label: "Twitter Feed 2 — bidirectional follow mistake (Friendship)",
    step: "2",
    problemId: "twitter-feed",
    includeConstraints: true,
    expectedRange: [1, 3],
    answer: `1. User — id, name
2. Friendship — mutual relationship between two users (user1Id, user2Id)
3. Post — id, content, authorId, createdAt`,
  },

  // === Twitter Feed — Step 3 (API Design) ===
  {
    label: "Twitter Feed 3 — excellent (cursor pagination, PUT follow, JWT)",
    step: "3",
    problemId: "twitter-feed",
    includeConstraints: true,
    expectedRange: [3, 4],
    answer: `POST /posts { content } → { postId }

PUT /users/:id/follow → 200 OK (idempotent)
DELETE /users/:id/follow → 200 OK

GET /feed?pageSize=20&cursor=1234567890 → { items: Post[], nextCursor }

Notes: Cursor-based pagination using timestamp. PUT for follow because it's idempotent. Auth via JWT.`,
  },
  {
    label: "Twitter Feed 3 — offset pagination + POST for follow",
    step: "3",
    problemId: "twitter-feed",
    includeConstraints: true,
    expectedRange: [1, 2],
    answer: `POST /posts { content } → { postId }
POST /follow { userId } → 200
GET /feed?page=1&limit=20 → { posts[] }`,
  },
  {
    label: "Twitter Feed 3 — minimal correct",
    step: "3",
    problemId: "twitter-feed",
    includeConstraints: true,
    expectedRange: [2, 3],
    answer: `POST /posts { content } → { postId }
PUT /users/:id/follow → 200
GET /feed?cursor=timestamp → { items[], nextCursor }`,
  },

  // ==========================================================================
  // Uber Matching
  // ==========================================================================

  // === Uber Matching — Step 1A (Functional Requirements) ===
  {
    label: "Uber Matching 1A — excellent (full flow)",
    step: "1A",
    problemId: "uber-matching",
    includeConstraints: false,
    expectedRange: [3, 4],
    answer: `1. Riders should be able to input start location and destination to get a fare estimate
2. Riders should be able to request a ride based on the fare estimate
3. The system should match riders with nearby available drivers
4. Drivers should be able to accept or decline ride requests and navigate to pickup/dropoff`,
  },
  {
    label: "Uber Matching 1A — missing fare estimate step",
    step: "1A",
    problemId: "uber-matching",
    includeConstraints: false,
    expectedRange: [1, 2],
    answer: `1. Riders request a ride
2. System matches them with a nearby driver
3. Driver picks them up and drops them off`,
  },
  {
    label: "Uber Matching 1A — with extras (ratings, ride types)",
    step: "1A",
    problemId: "uber-matching",
    includeConstraints: false,
    expectedRange: [3, 4],
    answer: `1. Riders input start and destination, get a fare estimate
2. Riders request a ride based on the estimate
3. System matches rider with nearby available driver
4. Driver accepts/declines and navigates to pickup then dropoff
5. Riders can rate drivers after the trip
6. Riders can choose ride type (X, XL, Comfort)
7. Riders can schedule rides in advance`,
  },

  // === Uber Matching — Step 1B (Scale Question) ===
  {
    label: "Uber Matching 1B — good specific question",
    step: "1B",
    problemId: "uber-matching",
    includeConstraints: false,
    expectedRange: [3, 4],
    answer: `How many active drivers and concurrent ride requests should we expect during peak hours, and how often do drivers send location updates?`,
  },

  // === Uber Matching — Step 1C (Nonfunctional Requirements) ===
  {
    label: "Uber Matching 1C — excellent (consistency > availability)",
    step: "1C",
    problemId: "uber-matching",
    includeConstraints: true,
    expectedRange: [3, 4],
    answer: `1. Low latency matching — match within 1 minute or fail gracefully
2. Strong consistency — a driver can only be matched to one rider at a time, no double-booking. This is rare: consistency > availability here.
3. High throughput during peaks — handle 100K+ requests from same location during events
4. System should be resilient with redundancy and failover`,
  },
  {
    label: "Uber Matching 1C — availability misconception (wrong trade-off)",
    step: "1C",
    problemId: "uber-matching",
    includeConstraints: true,
    expectedRange: [1, 2],
    answer: `1. Low latency matching < 1 minute
2. High availability — prioritize availability over consistency
3. Handle peak traffic`,
  },

  // === Uber Matching — Step 2 (Core Entities) ===
  {
    label: "Uber Matching 2 — excellent (all 5 entities)",
    step: "2",
    problemId: "uber-matching",
    includeConstraints: true,
    expectedRange: [3, 4],
    answer: `1. Rider — a user who requests rides (id, name, payment)
2. Driver — a user who provides rides (id, name, vehicle info, availability status)
3. Fare — estimated fare for a ride (id, pickup, destination, estimatedFare, ETA)
4. Ride — an individual ride (id, riderId, driverId, fareId, status, route, actualFare)
5. Location — real-time driver location (driverId, lat, lng, lastUpdated)`,
  },
  {
    label: "Uber Matching 2 — merged Fare + missing Location",
    step: "2",
    problemId: "uber-matching",
    includeConstraints: true,
    expectedRange: [1, 2],
    answer: `1. User — has id, name, role (rider or driver)
2. Ride — id, pickupLocation, destination, fare, driverId, riderId, status`,
  },

  // === Uber Matching — Step 3 (API Design) ===
  {
    label: "Uber Matching 3 — excellent (full API with PATCH + location)",
    step: "3",
    problemId: "uber-matching",
    includeConstraints: true,
    expectedRange: [3, 4],
    answer: `POST /fare { pickupLocation, destination } → { fareId, estimatedFare, ETA }

POST /rides { fareId } → { rideId, status: matching }

POST /drivers/location { lat, lng } → Success

PATCH /rides/:rideId { action: accept|deny } → { rideId, status, pickupLocation, destination }

Notes: Matching happens server-side after POST /rides. Driver identity from JWT, not body. Location updates are high-frequency.`,
  },
  {
    label: "Uber Matching 3 — missing location + wrong verb for accept",
    step: "3",
    problemId: "uber-matching",
    includeConstraints: true,
    expectedRange: [1, 3],
    answer: `POST /fare { pickup, destination } → { fareId, fare }
POST /rides { fareId } → { rideId }
POST /rides/:rideId/accept → 200
POST /rides/:rideId/deny → 200`,
  },
  {
    label: "Uber Matching 3 — no fare separation",
    step: "3",
    problemId: "uber-matching",
    includeConstraints: true,
    expectedRange: [1, 2],
    answer: `POST /rides { pickup, destination } → { rideId, fare, ETA }
PUT /rides/:rideId { status: accepted } → 200
GET /rides/:rideId → { rideId, status, driver, fare }`,
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runTest(tc: TestCase): Promise<TestResult> {
  const problem = getProblem(tc.problemId);
  if (!problem) {
    return { label: tc.label, expectedRange: tc.expectedRange, passed: false, error: `Unknown problem: ${tc.problemId}` };
  }

  const body = {
    step: tc.step,
    answer: tc.answer,
    problemId: tc.problemId,
    problemTitle: problem.title,
    problemDescription: problem.description,
    constraints: tc.includeConstraints ? problem.constraints : null,
    studentName: "test-script",
    attemptId: `test-${Date.now()}`,
  };

  try {
    const res = await fetch(`${BASE_URL}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: "session_id=test-script-session" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return { label: tc.label, expectedRange: tc.expectedRange, passed: false, error: `HTTP ${res.status}: ${await res.text()}` };
    }

    const json = await res.json();
    const feedback: StructuredFeedback = json.feedback;

    if (!feedback || typeof feedback.score !== "number" || !Array.isArray(feedback.positives) || !Array.isArray(feedback.suggestions)) {
      return { label: tc.label, expectedRange: tc.expectedRange, passed: false, error: `Invalid response shape: ${JSON.stringify(json)}` };
    }

    const [lo, hi] = tc.expectedRange;
    const passed = feedback.score >= lo && feedback.score <= hi;

    return { label: tc.label, expectedRange: tc.expectedRange, passed, feedback };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { label: tc.label, expectedRange: tc.expectedRange, passed: false, error: msg };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function printResult(r: TestResult) {
  const tag = r.passed ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
  console.log(`\n[${tag}] ${BOLD}${r.label}${RESET}`);

  if (r.error) {
    console.log(`  ${RED}Error: ${r.error}${RESET}`);
    return;
  }

  const f = r.feedback!;
  const scoreColor = r.passed ? GREEN : RED;
  console.log(`  Expected: [${r.expectedRange[0]},${r.expectedRange[1]}]  Actual: ${scoreColor}${f.score}${RESET}`);
  console.log(`  ${DIM}Summary: ${f.summary}${RESET}`);

  if (f.positives.length > 0) {
    console.log(`  ${GREEN}Positives:${RESET}`);
    f.positives.forEach((p) => console.log(`    + ${p}`));
  }
  if (f.suggestions.length > 0) {
    console.log(`  ${YELLOW}Suggestions:${RESET}`);
    f.suggestions.forEach((s) => console.log(`    - ${s}`));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Optional filter: --problem url-shortener (or chat-app, twitter-feed, uber-matching)
  const problemFilter = process.argv.find((_, i, a) => a[i - 1] === "--problem");
  const cases = problemFilter
    ? TEST_CASES.filter((tc) => tc.problemId === problemFilter)
    : TEST_CASES;

  if (cases.length === 0) {
    console.error(`No test cases found for problem "${problemFilter}"`);
    process.exit(1);
  }

  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log("=".repeat(60));
  console.log(`  Feedback API Test Report`);
  console.log(`  ${now}`);
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Test cases: ${cases.length}${problemFilter ? ` (filtered: ${problemFilter})` : ""}`);
  console.log("=".repeat(60));

  const results: TestResult[] = [];

  for (let i = 0; i < cases.length; i++) {
    const tc = cases[i];
    process.stdout.write(`\r${DIM}Running ${i + 1}/${cases.length}: ${tc.label}...${RESET}`);
    const result = await runTest(tc);
    results.push(result);
    if (i < cases.length - 1) await sleep(500);
  }

  // Clear progress line
  process.stdout.write("\r" + " ".repeat(80) + "\r");

  // Print all results
  for (const r of results) {
    printResult(r);
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);

  console.log("\n" + "=".repeat(60));
  const summaryColor = failed.length === 0 ? GREEN : RED;
  console.log(`  ${summaryColor}Results: ${passed}/${results.length} passed${RESET}`);

  if (failed.length > 0) {
    console.log(`\n  ${RED}FAILURES:${RESET}`);
    for (const f of failed) {
      const actual = f.feedback ? f.feedback.score : "error";
      console.log(`  ${RED}- ${f.label} (expected [${f.expectedRange[0]},${f.expectedRange[1]}], got ${actual})${RESET}`);
    }
  }

  console.log("=".repeat(60));
  process.exit(failed.length > 0 ? 1 : 0);
}

main();
