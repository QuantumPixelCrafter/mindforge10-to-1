import { Router, type IRouter } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { randomUUID } from "crypto";
import { Readable } from "stream";

const router: IRouter = Router();
const storage = new ObjectStorageService();

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  if (parts.length < 3) throw new Error("Invalid path");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

async function signURL(bucketName: string, objectName: string, method: string, ttlSec: number): Promise<string> {
  const res = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Presign failed: ${res.status}`);
  const { signed_url } = await res.json() as { signed_url: string };
  return signed_url;
}

router.post("/storage/uploads/request-url", async (req: any, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { contentType } = req.body as { contentType?: string };
    const objectId = randomUUID();
    const privateObjectDir = storage.getPrivateObjectDir();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const uploadURL = await signURL(bucketName, objectName, "PUT", 900);
    const objectPath = `/objects/uploads/${objectId}`;
    res.json({ uploadURL, objectPath, contentType: contentType ?? "application/octet-stream" });
  } catch (err: any) {
    console.error("Storage presign error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.use("/storage/objects", async (req: any, res, next) => {
  if (req.method !== "GET") return next();
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const objectPath = "/objects" + req.path;
    const objectFile = await storage.getObjectEntityFile(objectPath);
    const gcsResponse = await storage.downloadObject(objectFile, 3600);
    const contentType = gcsResponse.headers.get("Content-Type") ?? "application/octet-stream";
    const contentLength = gcsResponse.headers.get("Content-Length");
    const cacheControl = gcsResponse.headers.get("Cache-Control") ?? "private, max-age=3600";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", cacheControl);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (gcsResponse.body) {
      Readable.fromWeb(gcsResponse.body as any).pipe(res);
    } else {
      res.end();
    }
  } catch (err: any) {
    if (err instanceof ObjectNotFoundError) return res.status(404).json({ error: "Not found" });
    console.error("Storage serve error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
