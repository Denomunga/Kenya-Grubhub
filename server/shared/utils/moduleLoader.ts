/**
 * Module loader utility - loads all modules and registers their routes
 */
import { Express } from 'express';
import path from 'path';
import fs from 'fs';

export interface ModuleConfig {
  prefix: string;
  routes: any;
}

/**
 * Load and register all modules
 */
export async function loadModules(app: Express, modulesDir: string) {
  const modules: { [key: string]: ModuleConfig } = {};

  try {
    const moduleDirectories = fs.readdirSync(modulesDir).filter(file => {
      const fullPath = path.join(modulesDir, file);
      return fs.statSync(fullPath).isDirectory();
    });

    for (const module of moduleDirectories) {
      try {
        const routesPath = path.join(modulesDir, module, 'routes.ts');

        if (fs.existsSync(routesPath)) {
          // Dynamic import
          const { default: routes } = await import(routesPath);

          const prefix = `/api/v1/${module}`;
          app.use(prefix, routes);

          modules[module] = {
            prefix,
            routes
          };

          console.log(`✓ Loaded module: ${module} at ${prefix}`);
        }
      } catch (error: any) {
        console.error(`✗ Failed to load module ${module}:`, error?.message || String(error));
      }
    }

    console.log(`\n✓ Loaded ${Object.keys(modules).length} modules successfully`);
    return modules;
  } catch (error) {
    console.error('Error loading modules:', error);
    throw error;
  }
}

/**
 * Get module info
 */
export function getModuleInfo(moduleConfig: ModuleConfig) {
  return {
    prefix: moduleConfig.prefix,
    routesExists: !!moduleConfig.routes
  };
}