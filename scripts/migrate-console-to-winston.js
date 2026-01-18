/**
 * jscodeshift codemod to migrate console.* to logger wrapper
 *
 * Usage:
 *   npx jscodeshift -t scripts/migrate-console-to-winston.js <file> --dry
 *   npx jscodeshift -t scripts/migrate-console-to-winston.js <file>
 *
 * Changes:
 *   console.log()   → log()
 *   console.error() → error()
 *   console.warn()  → warn()
 *   console.debug() → debug()
 *   console.info()  → log()
 *
 * Import added:
 *   import { log, error, warn, debug } from '@/lib/logger-wrapper';
 */

module.exports = function(fileInfo, api, options) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  let hasChanges = false;
  const methodsUsed = new Set();

  // Map console methods to logger methods
  const methodMap = {
    'log': 'log',
    'error': 'error',
    'warn': 'warn',
    'debug': 'debug',
    'info': 'log',  // console.info → log
  };

  // Find all console.* calls and track which methods are used
  Object.keys(methodMap).forEach(consoleMethod => {
    const loggerMethod = methodMap[consoleMethod];

    const matches = root.find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: { name: 'console' },
        property: { name: consoleMethod }
      }
    });

    if (matches.length > 0) {
      methodsUsed.add(loggerMethod);

      matches.forEach(path => {
        // Replace console.method() with logger method()
        path.node.callee = j.identifier(loggerMethod);
        hasChanges = true;
      });
    }
  });

  if (!hasChanges) {
    return null; // No changes needed
  }

  // Check if logger import already exists
  const existingImport = root.find(j.ImportDeclaration, {
    source: { value: '@/lib/logger-wrapper' }
  });

  if (existingImport.length === 0) {
    // Create named import for only the methods that are used
    const specifiers = Array.from(methodsUsed).map(method =>
      j.importSpecifier(j.identifier(method))
    );

    const loggerImport = j.importDeclaration(
      specifiers,
      j.literal('@/lib/logger-wrapper')
    );

    // Insert import at the top, after existing imports
    const firstImport = root.find(j.ImportDeclaration).at(0);
    if (firstImport.length > 0) {
      firstImport.insertBefore(loggerImport);
    } else {
      // No imports exist, add at the beginning
      root.get().node.program.body.unshift(loggerImport);
    }
  } else {
    // Import exists, check if we need to add more specifiers
    existingImport.forEach(path => {
      const existingSpecifiers = new Set(
        path.node.specifiers.map(s => s.imported.name)
      );

      methodsUsed.forEach(method => {
        if (!existingSpecifiers.has(method)) {
          path.node.specifiers.push(
            j.importSpecifier(j.identifier(method))
          );
        }
      });
    });
  }

  return root.toSource({ quote: 'single' });
};
