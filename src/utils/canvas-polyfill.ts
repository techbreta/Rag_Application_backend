/**
 * Canvas and DOM API polyfills for server-side PDF processing.
 * Uses the real `canvas` npm package which provides proper DOMMatrix,
 * ImageData, and Path2D implementations.
 */

// Only set up polyfills in Node.js environment
if (typeof window === "undefined" && typeof global !== "undefined") {
  // Fix for "process.getBuiltinModule is not a function" error (Node < 22)
  if (typeof process !== "undefined" && !(process as any).getBuiltinModule) {
    (process as any).getBuiltinModule = function (id: string) {
      try {
        return require(id);
      } catch {
        return null;
      }
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const canvas = require("canvas");

    // Use real DOMMatrix from canvas package
    if (!global.DOMMatrix && canvas.DOMMatrix) {
      // @ts-ignore
      global.DOMMatrix = canvas.DOMMatrix;
    }

    // Use real ImageData from canvas package
    if (!global.ImageData && canvas.ImageData) {
      // @ts-ignore
      global.ImageData = canvas.ImageData;
    }

    // Use real Path2D from canvas package (if available)
    if (!global.Path2D) {
      if (canvas.Path2D) {
        // @ts-ignore
        global.Path2D = canvas.Path2D;
      } else {
        // Minimal fallback
        // @ts-ignore
        global.Path2D = class Path2D {
          constructor(_path?: any) {}
        };
      }
    }

    // HTMLCanvasElement polyfill
    if (!global.HTMLCanvasElement) {
      const c = canvas.createCanvas(1, 1);
      // @ts-ignore
      global.HTMLCanvasElement = c.constructor;
      // @ts-ignore
      global.CanvasRenderingContext2D = c.getContext("2d").constructor;
    }

    // Minimal document polyfill for libraries that call document.createElement("canvas")
    if (!global.document) {
      // @ts-ignore
      global.document = {
        createElement: (tagName: string) => {
          if (tagName.toLowerCase() === "canvas") {
            return canvas.createCanvas(300, 150) as any;
          }
          return {} as any;
        },
      };
    }
  } catch (error) {
    console.warn("Canvas polyfill setup warning:", (error as Error).message);
  }
}

export const ensureCanvasPolyfills = () => true;
export default ensureCanvasPolyfills;
