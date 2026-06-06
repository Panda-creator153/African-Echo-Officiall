import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import os from "os";

// Supabase Init
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET_NAME || "uploads";

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (supabase) {
  console.log("[Supabase Server] Core client initialized.");
} else {
  console.warn("[Supabase Server] Keys missing in environment. Local fallback active.");
}

async function ensureSupabaseBucket() {
  if (supabase) {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const hasBucket = buckets?.some(b => b.name === supabaseBucket);
      if (!hasBucket) {
        console.log(`[Supabase Store] Creating bucket "${supabaseBucket}"...`);
        await supabase.storage.createBucket(supabaseBucket, {
          public: true,
          fileSizeLimit: 52428800 // 50MB
        });
      }
    } catch (e: any) {
      console.warn("[Supabase Store] Verification/auto-creation of bucket was limited (requires Service Role Key):", e.message || e);
    }
  }
}

// Persistent JWT token secret across development hot restarts
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const secretPath = path.join(os.tmpdir(), ".session_jwt_secret");
  try {
    if (fs.existsSync(secretPath)) {
      const savedSecret = fs.readFileSync(secretPath, "utf8").trim();
      if (savedSecret) return savedSecret;
    }
  } catch (e) {
    // Fail silently, generate random
  }
  const key = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(secretPath, key, "utf8");
  } catch (e) {
    // Fail silently
  }
  return key;
})();

