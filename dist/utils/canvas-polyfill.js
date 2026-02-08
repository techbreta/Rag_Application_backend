"use strict";
/**
 * Canvas and DOM API polyfills for server-side PDF processing.
 * Uses the real `canvas` npm package which provides proper DOMMatrix,
 * ImageData, and Path2D implementations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureCanvasPolyfills = void 0;
// Only set up polyfills in Node.js environment
if (typeof window === "undefined" && typeof global !== "undefined") {
    // Fix for "process.getBuiltinModule is not a function" error (Node < 22)
    if (typeof process !== "undefined" && !process.getBuiltinModule) {
        process.getBuiltinModule = function (id) {
            try {
                return require(id);
            }
            catch {
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
            }
            else {
                // Minimal fallback
                // @ts-ignore
                global.Path2D = class Path2D {
                    constructor(_path) { }
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
                createElement: (tagName) => {
                    if (tagName.toLowerCase() === "canvas") {
                        return canvas.createCanvas(300, 150);
                    }
                    return {};
                },
            };
        }
    }
    catch (error) {
        console.warn("Canvas polyfill setup warning:", error.message);
    }
}
const ensureCanvasPolyfills = () => true;
exports.ensureCanvasPolyfills = ensureCanvasPolyfills;
exports.default = exports.ensureCanvasPolyfills;
