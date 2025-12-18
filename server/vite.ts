// import express, { type Express } from "express";
// import fs from "fs";
// import path from "path";
// import { type Server } from "http";
// import { nanoid } from "nanoid";


// export function log(message: string, source = "express") {
//   const formattedTime = new Date().toLocaleTimeString("en-US", {
//     hour: "numeric",
//     minute: "2-digit",
//     second: "2-digit",
//     hour12: true,
//   });

//   console.log(`${formattedTime} [${source}] ${message}`);
// }

// export async function setupVite(app: Express, server: Server) {
//   try {
//     // Dynamic import to avoid ES module conflicts
//     const vite = await import('vite');
    
//     const serverOptions = {
//       middlewareMode: true,
//       hmr: { server },
//       allowedHosts: true as const,
//     };

//     const viteServer = await vite.createServer({
//       configFile: false,
//       root: path.resolve(process.cwd(), "..", "client"),
//       server: serverOptions,
//       appType: "custom",
//       customLogger: {
//         info: (msg: string) => log(msg, "vite"),
//         warn: (msg: string) => console.warn(`[vite] ${msg}`),
//         error: (msg: string) => {
//           console.error(`[vite] ${msg}`);
//           // Don't exit process in development
//         },
//       },
//     });

//     app.use(viteServer.middlewares);
    
//     // Catch-all route for SPA
//     app.use("*", async (req, res, next) => {
//       const url = req.originalUrl;

//       // Skip API routes
//       if (url.startsWith("/api")) {
//         return next();
//       }

//       try {
//         const clientTemplate = path.resolve(
//           process.cwd(), 
//           "..", 
//           "client", 
//           "index.html"
//         );

//         if (!fs.existsSync(clientTemplate)) {
//           log(`Client template not found: ${clientTemplate}`, "vite");
//           return res.status(404).send("Client not available");
//         }

//         let template = await fs.promises.readFile(clientTemplate, "utf-8");
        
//         // Add cache busting for development
//         template = template.replace(
//           `src="/src/main.tsx"`,
//           `src="/src/main.tsx?v=${nanoid()}"`,
//         );
        
//         const html = await viteServer.transformIndexHtml(url, template);
//         res.status(200).set({ "Content-Type": "text/html" }).end(html);
//       } catch (e) {
//         if (e instanceof Error) {
//           viteServer.ssrFixStacktrace(e);
//         }
//         next(e);
//       }
//     });

//     log("Vite development server setup complete");
//     return viteServer;
//   } catch (error) {
//     console.error("Failed to setup Vite:", error);
//     // Don't throw, just log and continue without Vite
//     log("Continuing without Vite development server", "vite");
//     return null;
//   }
// }

// export function serveStatic(app: Express) {
//   const distPath = path.resolve(process.cwd(), "..", "dist", "public");

//   if (!fs.existsSync(distPath)) {
//     log(`Static directory not found: ${distPath}`, "static");
//     return;
//   }

//   app.use(express.static(distPath));

//   // Catch-all route for SPA in production
//   app.use("*", (req, res, next) => {
//     // Skip API routes
//     if (req.originalUrl.startsWith("/api")) {
//       return next();
//     }
    
//     res.sendFile(path.resolve(distPath, "index.html"));
//   });

//   log(`Serving static files from: ${distPath}`, "static");
// 





// server/vite.ts (minimal)
export function log(message: string, source = "vite") {
  console.log(`[${source}] ${message}`);
}

export async function setupVite(_app: any, _server: any) {
  log("Vite is disabled - running in API-only mode");
}

export function serveStatic(_app: any) {
  log("Static serving is disabled - running in API-only mode");
}