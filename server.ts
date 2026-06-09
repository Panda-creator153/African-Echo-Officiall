import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import os from "os";
import admin from "firebase-admin";

// Supabase Init & Configuration Loader (Supports environment variables and supabase-config.json with hardcoded defaults)
let supabaseUrl = process.env.SUPABASE_URL || "https://sfnlwvcetlawgstbovui.supabase.co";
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmx3dmNldGxhd2dzdGJvdnVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA5OTQyOSwiZXhwIjoyMDkzNjc1NDI5fQ.oXl3ZxafxiKz2EPnbSlca251wflDnFMqyFnPaWEj2Yg";
let supabaseBucket = process.env.SUPABASE_BUCKET_NAME || "Upload";

const SUPABASE_CONFIG_PATH = path.join(process.cwd(), "supabase-config.json");

// If we have valid credentials in process.env, proactively write/sync them into supabase-config.json so it gets populated
const envSupabaseUrl = (process.env.SUPABASE_URL || "").trim();
const envSupabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim();

if (envSupabaseUrl.startsWith("https://") && envSupabaseKey.length > 10) {
  try {
    const freshConfig = {
      supabaseUrl: envSupabaseUrl,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      supabaseBucketName: process.env.SUPABASE_BUCKET_NAME || "Upload"
    };
    fs.writeFileSync(SUPABASE_CONFIG_PATH, JSON.stringify(freshConfig, null, 2), "utf8");
    console.log("[Supabase Server] Successfully synced environment secrets into supabase-config.json.");
    
    // Ensure let variables are also holding these updated values
    supabaseUrl = freshConfig.supabaseUrl;
    supabaseKey = freshConfig.supabaseServiceRoleKey || freshConfig.supabaseAnonKey;
    if (process.env.SUPABASE_BUCKET_NAME) {
      supabaseBucket = process.env.SUPABASE_BUCKET_NAME;
    }
  } catch (err: any) {
    console.warn("[Supabase Server] Failed to save secrets to supabase-config.json:", err.message);
  }
} else if (fs.existsSync(SUPABASE_CONFIG_PATH)) {
  // Otherwise, load them from the file if available
  try {
    const fileContent = fs.readFileSync(SUPABASE_CONFIG_PATH, "utf8");
    const parsedConfig = JSON.parse(fileContent);
    if (parsedConfig) {
      if (parsedConfig.supabaseUrl) {
        supabaseUrl = parsedConfig.supabaseUrl;
      }
      if (parsedConfig.supabaseServiceRoleKey || parsedConfig.supabaseAnonKey) {
        supabaseKey = parsedConfig.supabaseServiceRoleKey || parsedConfig.supabaseAnonKey;
      }
      if (parsedConfig.supabaseBucketName) {
        supabaseBucket = parsedConfig.supabaseBucketName;
      }
    }
  } catch (error: any) {
    console.warn("[Supabase Server] Failed to read supabase-config.json:", error.message || error);
  }
}

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (supabase) {
  console.log("[Supabase Server] Core client initialized.");
} else {
  console.warn("[Supabase Server] Keys missing in environment. Local fallback active.");
}

// --- Firebase Admin SDK Setup ---
const FIREBASE_CONFIG_PATH = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseAdminDb: any = null;

