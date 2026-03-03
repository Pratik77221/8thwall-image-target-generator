// Image processing pipeline — replaces CLI's apply.js + sharp
// Uses Canvas API for all image operations.

import { CONSTANTS } from './constants.js'

/**
 * Crop an image, optionally rotating 90° first.
 * @param {HTMLImageElement} sourceImg
 * @param {{ left: number, top: number, width: number, height: number, isRotated: boolean }} crop
 * @returns {HTMLCanvasElement}
 */
export function cropImage(sourceImg, crop) {
    // Step 1: rotate if needed
    let canvas, ctx
    if (crop.isRotated) {
        canvas = document.createElement('canvas')
        canvas.width = sourceImg.naturalHeight
        canvas.height = sourceImg.naturalWidth
        ctx = canvas.getContext('2d')
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate(Math.PI / 2)
        ctx.drawImage(sourceImg, -sourceImg.naturalWidth / 2, -sourceImg.naturalHeight / 2)
    } else {
        canvas = document.createElement('canvas')
        canvas.width = sourceImg.naturalWidth
        canvas.height = sourceImg.naturalHeight
        ctx = canvas.getContext('2d')
        ctx.drawImage(sourceImg, 0, 0)
    }

    // Step 2: extract crop region
    const result = document.createElement('canvas')
    result.width = crop.width
    result.height = crop.height
    const rctx = result.getContext('2d')
    rctx.drawImage(canvas, crop.left, crop.top, crop.width, crop.height, 0, 0, crop.width, crop.height)
    return result
}

/**
 * Get the original image canvas, optionally rotated.
 * @param {HTMLImageElement} sourceImg
 * @param {boolean} isRotated
 * @returns {HTMLCanvasElement}
 */
export function getOriginalCanvas(sourceImg, isRotated) {
    const canvas = document.createElement('canvas')
    if (isRotated) {
        canvas.width = sourceImg.naturalHeight
        canvas.height = sourceImg.naturalWidth
        const ctx = canvas.getContext('2d')
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate(Math.PI / 2)
        ctx.drawImage(sourceImg, -sourceImg.naturalWidth / 2, -sourceImg.naturalHeight / 2)
    } else {
        canvas.width = sourceImg.naturalWidth
        canvas.height = sourceImg.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(sourceImg, 0, 0)
    }
    return canvas
}

/**
 * Resize a canvas to a target height, preserving aspect ratio.
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {number} targetHeight
 * @returns {HTMLCanvasElement}
 */
export function resizeCanvas(sourceCanvas, targetHeight) {
    const ratio = targetHeight / sourceCanvas.height
    const targetWidth = Math.round(sourceCanvas.width * ratio)
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight)
    return canvas
}

/**
 * Convert a canvas to grayscale using ITU-R BT.601 luminance.
 * @param {HTMLCanvasElement} sourceCanvas
 * @returns {HTMLCanvasElement}
 */
export function grayscaleCanvas(sourceCanvas) {
    const canvas = document.createElement('canvas')
    canvas.width = sourceCanvas.width
    canvas.height = sourceCanvas.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(sourceCanvas, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        data[i] = data[i + 1] = data[i + 2] = lum
    }
    ctx.putImageData(imageData, 0, 0)
    return canvas
}

/**
 * Convert a canvas to a Blob.
 * @param {HTMLCanvasElement} canvas
 * @param {string} format - 'jpg', 'png', or 'webp'
 * @returns {Promise<Blob>}
 */
export function canvasToBlob(canvas, format) {
    const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg'
    const quality = format === 'png' ? undefined : 0.92
    return new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality))
}

/**
 * Run the full processing pipeline: original, cropped, thumbnail, luminance.
 * @param {HTMLImageElement} sourceImg
 * @param {{ left: number, top: number, width: number, height: number, isRotated: boolean }} crop
 * @param {string} format
 * @returns {{ originalCanvas, croppedCanvas, thumbnailCanvas, luminanceCanvas }}
 */
export function processImage(sourceImg, crop, format) {
    const originalCanvas = getOriginalCanvas(sourceImg, crop.isRotated)
    const croppedCanvas = cropImage(sourceImg, crop)
    const thumbnailCanvas = resizeCanvas(croppedCanvas, CONSTANTS.thumbnailHeight)
    const luminanceCanvas = grayscaleCanvas(resizeCanvas(croppedCanvas, CONSTANTS.luminanceHeight))

    return { originalCanvas, croppedCanvas, thumbnailCanvas, luminanceCanvas }
}
