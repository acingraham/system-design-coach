export type StepNotes = {
  /** What the reference answer should include — used by AI to evaluate */
  referencePoints: string[];
  /** What's explicitly out of scope */
  outOfScope: string[];
  /** Specific signals the AI should check for */
  signals: string[];
  /** A sample answer the student can view after submitting */
  sampleAnswer: string;
  /** Step-specific tips shown in the sidebar */
  tips?: string[];
};

export type Problem = {
  id: string;
  title: string;
  description: string;
  constraints: string[];
  tips: string[];
  /** Per-step coaching notes and sample answers. Keyed by step ID (1A, 1B, 1C, 2, 3). */
  coachingNotes?: Partial<Record<string, StepNotes>>;
};

export const problems: Problem[] = [
  {
    id: "url-shortener",
    title: "URL Shortener",
    description:
      "Design a service like bit.ly that converts long URLs into short, shareable links and redirects users to the original destination.",
    constraints: [
      "100M daily active users",
      "1B total shortened URLs stored",
    ],
    tips: [
      "Think about how to generate short codes — random, hash-based, or counter-based each have trade-offs.",
      "Caching is critical when reads dominate. What do you cache, and where?",
      "Consider what happens if two users create the same long URL.",
    ],
    coachingNotes: {
      "1A": {
        referencePoints: [
          "Users should be able to submit a long URL and receive a shortened version",
          "Users should be able to access the original URL by using the shortened URL",
        ],
        outOfScope: [
          "User authentication and account management",
          "Analytics on link clicks (click counts, geographic data)",
        ],
        signals: [
          "Did they keep it focused to 2-3 core requirements (not a long feature list)?",
          "Did they identify the two must-haves: URL creation and redirect?",
        ],
        sampleAnswer:
          "Core Requirements:\n1. Users should be able to submit a long URL and receive a shortened version.\n   - Optionally, users should be able to specify a custom alias for their shortened URL (ie. \"www.short.ly/my-custom-alias\")\n   - Optionally, users should be able to specify an expiration date for their shortened URL.\n2. Users should be able to access the original URL by using the shortened URL.\n\nBelow the line (out of scope):\n- User authentication and account management.\n- Analytics on link clicks (e.g., click counts, geographic data).",
        tips: [
          "Think about both sides of the service — creating short URLs and using them.",
          "Keep it focused: 2-3 core requirements, not a feature wish list.",
          "Consider what's clearly out of scope and call it out.",
        ],
      },
      "1B": {
        referencePoints: [
          "Ask about the scale of the system — number of DAU, total URLs, expected growth",
          "The goal is to understand whether this is a small, medium, or large-scale system",
        ],
        outOfScope: [],
        signals: [
          "Is the question specific and measurable (not vague like 'how big is it?')?",
          "Does it target the size/scale of the system (DAU, total stored items, expected growth)?",
          "Would the answer help the student understand the order of magnitude they're designing for?",
        ],
        sampleAnswer:
          "How many daily active users should we support, and how many total shortened URLs do we expect to store?",
        tips: [
          "Ask something specific and measurable — not 'how big is it?'",
          "What single number would most change how you architect this system?",
          "Think about what drives infrastructure decisions: users, stored items, or throughput?",
        ],
      },
      "1C": {
        referencePoints: [
          "Uniqueness — each short code must map to exactly one long URL",
          "Low latency redirection (< 100ms)",
          "High availability — 99.99% uptime, availability over consistency",
          "The read-to-write ratio is heavily skewed toward reads — users access shortened URLs far more often than they create new ones. The student should recognize this asymmetry and note that the system should be optimized for reads (caching, read replicas, etc.).",
        ],
        outOfScope: [
          "Data consistency in real-time analytics",
          "Advanced security features like spam detection and malicious URL filtering",
        ],
        signals: [
          "Did they quantify their constraints with specific targets (not just 'low latency' or 'highly available')?",
          "Did they explicitly choose availability over consistency?",
          "Did they recognize the read-to-write asymmetry? (Users access short URLs far more often than they create new ones — the system is heavily read-dominant)",
          "Did they mention uniqueness of short codes?",
        ],
        sampleAnswer:
          "1. The system should ensure uniqueness for short codes — each short code maps to exactly one long URL.\n2. Redirection should occur with minimal delay (< 100ms).\n3. The system should be reliable and available 99.99% of the time (availability > consistency).\n4. The system is heavily read-dominant — users access shortened URLs far more often than they create new ones. This should drive decisions around caching and read optimization.",
        tips: [
          "Do users create short URLs more often, or access them more often? That ratio matters.",
          "Put specific numbers on your constraints — 'low latency' alone isn't enough.",
          "Availability vs. consistency: which matters more for a URL shortener?",
        ],
      },
      "2": {
        referencePoints: [
          "Original URL — the long URL the user wants to shorten",
          "Short URL — the shortened URL the user receives and can share",
          "User — represents the user who created the shortened URL",
        ],
        outOfScope: [
          "Detailed column definitions at this stage — flesh out during high-level design",
          "Analytics-related entities",
        ],
        signals: [
          "Did they identify the core entities (Original URL, Short URL, User)? Note: a single 'URL' or 'URL Mapping' entity that captures both the original and short URL is equally valid — give full credit if the student clearly understands both concepts exist, regardless of how they organize them.",
          "Are the entities kept simple (not over-engineered with every field)?",
          "Did they avoid adding entities for out-of-scope features (analytics, click tracking)?",
        ],
        sampleAnswer:
          "Original URL\n- url\n\nShort URL\n- short_code\n- original_url\n\nUser\n- id",
        tips: [
          "Read through your functional requirements — what 'things' does the system need to store?",
          "Keep it simple: entity names and a few key attributes. Save detailed schemas for later.",
          "Only add entities that support in-scope requirements.",
        ],
      },
      "3": {
        referencePoints: [
          "POST /urls with { long_url } → { short_url }",
          "GET /{short_code} → HTTP 302 redirect to the original long URL",
          "Use 302 (not 301) to maintain control over link updates",
        ],
        outOfScope: [
          "Analytics endpoints",
          "User management/auth endpoints",
        ],
        signals: [
          "Did they use correct HTTP verbs (POST to create, GET to redirect)?",
          "Did they use RESTful conventions (plural nouns for resources)?",
          "Did they specify the response format (returning the short URL)?",
          "Did they mention the redirect status code (302 preferred over 301)?",
          "Did they derive user identity from auth token, not the request body?",
        ],
        sampleAnswer:
          "// Shorten a URL\nPOST /urls\n{\n  \"long_url\": \"https://www.example.com/some/very/long/url\"\n}\n→ { \"short_url\": \"http://short.ly/abc123\" }\n\n// Redirect to Original URL\nGET /{short_code}\n→ HTTP 302 Redirect to the original long URL\n\nNotes: Use 302 (not 301) so we maintain control over link updates. User identity comes from the auth token, not the request body.",
        tips: [
          "Go through each functional requirement and design an endpoint for it.",
          "Think about which HTTP verb fits each operation (GET, POST, PUT, PATCH, DELETE).",
          "The redirect endpoint is unique — what status code should it return, and why?",
        ],
      },
    },
  },
  {
    id: "twitter-feed",
    title: "Twitter Feed",
    description:
      "Design a social feed that lets users post short messages and see a timeline of posts from accounts they follow.",
    constraints: [
      "2B total users",
      "High read-to-write ratio (~100:1)",
      "Posts visible in feeds within 1 minute (eventual consistency)",
      "Posting and viewing feed should be fast (< 500ms)",
      "Users can follow an unlimited number of people and be followed by an unlimited number",
    ],
    tips: [
      "Fan-out on write vs. fan-out on read — which suits a high read-to-write ratio?",
      "Consider celebrity users with millions of followers as an edge case.",
      "How do you keep the feed roughly chronological without scanning everything?",
    ],
    coachingNotes: {
      "1A": {
        referencePoints: [
          "Users should be able to create posts",
          "Users should be able to follow other users (uni-directional follow, not mutual friendship)",
          "Users should be able to view a feed of posts from people they follow, in reverse chronological order (newest first)",
          "Users should be able to page through their feed",
        ],
        outOfScope: [
          "Like and comment on posts",
          "Posts can be private or have restricted visibility",
          "Direct messaging",
        ],
        signals: [
          "Did they keep it focused to 3-4 core requirements?",
          "Did they identify the two must-haves: creating posts and viewing a feed?",
          "Did they mention following as a core action?",
          "Did they specify reverse chronological ordering for the feed?",
          "Did they mention pagination/paging through the feed?",
        ],
        sampleAnswer:
          "Core Requirements:\n1. Users should be able to create posts.\n2. Users should be able to follow other users.\n3. Users should be able to view a feed of posts from people they follow, in reverse chronological order (newest first).\n4. Users should be able to page through their feed.\n\nBelow the line (out of scope):\n- Like and comment on posts.\n- Private or restricted visibility posts.\n- Direct messaging.",
        tips: [
          "Think about both creating content and consuming it — what are the core user actions?",
          "Is following mutual (like Facebook friends) or one-way (like Twitter)?",
          "How does a user browse their feed? What order are posts in, and what if there are thousands?",
        ],
      },
      "1B": {
        referencePoints: [
          "Ask about the number of users and the expected read/write patterns",
          "The goal is to understand whether the system is read-heavy or write-heavy",
        ],
        outOfScope: [
          "Detailed storage calculations",
        ],
        signals: [
          "Is the question specific and measurable?",
          "Does it target the scale of the system (users, read/write ratio)?",
          "Would the answer help them understand whether to optimize for reads or writes?",
        ],
        sampleAnswer:
          "How many total users should we support, and what's the expected read-to-write ratio for posts?",
        tips: [
          "Do people post more often, or scroll their feed more often? That ratio shapes everything.",
          "Think about what number would most change your architecture.",
        ],
      },
      "1C": {
        referencePoints: [
          "Highly available — prioritize availability over consistency",
          "Eventually consistent — posts visible in feeds within 1 minute is acceptable",
          "Low latency — posting and viewing the feed should be fast (< 500ms)",
          "Massive scale — 2B users",
          "Users can follow an unlimited number of people and be followed by an unlimited number",
        ],
        outOfScope: [
          "Real-time analytics on post engagement",
          "Content moderation systems",
        ],
        signals: [
          "Did they explicitly choose availability over consistency?",
          "Did they quantify their latency target?",
          "Did they mention eventual consistency and what delay is acceptable?",
          "Did they consider the fan-out challenge of unlimited followers?",
          "Did they derive insights from the read-to-write ratio (100:1 means optimize for reads)?",
        ],
        sampleAnswer:
          "1. The system should be highly available (availability over consistency).\n2. Eventual consistency is acceptable — posts visible in feeds within 1 minute.\n3. Posting and viewing the feed should be fast (< 500ms).\n4. The system should handle 2B users.\n5. Users can follow unlimited people and be followed by unlimited users — this creates a fan-out challenge, especially for celebrity accounts.\n6. The read-to-write ratio is ~100:1 — we should optimize heavily for reads.",
        tips: [
          "Does a new post need to appear in every follower's feed instantly, or is a short delay OK?",
          "What matters more for a social feed — always available or always consistent?",
          "Think about what the read-to-write ratio tells you about where to optimize.",
        ],
      },
      "2": {
        referencePoints: [
          "User — represents a person on the platform",
          "Follow — a uni-directional relationship (follower → followee)",
          "Post — the content created by a user (text, timestamp, author)",
        ],
        outOfScope: [
          "Detailed column definitions at this stage",
          "Like/comment entities",
          "Media attachment entities",
        ],
        signals: [
          "Did they identify User, Follow, and Post as core entities?",
          "Did they note that Follow is uni-directional (not a mutual friendship)?",
          "Are the entities kept simple as a first draft?",
          "Did they avoid adding entities for out-of-scope features?",
        ],
        sampleAnswer:
          "User\n- id\n\nFollow\n- follower_id\n- followee_id\n\nPost\n- id\n- author_id\n- content",
        tips: [
          "Look at each functional requirement — what 'nouns' does it involve?",
          "How do you represent a follow relationship? Is it its own entity?",
          "Keep it simple: entity names and key attributes. Save detailed schemas for later.",
        ],
      },
      "3": {
        referencePoints: [
          "POST /posts { content } → { postId } — create a new post",
          "PUT /users/[id]/follow → 200 OK — follow a user (idempotent, use PUT not POST)",
          "GET /feed?pageSize={size}&cursor={timestamp} → { items: Post[], nextCursor } — view feed with cursor-based pagination",
          "Authentication via JWT in header, not in request body",
        ],
        outOfScope: [
          "Like/comment endpoints",
          "Search endpoints",
          "User profile management endpoints",
        ],
        signals: [
          "Did they use correct HTTP verbs (POST to create, PUT for idempotent follow, GET to read)?",
          "Did they implement cursor-based pagination for the feed (not offset-based)?",
          "Did they specify what the feed endpoint returns (posts + next cursor)?",
          "Did they derive user identity from auth token, not the request body?",
          "Did they use RESTful conventions?",
        ],
        sampleAnswer:
          "// Create a post\nPOST /posts\n{ \"content\": \"...\" }\n→ { \"postId\": \"...\" }\n\n// Follow a user (idempotent)\nPUT /users/:id/follow\n→ 200 OK\n\n// Unfollow (out of scope but noting for completeness)\nDELETE /users/:id/follow\n→ 200 OK\n\n// View feed with cursor-based pagination\nGET /feed?pageSize={size}&cursor={timestamp}\n→ { items: Post[], nextCursor: string }\n\nNotes: Use cursor-based pagination (timestamp cursor) so each page returns posts older than the cursor. Auth via JWT in header. PUT for follow because it's idempotent — clicking follow twice doesn't create duplicate records.",
        tips: [
          "Go through each functional requirement and design an endpoint for it.",
          "The feed could have millions of posts — how does the client paginate through them?",
          "Is following idempotent? That should influence your choice of HTTP verb.",
        ],
      },
    },
  },
  {
    id: "chat-app",
    title: "Chat App",
    description:
      "Design a real-time messaging system supporting one-on-one and group conversations with delivery and read receipts.",
    constraints: [
      "Billions of total users, ~200M concurrent connections",
      "Messages must appear in real time (< 500ms)",
      "Group chats up to 100 members",
      "~40K messages/second, ~100K writes/second including inbox entries",
      "Offline users should receive messages when they come back online (up to 30 days)",
    ],
    tips: [
      "Persistent connections (WebSocket) vs. polling — what fits real-time delivery?",
      "Think about message ordering, especially in group chats with concurrent senders.",
      "Where does message history live, and how do you handle offline users coming back online?",
    ],
    coachingNotes: {
      "1A": {
        referencePoints: [
          "Users should be able to start group chats with multiple participants (limit 100)",
          "Users should be able to send/receive messages",
          "Users should be able to receive messages sent while they are not online (up to 30 days)",
          "Users should be able to send/receive media in their messages",
        ],
        outOfScope: [
          "Audio/video calling",
          "Interactions with businesses",
          "Registration and profile management",
        ],
        signals: [
          "Did they keep it focused to 3-4 core requirements?",
          "Did they identify the must-haves: send/receive messages + group chats?",
          "Did they mention offline message delivery? This is a non-obvious but important requirement.",
          "Did they mention media support?",
        ],
        sampleAnswer:
          "Core Requirements:\n1. Users should be able to start group chats with multiple participants (limit 100).\n2. Users should be able to send/receive messages.\n3. Users should be able to receive messages sent while they are not online (up to 30 days).\n4. Users should be able to send/receive media in their messages.\n\nBelow the line (out of scope):\n- Audio/video calling.\n- Interactions with businesses.\n- Registration and profile management.",
        tips: [
          "Think beyond sending — what happens when someone is offline for days?",
          "Is this 1:1 only, or can users chat in groups? What are the limits?",
          "Do messages include just text, or other types of content too?",
        ],
      },
      "1B": {
        referencePoints: [
          "Ask about the number of users and concurrent connections",
          "The goal is to understand the scale of message throughput and connection management",
        ],
        outOfScope: [
          "Detailed storage calculations — save for later",
        ],
        signals: [
          "Is the question specific and measurable?",
          "Does it target the number of users or concurrent connections?",
          "Would the answer help them understand infrastructure needs for real-time messaging?",
        ],
        sampleAnswer:
          "How many total users should we support, and how many do we expect to be connected simultaneously?",
        tips: [
          "Total users and concurrent users are very different numbers — which matters more here?",
          "Real-time messaging requires persistent connections. How many of those at once?",
        ],
      },
      "1C": {
        referencePoints: [
          "Low latency delivery — messages should arrive in < 500ms",
          "Guaranteed deliverability — messages must eventually reach the recipient",
          "Handle billions of users with high throughput",
          "Messages stored on centralized servers no longer than necessary (privacy)",
          "System should be resilient against failures of individual components",
        ],
        outOfScope: [
          "Exhaustive treatment of security concerns",
          "Spam and scraping prevention systems",
        ],
        signals: [
          "Did they specify a latency target for message delivery?",
          "Did they mention guaranteed delivery / durability of messages?",
          "Did they think about what happens when components fail?",
          "Did they consider privacy implications of message storage?",
        ],
        sampleAnswer:
          "1. Messages should be delivered to available users with low latency (< 500ms).\n2. We should guarantee deliverability of messages — they should eventually reach the recipient.\n3. The system should handle billions of users with high throughput (~40K messages/sec).\n4. Messages should be stored on centralized servers no longer than necessary.\n5. The system should be resilient against failures of individual components.",
        tips: [
          "What guarantees do users expect? 'Delivered' is different from 'sent'.",
          "Think about privacy — how long should servers keep messages?",
          "What happens when a server goes down mid-conversation?",
        ],
      },
      "2": {
        referencePoints: [
          "Users — represents a person using the system",
          "Chats — a conversation between 2-100 users",
          "Messages — the content sent within a chat",
          "Clients — a user might have multiple devices (phone, desktop, tablet)",
        ],
        outOfScope: [
          "Detailed column definitions at this stage",
          "Media/attachment entity details",
        ],
        signals: [
          "Did they identify Users, Chats, and Messages as core entities?",
          "Did they consider that a user can have multiple devices (Clients)?",
          "Did they note that Chats can have 2-100 participants?",
          "Are the entities kept simple (not over-engineered)?",
        ],
        sampleAnswer:
          "User\n- id\n\nChat\n- id\n- participants\n\nMessage\n- id\n- chat_id\n- sender_id\n- content\n\nClient\n- id\n- user_id",
        tips: [
          "Can a single user be logged in on multiple devices at once? Does that need its own entity?",
          "What's the difference between a 'chat' and a 'message'? Both are important.",
          "Keep it simple — entity names and key attributes only.",
        ],
      },
      "3": {
        referencePoints: [
          "This is a WebSocket-based system, not REST — real-time bidirectional communication",
          "createChat: { participants[], name } → { chatId }",
          "sendMessage: { chatId, message, attachments } → { status, messageId }",
          "createAttachment: { body, hash } → { attachmentId }",
          "modifyChatParticipants: { chatId, userId, operation: ADD|REMOVE } → { status }",
          "Server pushes: chatUpdate, newMessage events to connected clients",
          "Clients send ack (acknowledgement) upon receipt to confirm delivery",
        ],
        outOfScope: [
          "Push notification endpoints",
          "User management/auth endpoints",
        ],
        signals: [
          "Did they recognize that WebSocket (or similar persistent connection) is needed instead of REST?",
          "Did they define commands for both sending and receiving (bidirectional)?",
          "Did they include message acknowledgement (ack) for delivery confirmation?",
          "Did they handle media/attachments as a separate concern from text messages?",
        ],
        sampleAnswer:
          "// WebSocket-based API (bidirectional commands)\n\n// Client → Server:\ncreateChat: { participants[], name } → { chatId }\nsendMessage: { chatId, message, attachments } → { status: SUCCESS|FAILURE, messageId }\ncreateAttachment: { body, hash } → { attachmentId }\nmodifyChatParticipants: { chatId, userId, operation: ADD|REMOVE } → { status }\n\n// Server → Client:\nchatUpdate: { chatId, participants[] } → client sends ack\nnewMessage: { chatId, userId, message, attachments } → client sends ack\n\nNotes: Use WebSockets (over TLS) for real-time bidirectional communication. Client acknowledgement (ack) is crucial for guaranteeing delivery — if no ack is received, the message stays in the user's inbox for later delivery.",
        tips: [
          "Is REST the right fit for real-time messaging? Think about who initiates communication.",
          "Messages flow both ways — the server needs to push to the client too.",
          "How does the server know a message was actually received?",
        ],
      },
    },
  },
  {
    id: "uber-matching",
    title: "Uber Matching",
    description:
      "Design the rider-driver matching system that pairs nearby drivers with ride requests in real time.",
    constraints: [
      "Low latency matching (< 1 minute to match or fail)",
      "Strong consistency — a driver can only be matched to one rider at a time",
      "100K+ ride requests from the same location during peak/events",
      "Location updates every few seconds per active driver",
      "Hundreds of thousands of active drivers per city",
    ],
    tips: [
      "How do you efficiently query nearby drivers? Geohashing and quad-trees are common tools.",
      "Think about race conditions when two riders request the same driver simultaneously.",
      "Where does location state live — and how stale can it be before matches degrade?",
    ],
    coachingNotes: {
      "1A": {
        referencePoints: [
          "Riders should be able to input a start location and a destination and get a fare estimate",
          "Riders should be able to request a ride based on the estimated fare",
          "Upon request, riders should be matched with a driver who is nearby and available",
          "Drivers should be able to accept/decline a request and navigate to pickup/drop-off",
        ],
        outOfScope: [
          "Riders should be able to rate their ride and driver post-trip",
          "Drivers should be able to rate passengers",
          "Riders should be able to schedule rides in advance",
          "Riders should be able to request different categories of rides (X, XL, Comfort)",
        ],
        signals: [
          "Did they keep it focused to 3-4 core requirements?",
          "Did they identify the full flow: fare estimate → request ride → match → accept?",
          "Did they separate the fare estimation step from the ride request step?",
          "Did they mention that drivers need to accept/decline?",
        ],
        sampleAnswer:
          "Core Requirements:\n1. Riders should be able to input a start location and destination and get a fare estimate.\n2. Riders should be able to request a ride based on the estimated fare.\n3. Upon request, riders should be matched with a nearby, available driver.\n4. Drivers should be able to accept/decline a request and navigate to pickup/drop-off.\n\nBelow the line (out of scope):\n- Rating rides and drivers post-trip.\n- Scheduling rides in advance.\n- Different ride categories (X, XL, Comfort).",
        tips: [
          "Think about the full ride flow — what steps happen before a rider gets in the car?",
          "There are two types of users here. What does each one need to do?",
          "Does the rider commit to a ride before seeing a price, or after?",
        ],
      },
      "1B": {
        referencePoints: [
          "Ask about the number of concurrent riders and drivers, or peak request volume",
          "The goal is to understand the matching throughput required",
        ],
        outOfScope: [
          "Detailed pricing model calculations",
        ],
        signals: [
          "Is the question specific and measurable?",
          "Does it target the scale of concurrent riders/drivers or request throughput?",
          "Would the answer help them understand the matching system's throughput needs?",
        ],
        sampleAnswer:
          "How many active drivers and concurrent ride requests should we expect during peak hours, and how often do drivers send location updates?",
        tips: [
          "What drives the matching system's load — total users or concurrent requests?",
          "Think about peak scenarios: a concert lets out and 100K people need rides.",
        ],
      },
      "1C": {
        referencePoints: [
          "Low latency matching — match should complete in under 1 minute (or fail)",
          "Strong consistency in ride matching — a driver can only be matched to one rider at a time (no double-booking)",
          "High throughput — handle 100K+ requests from the same location during peak/events",
          "System should be resilient with redundancy and failover",
        ],
        outOfScope: [
          "Security and privacy compliance (GDPR)",
          "Monitoring, logging, and alerting infrastructure",
          "CI/CD pipelines",
        ],
        signals: [
          "Did they specify a latency target for matching?",
          "Did they explicitly call out strong consistency for driver assignment (no double-booking)?",
          "Did they think about peak/surge scenarios?",
          "Did they note that consistency is critical here (unlike most systems that choose availability)?",
        ],
        sampleAnswer:
          "1. Low latency ride matching — match should complete in under 1 minute or fail gracefully.\n2. Strong consistency — a driver must only be matched to one rider at a time (no double-booking). This is one of the rare cases where consistency matters more than availability.\n3. High throughput during peaks — handle 100K+ requests from the same location during events.\n4. System should be resilient with redundancy and failover mechanisms.",
        tips: [
          "What happens if two riders request the same driver at the same instant?",
          "Most systems choose availability over consistency. Is that right here?",
          "How fast does matching need to be before the rider gives up?",
        ],
      },
      "2": {
        referencePoints: [
          "Rider — a user who requests rides (personal info, payment methods)",
          "Driver — a user who provides rides (personal info, vehicle info, availability status)",
          "Fare — estimated fare for a ride (pickup/destination locations, estimated fare, ETA)",
          "Ride — an individual ride from request to completion (rider, driver, route, status, actual fare)",
          "Location — real-time driver location (lat/lng, timestamp of last update)",
        ],
        outOfScope: [
          "Detailed column definitions at this stage",
          "Payment transaction entities",
          "Rating/review entities",
        ],
        signals: [
          "Did they identify Rider and Driver as separate entities (not just User)?",
          "Did they separate Fare (estimate) from Ride (actual trip)?",
          "Did they include Location as its own entity for real-time tracking?",
          "Did they think about the state transitions of a Ride (requested → matched → in-progress → completed)?",
        ],
        sampleAnswer:
          "Rider\n- id\n\nDriver\n- id\n- vehicle_info\n- availability_status\n\nFare\n- id\n- pickup_location\n- destination\n- estimated_fare\n\nRide\n- id\n- rider_id\n- driver_id\n- fare_id\n- status\n\nLocation\n- driver_id\n- lat\n- lng",
        tips: [
          "Is a fare estimate the same thing as a completed ride? Think about the lifecycle.",
          "Riders and drivers have very different attributes — are they the same entity?",
          "Driver locations update every few seconds. Does that need its own entity?",
        ],
      },
      "3": {
        referencePoints: [
          "POST /fare { pickupLocation, destination } → Fare — get a fare estimate (creates a Fare entity)",
          "POST /rides { fareId } → Ride — request a ride based on an estimated fare",
          "POST /drivers/location { lat, lng } → Success/Error — update driver location (called periodically by driver app)",
          "PATCH /rides/:rideId { accept/deny } → Ride — driver accepts or declines a ride request",
          "Driver identity from session/JWT, not request body (security)",
        ],
        outOfScope: [
          "Payment processing endpoints",
          "Rating endpoints",
          "Ride history/receipts endpoints",
        ],
        signals: [
          "Did they separate fare estimation from ride request (two-step flow)?",
          "Did they include the driver location update endpoint?",
          "Did they use PATCH for the accept/deny action (partial update)?",
          "Did they derive user identity from auth token, not the request body?",
          "Did they note that matching happens server-side (no explicit match endpoint needed)?",
        ],
        sampleAnswer:
          "// Get fare estimate\nPOST /fare\n{ pickupLocation, destination }\n→ Fare { fareId, estimatedFare, ETA }\n\n// Request a ride\nPOST /rides\n{ fareId }\n→ Ride { rideId, status: \"matching\" }\n\n// Update driver location (called every few seconds by driver app)\nPOST /drivers/location\n{ lat, lng }\n→ Success/Error\n\n// Driver accepts or declines a ride\nPATCH /rides/:rideId\n{ action: \"accept\" | \"deny\" }\n→ Ride { rideId, status, pickupLocation, destination }\n\nNotes: Matching happens server-side after POST /rides — no explicit match endpoint needed. Driver identity comes from session/JWT, not request body. Location updates are high-frequency, so this endpoint must be optimized for throughput.",
        tips: [
          "The fare estimate and ride request are two separate steps — does that mean two endpoints?",
          "Drivers send location updates every few seconds. That's an endpoint too.",
          "Does matching need its own endpoint, or does it happen behind the scenes?",
        ],
      },
    },
  },
];

export function getProblem(id: string): Problem | undefined {
  return problems.find((p) => p.id === id);
}

export function getNextProblemId(currentId: string): string | null {
  const idx = problems.findIndex((p) => p.id === currentId);
  if (idx === -1 || idx === problems.length - 1) return null;
  return problems[idx + 1].id;
}

export function getProblemIndex(id: string): number {
  return problems.findIndex((p) => p.id === id);
}