function generateToken(payload: any): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): any {
  try {
    const [header, body, signature] = token.split(".");
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

const CONTENT_FILE = path.join(process.cwd(), "site-content.json");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Auto-verify or provision Supabase bucket on boot
  await ensureSupabaseBucket();

  // 1. Basic Middleware
  app.use(cors());
  
  // TOP-LEVEL DEBUG LOGGER
  app.use((req, res, next) => {
    const isApi = req.originalUrl.startsWith('/api');
    if (isApi) {
      const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Path: ${req.path} - Headers: ${JSON.stringify(req.headers)}\n`;
      try {
        fs.appendFileSync(path.join(process.cwd(), "server_requests.log"), logLine);
      } catch (e) {
        // Ignore logging errors
      }
      console.log(`[API REQUEST] ${req.method} ${req.originalUrl} - Path: ${req.path}`);
    }
    next();
  });

  // 2. Token-based Admin Auth (No Firebase needed)
  const isAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        console.warn(`[Auth] Missing or invalid header: ${authHeader ? 'malformed' : 'missing'}`);
        return res.status(401).json({ error: "Unauthorized access" });
      }

      const token = authHeader.split('Bearer ')[1];
      const decoded = verifyToken(token);
      
      if (decoded && decoded.role === 'admin') {
        return next();
      }

      console.warn(`[Auth] Forbidden: Invalid or expired admin token.`);
      return res.status(403).json({ error: "Forbidden: Admin permissions required" });
    } catch (error) {
      console.error(`[Auth] Token verification failed:`, error);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };

  // 3. API ROUTES
  const apiRouter = express.Router();
  apiRouter.use(express.json({ limit: "100mb" }));
  apiRouter.use(express.urlencoded({ extended: true, limit: "100mb" }));

  // Admin login check for routes
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    isAdmin(req, res, next);
  };

  // Explicit Upload Route
  apiRouter.post("/upload", requireAdmin, (req, res, next) => {
    console.log(`[API/upload] Route entered. Content-Type: ${req.headers['content-type']}, Content-Length: ${req.headers['content-length']}`);
    
    upload.single("file")(req, res, (err: any) => {
      if (err) {
        console.error(`[API/upload] Multer parsing error:`, err);
        return res.status(400).json({ error: err.message || "File upload failed. Check the file or size." });
      }
      console.log(`[API/upload] Multer parsing completed successfully. File:`, (req as any).file ? (req as any).file.filename : 'No file captured');
      next();
    });
  }, async (req: express.Request, res: express.Response) => {
    try {
      const file = (req as any).file;
      if (!file) {
        console.warn("[API] No file found in request.");
        return res.status(400).json({ error: "No file uploaded. Use field 'file'." });
      }
      
      const localUrl = `/uploads/${file.filename}`;
      console.log(`[API] Upload success locally: ${localUrl}`);

      if (supabase) {
        try {
          console.log(`[Supabase Store] Uploading "${file.filename}" to bucket "${supabaseBucket}"`);
          const fileBuffer = fs.readFileSync(file.path);
          const { error: uploadErr } = await supabase.storage
            .from(supabaseBucket)
            .upload(file.filename, fileBuffer, {
              contentType: file.mimetype,
              upsert: true
            });

          if (uploadErr) {
            console.error("[Supabase Store] Storage API returned error:", uploadErr.message);
            // Non-blocking fallback to local URL so they can keep working
            return res.json({ url: localUrl, note: "Uploaded locally because Supabase storage failed" });
          }

          const { data: publicUrlData } = supabase.storage
            .from(supabaseBucket)
            .getPublicUrl(file.filename);

          console.log(`[Supabase Store] File uploaded successfully to Supabase! Public URL: ${publicUrlData.publicUrl}`);
          return res.json({ url: publicUrlData.publicUrl });
        } catch (e: any) {
          console.error("[Supabase Store] Exception during uploading:", e.message || e);
          return res.json({ url: localUrl, note: "Uploaded locally due to exception" });
        }
      }
      
      return res.json({ url: localUrl });
    } catch (routeErr: any) {
      console.error("[API] Unhandled error inside upload router handler:", routeErr);
      return res.status(500).json({ error: routeErr.message || "Internal upload handler error" });
    }
  });

  apiRouter.post("/admin/login", (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || "Silinkjay55#";
    
    if (password === adminPassword) {
      const token = generateToken({ role: "admin", exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }); // 7 days token
      return res.json({ token, success: true });
    }
    
    return res.status(401).json({ error: "Invalid admin password" });
  });

  apiRouter.get("/admin/verify", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false });
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = verifyToken(token);
    if (decoded && decoded.role === 'admin') {
      return res.json({ valid: true, email: 'silinkjay43@gmail.com' });
    }
    return res.status(401).json({ valid: false });
  });

  apiRouter.get("/supabase-status", async (req, res) => {
    try {
      const hasUrl = !!process.env.SUPABASE_URL;
      const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
      const isConfigured = hasUrl && hasKey;

      if (!isConfigured) {
        return res.json({
          configured: false,
          database: { status: "not_configured", details: "SUPABASE_URL or API keys are missing in env setup." },
          storage: { status: "not_configured", details: "SUPABASE_URL or API keys are missing in env setup." }
        });
      }

      let databaseStatus = "connected";
      let databaseDetails = "Successfully connected and table exists.";
      let storageStatus = "connected";
      let storageDetails = "uploads bucket is ready and active.";

      if (supabase) {
        // Test Database Table
        try {
          const { error } = await supabase
            .from("site_content")
            .select("id")
            .limit(1);

          if (error) {
            const isMissingTable = error.message?.includes("site_content") || error.message?.includes("schema cache") || error.code === "42P01";
            if (isMissingTable) {
              databaseStatus = "missing_table";
              databaseDetails = "Table 'site_content' not found in public schema.";
            } else {
              databaseStatus = "error";
              databaseDetails = error.message;
            }
          }
        } catch (dbErr: any) {
          databaseStatus = "error";
          databaseDetails = dbErr.message || "Unknown database validation issue";
        }

        // Test Storage Bucket
        try {
          const { data: buckets, error: storageErr } = await supabase.storage.listBuckets();
          if (storageErr) {
            storageStatus = "error";
            storageDetails = storageErr.message;
          } else {
            const hasBucket = buckets?.some(b => b.name === supabaseBucket);
            if (!hasBucket) {
              storageStatus = "missing_bucket";
              storageDetails = `Bucket '${supabaseBucket}' was not found in Supabase storage.`;
            } else {
              storageStatus = "connected";
              storageDetails = `uploads bucket is active and verified!`;
            }
          }
        } catch (stErr: any) {
          storageStatus = "error";
          storageDetails = stErr.message || "Unknown storage validation issue";
        }
      } else {
        databaseStatus = "not_configured";
        storageStatus = "not_configured";
      }

      let publicStoragePrefix = "";
      if (supabase && process.env.SUPABASE_URL) {
        const cleanUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
        publicStoragePrefix = `${cleanUrl}/storage/v1/object/public/${supabaseBucket}`;
      }

      res.json({
        configured: true,
        database: { status: databaseStatus, details: databaseDetails },
        storage: { status: storageStatus, details: storageDetails },
        publicStoragePrefix
      });
    } catch (err: any) {
      res.json({
        configured: false,
        error: err.message || "Status endpoint failed"
      });
    }
  });

  apiRouter.get("/content", async (req, res) => {
    try {
      // 1. Resolve local initial state
      let localData = { 
        artistName: "New Artist", 
        tracks: [], 
        albums: [], 
        videos: [],
        booking: {
          description: "For live performances, festivals, and private sets.",
          availability: "Open for bookings worldwide.",
          base: "Global",
          email: "booking@example.com"
        },
        contact: {
          managementEmail: "mgmt@example.com",
          pressEmail: "press@example.com",
          generalEmail: "hello@example.com"
        },
        images: { hero: "", portrait: "", gallery: [] } 
      };

      try {
        if (!fs.existsSync(CONTENT_FILE)) {
          fs.writeFileSync(CONTENT_FILE, JSON.stringify(localData, null, 2));
        }
        localData = JSON.parse(fs.readFileSync(CONTENT_FILE, "utf-8"));
      } catch (fsErr: any) {
        console.warn("[Local Store] Read/Write issue with local backup file site-content.json. Using in-memory configuration:", fsErr.message);
      }

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("site_content")
            .select("data")
            .eq("id", "main")
            .single();

          if (error && error.code !== "PGRST116") {
            const isMissingTable = error.message?.includes("site_content") || error.message?.includes("schema cache") || error.code === "42P01";
            if (isMissingTable) {
              console.log("[Supabase GET] Info: 'site_content' table doesn't exist yet. Falling back to local JSON storage. Run the SQL script in Admin Dashboard to sync.");
            } else {
              console.error("[Supabase GET] Database read error:", error.message || error);
            }
          } else if (data?.data) {
            console.log("[Supabase GET] Successfully loaded content from Supabase.");
            return res.json(data.data);
          } else {
            console.log("[Supabase GET] Active keys found but main content is missing in Supabase. Back-populating with local content...");
            const { error: upsertErr } = await supabase
              .from("site_content")
              .upsert({ id: "main", data: localData });
            if (upsertErr) {
              console.error("[Supabase GET] Could not back-populate data to Supabase table:", upsertErr.message);
            }
          }
        } catch (dbErr: any) {
          console.error("[Supabase GET] Unexpected db issue:", dbErr.message || dbErr);
        }
      }

      res.json(localData);
    } catch (error) {
      console.error("[GET /content Error]", error);
      res.status(500).json({ error: "Read error" });
    }
  });

  apiRouter.post("/content", requireAdmin, async (req, res) => {
    try {
      // Keep local backup sync ALWAYS active (if filesystem is writable)
      try {
        fs.writeFileSync(CONTENT_FILE, JSON.stringify(req.body, null, 2));
      } catch (fsErr: any) {
        console.warn("[Local Store] Read-only or locked filesystem. Skipped writing local site-content.json backup:", fsErr.message);
      }

      let supabaseWarning: string | undefined = undefined;

      if (supabase) {
        try {
          const { error } = await supabase
            .from("site_content")
            .upsert({ id: "main", data: req.body });

          if (error) {
            console.error("[Supabase POST] Failed to save main content to Supabase table:", error.message);
            supabaseWarning = `Saved locally! However, Supabase save failed: ${error.message}. Ensure your 'site_content' table has been created in Supabase SQL editor.`;
          } else {
            console.log("[Supabase POST] Successfully saved content to Supabase DB.");
          }
        } catch (dbErr: any) {
          console.error("[Supabase POST] db connection issue:", dbErr.message || dbErr);
          supabaseWarning = `Saved locally! However, Supabase connection error occurred: ${dbErr.message}`;
        }
      }

      res.json({ success: true, warning: supabaseWarning });
    } catch (error) {
      console.error("[POST /content Error]", error);
      res.status(500).json({ error: "Save error" });
    }
  });

  apiRouter.post("/newsletter", (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes("@")) return res.status(400).json({ error: "Invalid email" });
    res.json({ success: true });
  });

  apiRouter.get("/check-files", async (req, res) => {
    try {
      const files = fs.readdirSync(UPLOADS_DIR);
      
      if (supabase) {
        try {
          const { data, error } = await supabase.storage
            .from(supabaseBucket)
            .list("", { limit: 100 });
          
          if (error) {
            console.error("[Supabase List Files] Failed listing files:", error.message);
          } else if (data) {
            const dbFiles = data.map(f => {
              const { data: urlData } = supabase.storage
                .from(supabaseBucket)
                .getPublicUrl(f.name);
              return urlData.publicUrl;
            });
            return res.json({ files: [...files, ...dbFiles] });
          }
        } catch (dbErr: any) {
          console.error("[Supabase List Files] Exception reading storage list:", dbErr.message || dbErr);
        }
      }
      
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: "Failed to list files" });
    }
  });

  // Mount API router
  app.use("/api", apiRouter);

  // Absolute API 404 Catcher - prevents any /api requests from falling through to Vite or SPA routing fallbacks
  app.use("/api", (req, res) => {
    console.warn(`[API 404] ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `API route ${req.originalUrl} not found` });
  });

  // 4. Static Assets
  app.use("/uploads", express.static(UPLOADS_DIR));
  app.get("/uploads/*", (req, res) => {
    console.warn(`[Uploads 404] ${req.url}`);
    res.status(404).send("File not found");
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[Global Error] ${req.method} ${req.url}`, err);
    if (res.headersSent) return next(err);
    
    if (req.originalUrl.startsWith("/api")) {
      return res.status(err.status || 500).json({ 
        error: err.message || "Internal Server Error"
      });
    }
    next(err);
  });

  // 5. Build/Dev Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      console.log(`[Static Catch-all] Serving index.html for ${req.method} ${req.url}`);
      if (req.url.startsWith('/api')) {
        console.warn(`CRITICAL: API request fell through to static catch-all: ${req.url}`);
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
