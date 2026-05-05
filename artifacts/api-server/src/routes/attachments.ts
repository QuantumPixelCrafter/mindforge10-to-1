import { Router, type IRouter } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { chatAttachmentsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB limit

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
});

router.post("/attachments", upload.single("file"), async (req: any, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  if (!req.file) return res.status(400).json({ error: "No file provided" });

  const { buffer, mimetype, originalname, size } = req.file;
  const data = buffer.toString("base64");

  try {
    const [row] = await db.insert(chatAttachmentsTable).values({
      senderId: req.user.id,
      data,
      contentType: mimetype,
      fileName: originalname ?? null,
      size,
    }).returning({ id: chatAttachmentsTable.id });

    const mediaType = mimetype.startsWith("image/") ? "image" : mimetype.startsWith("video/") ? "video" : "file";
    const mediaUrl = `/api/attachments/${row.id}?t=${mediaType}`;

    res.json({ id: row.id, mediaUrl });
  } catch (err: any) {
    console.error("Attachment upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/attachments/:id", async (req: any, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [row] = await db.select().from(chatAttachmentsTable).where(eq(chatAttachmentsTable.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Not found" });

    const buffer = Buffer.from(row.data, "base64");
    res.setHeader("Content-Type", row.contentType);
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader("Cache-Control", "private, max-age=86400");
    if (row.fileName) res.setHeader("Content-Disposition", `inline; filename="${row.fileName}"`);
    res.end(buffer);
  } catch (err: any) {
    console.error("Attachment serve error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
