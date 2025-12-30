const jsonServer = require("json-server");
const path = require("path");

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, "db.json"));
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

server.use((req, res, next) => setTimeout(next, 150));

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

/**
 * Generates transcript object for a call.
 * You can tune templates to match your “callcenter” style.
 */
function generateTranscriptForCall(call, createdAtISO) {
  const templates = [
    [
      ["agent", "Hello! This is support. How can I help today?"],
      ["customer", "Hi, I have an issue with my order."],
      ["agent", "Sure, can you describe what happened?"],
      ["customer", "Payment went through but I don’t see the order."],
      ["agent", "Thanks. I will check it and update you."],
    ],
    [
      ["agent", "Good day! Thanks for calling."],
      ["customer", "My delivery is delayed."],
      ["agent", "Let me check the tracking details."],
      ["customer", "Okay, thank you."],
      ["agent", "I see the ETA changed to tomorrow morning."],
    ],
    [
      ["agent", "Hello, support team here."],
      ["customer", "I want to change my subscription plan."],
      ["agent", "No problem. Which plan would you like?"],
      ["customer", "The annual plan, please."],
      ["agent", "Done. You’ll receive confirmation by email."],
    ],
  ];

  const convo = pick(templates);

  const segments = convo.map(([speaker, text], idx) => ({
    t: idx * randInt(3, 7),
    speaker,
    text,
  }));

  return {
    id: `tr_${call.id}`,
    callId: call.id,
    createdAt: createdAtISO,
    language: "en",
    meta: {
      customerName: call.customerName || null,
      agentName: call.agentName || null,
      topic: call.topic || null,
    },
    segments,
  };
}

/**
 * GET /calls?page=&limit=&status=&from=&to=
 * status: scheduled | in_progress | completed | all
 * from/to: YYYY-MM-DD inclusive (filters by scheduledAt)
 * Returns { items, page, totalPages, totalItems }
 */
server.get("/calls", (req, res) => {
  const db = router.db;
  const all = db.get("calls").value() || [];

  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);
  const status = req.query.status || "all";
  const from = req.query.from || "";
  const to = req.query.to || "";

  let filtered = all;

  if (status && status !== "all") {
    filtered = filtered.filter((c) => c.status === status);
  }

  if (from) {
    const fromTime = new Date(from + "T00:00:00.000Z").getTime();
    filtered = filtered.filter(
      (c) => new Date(c.scheduledAt).getTime() >= fromTime
    );
  }

  if (to) {
    const toTime = new Date(to + "T23:59:59.999Z").getTime();
    filtered = filtered.filter(
      (c) => new Date(c.scheduledAt).getTime() <= toTime
    );
  }

  filtered = filtered
    .slice()
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  const totalItems = filtered.length;
  const safeLimit = limit > 0 ? limit : totalItems || 1;
  const safePage = Math.max(1, page);
  const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));

  const start = (safePage - 1) * safeLimit;
  const items = filtered.slice(start, start + safeLimit);

  res.json({ items, page: safePage, totalPages, totalItems });
});
server.get("/calls/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  const call = db.get("calls").find({ id }).value();
  if (!call) return res.status(404).json({ error: "Call not found" });

  res.json(call);
});

/**
 * POST /calls/:id/start
 * scheduled -> in_progress
 */
server.post("/calls/:id/start", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  const chain = db.get("calls").find({ id });
  const existing = chain.value();
  if (!existing) return res.status(404).json({ error: "Call not found" });

  if (existing.status !== "scheduled") {
    return res
      .status(400)
      .json({ error: "Only scheduled calls can be started" });
  }

  const now = new Date().toISOString();

  const updated = chain
    .assign({
      status: "in_progress",
      startedAt: now,
      updatedAt: now,
    })
    .write();

  res.json(updated);
});

/**
 * POST /calls/:id/finish
 * in_progress -> completed
 * generates transcript ONLY on finish and writes it to db.json
 */
server.post("/calls/:id/finish", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  const callChain = db.get("calls").find({ id });
  const call = callChain.value();
  if (!call) return res.status(404).json({ error: "Call not found" });

  if (call.status !== "in_progress") {
    return res
      .status(400)
      .json({ error: "Only in_progress calls can be finished" });
  }

  const now = new Date().toISOString();

  const updated = callChain
    .assign({
      status: "completed",
      finishedAt: now,
      updatedAt: now,
    })
    .write();

  if (!db.has("callTranscripts").value()) {
    db.set("callTranscripts", []).write();
  }

  const hasTranscript = db.get("callTranscripts").find({ callId: id }).value();
  if (!hasTranscript) {
    const transcript = generateTranscriptForCall(updated, now);
    db.get("callTranscripts").push(transcript).write();
  }

  res.json(updated);
});

/**
 * GET /calls/:id/transcript
 * Reads transcript from db.json by callId
 */
server.get("/calls/:id/transcript", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  const list = db.get("callTranscripts").value() || [];
  const t = list.find((x) => x.callId === id);

  if (!t) return res.status(404).json({ error: "Transcript not found" });

  res.json(t);
});

server.use(router);

const PORT = 4130;
server.listen(PORT, () =>
  console.log(`Mock API running at http://localhost:${PORT}`)
);
