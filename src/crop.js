// Crop math — ported from CLI crop.js
import { CONSTANTS, ASPECT_RATIO } from './constants.js'

/**
 * Calculate the default centered crop with 3:4 aspect ratio.
 * @param {{ width: number, height: number }} metadata
 * @param {boolean} isRotated
 * @returns {{ top: number, left: number, width: number, height: number, isRotated: boolean, originalWidth: number, originalHeight: number }}
 */
export function getDefaultCrop(metadata, isRotated) {
    const [width, height] = isRotated
        ? [metadata.height, metadata.width]
        : [metadata.width, metadata.height]

    if (width / 3 > height / 4) {
        const croppedWidth = Math.round((height * 3) / 4)
        return {
            left: Math.round((width - croppedWidth) / 2),
            top: 0,
            width: croppedWidth,
            height,
            isRotated,
            originalWidth: width,
            originalHeight: height,
        }
    } else {
        const croppedHeight = Math.round((width * 4) / 3)
        return {
            left: 0,
            top: Math.round((height - croppedHeight) / 2),
            width,
            height: croppedHeight,
            isRotated,
            originalWidth: width,
            originalHeight: height,
        }
    }
}

/**
 * Validate crop geometry against image bounds and minimum sizes.
 * @param {{ top: number, left: number, width: number, height: number }} crop
 * @param {{ width: number, height: number }} imageMetadata
 * @returns {string[]} Array of validation issue messages
 */
export function validateCrop(crop, imageMetadata) {
    const issues = []
    const { top, left, width, height } = crop
    if (top < 0) issues.push('Top offset cannot be negative')
    if (left < 0) issues.push('Left offset cannot be negative')
    if (width < CONSTANTS.minimumWidth) issues.push(`Width must be at least ${CONSTANTS.minimumWidth}`)
    if (height < CONSTANTS.minimumHeight) issues.push(`Height must be at least ${CONSTANTS.minimumHeight}`)
    if (top + height > imageMetadata.height) {
        issues.push(`Bottom edge exceeds image (${top + height} > ${imageMetadata.height})`)
    }
    if (left + width > imageMetadata.width) {
        issues.push(`Right edge exceeds image (${left + width} > ${imageMetadata.width})`)
    }
    return issues
}

/**
 * Clamp crop state to fit within image bounds.
 * @param {{ top: number, left: number, width: number, height: number }} cropState
 * @param {number} imgW
 * @param {number} imgH
 */
export function clampCrop(cropState, imgW, imgH) {
    cropState.left = Math.max(0, Math.min(cropState.left, imgW - cropState.width))
    cropState.top = Math.max(0, Math.min(cropState.top, imgH - cropState.height))

    if (cropState.left + cropState.width > imgW) {
        cropState.width = imgW - cropState.left
        cropState.height = Math.round(cropState.width / ASPECT_RATIO)
    }
    if (cropState.top + cropState.height > imgH) {
        cropState.height = imgH - cropState.top
        cropState.width = Math.round(cropState.height * ASPECT_RATIO)
    }
}