try {
  if (fs.existsSync(FIREBASE_CONFIG_PATH)) {
    const configData = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_PATH, "utf-8"));
    if (configData && configData.projectId) {
      if (admin.apps.length === 0) {
        admin.initializeApp({
          projectId: configData.projectId
        });
      }
      firebaseAdminDb = admin.firestore(configData.firestoreDatabaseId || undefined);
      console.log(`[Firebase Server Admin] Successfully initialized for projectId: ${configData.projectId}, DB: ${configData.firestoreDatabaseId || "default"}`);
    }
  } else {
    console.warn("[Firebase Server Admin] Config file firebase-applet-config.json not found.");
  }
} catch (e: any) {
  console.error("[Firebase Server Admin] Exception during init:", e.message);
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

function getPlaceholderSvg(filename: string): string {
  let title = "African Echo";
  let subtitle = "Official Asset";
  let type: "hero" | "portrait" | "vinyl" | "gallery" = "gallery";

  if (filename.includes("1779062374784") || filename.includes("hero")) {
    title = "African Echo";
    subtitle = "Ugandan Singer & Songwriter based in Kampala";
    type = "hero";
  } else if (filename.includes("1779062385599") || filename.includes("portrait")) {
    title = "African Echo";
    subtitle = "Official Portrait";
    type = "portrait";
  } else if (filename.includes("1779059927958")) {
    title = "OWOMESA";
    subtitle = "Single by African Echo";
    type = "vinyl";
  } else if (filename.includes("1779065828285")) {
    title = "Your Love";
    subtitle = "Track by African Echo";
    type = "vinyl";
  } else if (filename.includes("1779066414277")) {
    title = "Monalisa";
    subtitle = "Track by African Echo";
    type = "vinyl";
  } else if (filename.includes("1779066825429")) {
    title = "Party";
    subtitle = "Track by African Echo";
    type = "vinyl";
  } else if (filename.includes("1779066953182")) {
    title = "Your Love EP";
    subtitle = "EP by African Echo";
    type = "vinyl";
  } else if (filename.includes("1779067551431")) {
    title = "Owomesa Live";
    subtitle = "African Echo Gallery";
    type = "gallery";
  } else if (filename.includes("1779067603127")) {
    title = "Live Performance";
    subtitle = "Kampala Music";
    type = "gallery";
  } else if (filename.includes("1779067694988")) {
    title = "Studio Session";
    subtitle = "African Echo Gallery";
    type = "gallery";
  } else if (filename.includes("1779068062724")) {
    title = "Behind The Scenes";
    subtitle = "Ugandan Songwriter";
    type = "gallery";
  } else if (filename.includes("1779068141474")) {
    title = "Uganda Vibes";
    subtitle = "African Echo Gallery";
    type = "gallery";
  } else if (filename.includes("1779068235778")) {
    title = "On Stage";
    subtitle = "Live in Kampala";
    type = "gallery";
  }

  // Choose aspect ratio / sizes matching the context
  let width = 800;
  let height = 800;
  if (type === "hero") {
    width = 1600;
    height = 900;
  } else if (type === "portrait") {
    width = 600;
    height = 800;
  }

  let backgroundGradient = `
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1e1b18;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#120f0d;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0d0a08;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#d4af37;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#f3e5ab;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="sunset" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#f0932b;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#eb4c3b;stop-opacity:1" />
      </linearGradient>
    </defs>
  `;

  let innerContent = "";

  if (type === "hero") {
    innerContent = `
      <g stroke="url(#gold)" stroke-width="2" fill="none" opacity="0.15">
        <path d="M 0,450 Q 400,300 800,450 T 1600,450" />
        <path d="M 0,480 Q 400,380 800,420 T 1600,480" />
        <path d="M 0,510 Q 400,460 800,390 T 1600,510" />
      </g>
      
      <circle cx="800" cy="450" r="400" fill="url(#sunset)" opacity="0.08" />

      <g transform="translate(150, 450)">
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="900" font-size="84" letter-spacing="-1.5" fill="url(#gold)" y="-20">${title.toUpperCase()}</text>
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="300" font-size="28" letter-spacing="4" fill="#a8a29e" y="40">${subtitle.toUpperCase()}</text>
        <rect x="0" y="80" width="120" height="4" fill="url(#sunset)" rx="2" />
      </g>
    `;
  } else if (type === "portrait") {
    innerContent = `
      <g transform="translate(300, 400)">
        <circle cx="0" cy="-100" r="70" fill="none" stroke="url(#gold)" stroke-width="2" opacity="0.4" />
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="300" font-size="44" fill="url(#gold)" text-anchor="middle" dominant-baseline="central" y="-103" letter-spacing="2">AE</text>
        
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="800" font-size="36" fill="#f5f5f4" text-anchor="middle" y="20" letter-spacing="1">${title.toUpperCase()}</text>
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="400" font-size="16" fill="#a8a29e" text-anchor="middle" y="60" letter-spacing="3">${subtitle.toUpperCase()}</text>
        
        <line x1="-40" y1="90" x2="40" y2="90" stroke="url(#sunset)" stroke-width="2" />
      </g>
    `;
  } else if (type === "vinyl") {
    innerContent = `
      <g opacity="0.7" transform="translate(400, 320)">
        <circle cx="0" cy="0" r="160" fill="#18181b" stroke="#27272a" stroke-width="6" />
        <circle cx="0" cy="0" r="140" fill="none" stroke="#27272a" stroke-dasharray="10 5" stroke-width="1" />
        <circle cx="0" cy="0" r="120" fill="none" stroke="#27272a" stroke-width="1" />
        <circle cx="0" cy="0" r="100" fill="none" stroke="#27272a" stroke-dasharray="15 6" stroke-width="1" />
        <circle cx="0" cy="0" r="80" fill="none" stroke="#27272a" stroke-width="1" />
        <circle cx="0" cy="0" r="60" fill="url(#sunset)" />
        <circle cx="0" cy="0" r="20" fill="#0d0a08" />
        <circle cx="0" cy="0" r="6" fill="#1e1b18" />
      </g>

      <g transform="translate(400, 560)">
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="800" font-size="38" fill="#f5f5f4" text-anchor="middle" letter-spacing="-0.5">${title}</text>
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="400" font-size="16" fill="url(#gold)" text-anchor="middle" y="35" letter-spacing="4">${subtitle.toUpperCase()}</text>
        
        <text font-family="'JetBrains Mono', monospace" font-size="11" fill="#78716c" text-anchor="middle" y="90" letter-spacing="1">TEMPORARY PLACEHOLDER | RE-UPLOAD COVER IN DASHBOARD</text>
      </g>
    `;
  } else {
    innerContent = `
      <g transform="translate(400, 400)">
        <circle cx="0" cy="-60" r="50" fill="none" stroke="url(#gold)" stroke-width="2" stroke-dasharray="30 10" />
        <circle cx="0" cy="-60" r="25" fill="none" stroke="url(#sunset)" stroke-width="1.5" />
        
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="700" font-size="32" fill="#e7e5e4" text-anchor="middle" y="40" letter-spacing="-0.5">${title}</text>
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="300" font-size="15" fill="#a8a29e" text-anchor="middle" y="75" letter-spacing="3">${subtitle.toUpperCase()}</text>
      </g>
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
      ${backgroundGradient}
      <rect width="100%" height="100%" fill="url(#bg)" />
      <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="#2e2a24" stroke-width="1" opacity="0.3" rx="8" />
      ${innerContent}
    </svg>
  `.trim();
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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
      const hasUrl = !!supabaseUrl;
      const hasKey = !!supabaseKey;
      const isConfigured = hasUrl && hasKey;

      if (!isConfigured) {
        return res.json({
          configured: false,
          database: { status: "not_configured", details: "SUPABASE_URL or API keys are missing in env setup and supabase-config.json." },
          storage: { status: "not_configured", details: "SUPABASE_URL or API keys are missing in env setup and supabase-config.json." }
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
      if (supabase && supabaseUrl) {
        const cleanUrl = supabaseUrl.replace(/\/$/, "");
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

  // --- Admin Firebase Submissions Proxies ---
  const getCollectionSorted = async (collectionName: string) => {
    if (!firebaseAdminDb) throw new Error("Firebase Admin is not initialized");
    const collectionRef = firebaseAdminDb.collection(collectionName);
    let docsArr: any[] = [];
    try {
      const snapshot = await collectionRef.orderBy("createdAt", "desc").get();
      docsArr = snapshot.docs;
    } catch (err: any) {
      console.warn(`[Firebase Server] Missing index or query limit for '${collectionName}' orderBy, sorting in memory...`);
      const snapshot = await collectionRef.get();
      docsArr = snapshot.docs;
      docsArr.sort((a, b) => {
        const timeA = a.data().createdAt?.seconds || a.data().createdAt?._seconds || 0;
        const timeB = b.data().createdAt?.seconds || b.data().createdAt?._seconds || 0;
        return timeB - timeA;
      });
    }
    return docsArr.map(doc => {
      const data = doc.data();
      for (const key of Object.keys(data)) {
        if (data[key] && typeof data[key].toDate === "function") {
          const date = data[key].toDate();
          data[key] = {
            seconds: Math.floor(date.getTime() / 1000),
            nanoseconds: (date.getTime() % 1000) * 1e6
          };
        } else if (data[key] && typeof data[key] === "object") {
          const sec = data[key].seconds ?? data[key]._seconds;
          const nano = data[key].nanoseconds ?? data[key]._nanoseconds;
          if (sec !== undefined) {
            data[key] = {
              seconds: sec,
              nanoseconds: nano ?? 0
            };
          }
        }
      }
      return { id: doc.id, ...data };
    });
  };

  // 1. Bookings Endpoints
  apiRouter.get("/admin/bookings", requireAdmin, async (req, res) => {
    try {
      const bookings = await getCollectionSorted("bookings");
      res.json(bookings);
    } catch (err: any) {
      console.error("[API/admin/bookings] Error:", err);
      res.status(500).json({ error: err.message || "Failed to load bookings" });
    }
  });

  apiRouter.put("/admin/bookings/:id", requireAdmin, async (req, res) => {
    try {
      if (!firebaseAdminDb) return res.status(500).json({ error: "Firebase Admin is not initialized" });
      const { id } = req.params;
      const { status } = req.body;
      await firebaseAdminDb.collection("bookings").doc(id).update({ status });
      res.json({ success: true });
    } catch (err: any) {
      console.error("[API/admin/bookings/PUT] Error:", err);
      res.status(500).json({ error: err.message || "Failed to update booking" });
    }
  });

  apiRouter.delete("/admin/bookings/:id", requireAdmin, async (req, res) => {
    try {
      if (!firebaseAdminDb) return res.status(500).json({ error: "Firebase Admin is not initialized" });
      const { id } = req.params;
      await firebaseAdminDb.collection("bookings").doc(id).delete();
      res.json({ success: true });
    } catch (err: any) {
      console.error("[API/admin/bookings/DELETE] Error:", err);
      res.status(500).json({ error: err.message || "Failed to delete booking" });
    }
  });

  // 2. Contacts Endpoints
  apiRouter.get("/admin/contacts", requireAdmin, async (req, res) => {
    try {
      const contacts = await getCollectionSorted("contacts");
      res.json(contacts);
    } catch (err: any) {
      console.error("[API/admin/contacts] Error:", err);
      res.status(500).json({ error: err.message || "Failed to load contacts" });
    }
  });

  apiRouter.delete("/admin/contacts/:id", requireAdmin, async (req, res) => {
    try {
      if (!firebaseAdminDb) return res.status(500).json({ error: "Firebase Admin is not initialized" });
      const { id } = req.params;
      await firebaseAdminDb.collection("contacts").doc(id).delete();
      res.json({ success: true });
    } catch (err: any) {
      console.error("[API/admin/contacts/DELETE] Error:", err);
      res.status(500).json({ error: err.message || "Failed to delete contact" });
    }
  });

  // 3. Newsletter Subscribers Endpoints
  apiRouter.get("/admin/subscribers", requireAdmin, async (req, res) => {
    try {
      const subscribers = await getCollectionSorted("subscribers");
      res.json(subscribers);
    } catch (err: any) {
      console.error("[API/admin/subscribers] Error:", err);
      res.status(500).json({ error: err.message || "Failed to load subscribers" });
    }
  });

  apiRouter.delete("/admin/subscribers/:id", requireAdmin, async (req, res) => {
    try {
      if (!firebaseAdminDb) return res.status(500).json({ error: "Firebase Admin is not initialized" });
      const { id } = req.params;
      await firebaseAdminDb.collection("subscribers").doc(id).delete();
      res.json({ success: true });
    } catch (err: any) {
      console.error("[API/admin/subscribers/DELETE] Error:", err);
      res.status(500).json({ error: err.message || "Failed to delete subscriber" });
    }
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
    console.warn(`[Uploads 404/Fallback] Serving elegant dynamic placeholder SVG for: ${req.url}`);
    const filename = path.basename(req.path);
    const svgStr = getPlaceholderSvg(filename);
    res.setHeader("Content-Type", "image/svg+xml");
    res.status(200).send(svgStr);
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
