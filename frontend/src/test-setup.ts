import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
  teardown: { destroyAfterEach: true },
});

/**
 * Before each spec file runs, resolve any pending Angular JIT component
 * resources (templateUrl / styleUrl) so TestBed.configureTestingModule
 * can process standalone components without throwing.
 *
 * We construct the absolute file URL of Angular's internal debug chunk and
 * load resolveComponentResources via a dynamic import, bypassing Vite's
 * package-exports check.
 */
beforeAll(async () => {
  // Build the absolute file:// URL for Angular's internal fesm chunk.
  const chunkAbsPath = join(
    process.cwd(),
    'node_modules',
    '@angular',
    'core',
    'fesm2022',
    '_debug_node-chunk.mjs',
  );
  const chunkUrl = pathToFileURL(chunkAbsPath).href;

  const { resolveComponentResources } = (await import(
    /* @vite-ignore */
    chunkUrl
  )) as {
    resolveComponentResources: (
      resolver: (url: string) => Promise<{ text(): Promise<string> }>,
    ) => Promise<void>;
  };

  const srcAppDir = join(process.cwd(), 'src', 'app');

  await resolveComponentResources((url: string) => {
    const relativePath = url.replace(/^\.\//, '');
    try {
      const content = readFileSync(join(srcAppDir, relativePath), 'utf-8');
      return Promise.resolve({ text: () => Promise.resolve(content) } as Response);
    } catch {
      return Promise.resolve({ text: () => Promise.resolve('') } as Response);
    }
  });
});




