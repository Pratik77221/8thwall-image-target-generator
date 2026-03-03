// Interactive crop tool — handles drag, draw, and resize interactions
// Maintains 3:4 aspect ratio for 8th Wall compatibility.

import { ASPECT_RATIO } from './constants.js'
import { clampCrop } from './crop.js'

/**
 * @param {HTMLImageElement} imagePreview - the <img> element
 * @returns {{ sx: number, sy: number }}
 */
function getScale(imagePreview, loadedImage) {
    return {
        sx: imagePreview.clientWidth / loadedImage.naturalWidth,
        sy: imagePreview.clientHeight / loadedImage.naturalHeight,
    }
}

/**
 * Get mouse position in image-pixel coordinates.
 */
function getMousePosOnImage(e, imagePreview, loadedImage) {
    const rect = imagePreview.getBoundingClientRect()
    const { sx, sy } = getScale(imagePreview, loadedImage)
    return {
        x: (e.clientX - rect.left) / sx,
        y: (e.clientY - rect.top) / sy,
    }
}

/**
 * Render the crop overlay to match the current cropState.
 */
export function renderCropOverlay(cropState, cropOverlay, cropSizeBadge, imagePreview, loadedImage) {
    if (!loadedImage || cropState.width <= 0 || cropState.height <= 0) {
        cropOverlay.classList.add('hidden')
        return
    }

    cropOverlay.classList.remove('hidden')
    const { sx, sy } = getScale(imagePreview, loadedImage)

    cropOverlay.style.left = (cropState.left * sx) + 'px'
    cropOverlay.style.top = (cropState.top * sy) + 'px'
    cropOverlay.style.width = (cropState.width * sx) + 'px'
    cropOverlay.style.height = (cropState.height * sy) + 'px'

    cropSizeBadge.textContent = `${Math.round(cropState.width)} × ${Math.round(cropState.height)}  (3:4)`
}

/**
 * Initialize interactive crop on the preview area.
 * @param {object} elements - DOM elements
 * @param {object} state - shared app state
 * @param {Function} onCropChange - callback when crop changes
 */
export function initInteractiveCrop(elements, state, onCropChange) {
    const { previewWrapper, imagePreview, cropOverlay, useDefaultCrop } = elements
    let interaction = null

    // --- MOVE: drag the overlay ---
    cropOverlay.addEventListener('mousedown', (e) => {
        if (useDefaultCrop.checked) return
        if (e.target.dataset.handle) return
        e.preventDefault()
        e.stopPropagation()

        const pos = getMousePosOnImage(e, imagePreview, state.loadedImage)
        interaction = {
            type: 'move',
            startX: pos.x,
            startY: pos.y,
            origLeft: state.cropState.left,
            origTop: state.cropState.top,
        }
    })

    // --- RESIZE: drag a corner handle ---
    document.querySelectorAll('.crop-handle').forEach((handle) => {
        handle.addEventListener('mousedown', (e) => {
            if (useDefaultCrop.checked) return
            e.preventDefault()
            e.stopPropagation()

            const pos = getMousePosOnImage(e, imagePreview, state.loadedImage)
            interaction = {
                type: 'resize',
                handle: e.target.dataset.handle,
                startX: pos.x,
                startY: pos.y,
                origLeft: state.cropState.left,
                origTop: state.cropState.top,
                origWidth: state.cropState.width,
                origHeight: state.cropState.height,
            }
        })
    })

    // --- DRAW: click on the image to draw a new crop ---
    previewWrapper.addEventListener('mousedown', (e) => {
        if (useDefaultCrop.checked) return
        if (e.target === cropOverlay || e.target.classList.contains('crop-handle')) return
        if (!state.loadedImage) return
        e.preventDefault()

        const pos = getMousePosOnImage(e, imagePreview, state.loadedImage)
        previewWrapper.classList.add('drawing')
        interaction = {
            type: 'draw',
            startX: pos.x,
            startY: pos.y,
        }
        state.cropState.left = pos.x
        state.cropState.top = pos.y
        state.cropState.width = 0
        state.cropState.height = 0
        onCropChange()
    })

    // --- Global mouse move ---
    document.addEventListener('mousemove', (e) => {
        if (!interaction || !state.loadedImage) return
        e.preventDefault()

        const pos = getMousePosOnImage(e, imagePreview, state.loadedImage)
        const imgW = state.loadedImage.naturalWidth
        const imgH = state.loadedImage.naturalHeight

        if (interaction.type === 'move') {
            handleMove(pos, interaction, state.cropState, imgW, imgH)
        } else if (interaction.type === 'draw') {
            handleDraw(pos, interaction, state.cropState, imgW, imgH)
        } else if (interaction.type === 'resize') {
            handleResize(pos, interaction, state.cropState, imgW, imgH)
        }

        onCropChange()
    })

    // --- Global mouse up ---
    document.addEventListener('mouseup', () => {
        if (interaction) {
            previewWrapper.classList.remove('drawing')
            interaction = null
        }
    })
}

// ---- Interaction handlers ----

function handleMove(pos, interaction, cropState, imgW, imgH) {
    const dx = pos.x - interaction.startX
    const dy = pos.y - interaction.startY
    cropState.left = interaction.origLeft + dx
    cropState.top = interaction.origTop + dy
    clampCrop(cropState, imgW, imgH)
}

function handleDraw(pos, interaction, cropState, imgW, imgH) {
    let dx = pos.x - interaction.startX
    let dy = pos.y - interaction.startY

    let w = Math.abs(dx)
    let h = Math.round(w / ASPECT_RATIO)

    if (Math.abs(dy) / (4 / 3) > Math.abs(dx) / (3 / 4)) {
        h = Math.abs(dy)
        w = Math.round(h * ASPECT_RATIO)
    }

    w = Math.max(w, 10)
    h = Math.max(Math.round(w / ASPECT_RATIO), 10)

    let left = dx >= 0 ? interaction.startX : interaction.startX - w
    let top = dy >= 0 ? interaction.startY : interaction.startY - h

    left = Math.max(0, Math.min(left, imgW - w))
    top = Math.max(0, Math.min(top, imgH - h))

    if (left + w > imgW) w = imgW - left
    if (top + h > imgH) h = imgH - top
    h = Math.round(w / ASPECT_RATIO)

    cropState.left = left
    cropState.top = top
    cropState.width = w
    cropState.height = h
}

function handleResize(pos, interaction, cropState, imgW, imgH) {
    const handle = interaction.handle
    const dx = pos.x - interaction.startX

    let newLeft = interaction.origLeft
    let newTop = interaction.origTop
    let newWidth = interaction.origWidth
    let newHeight = interaction.origHeight

    if (handle === 'br') {
        newWidth = Math.max(50, interaction.origWidth + dx)
        newHeight = Math.round(newWidth / ASPECT_RATIO)
    } else if (handle === 'bl') {
        newWidth = Math.max(50, interaction.origWidth - dx)
        newHeight = Math.round(newWidth / ASPECT_RATIO)
        newLeft = interaction.origLeft + interaction.origWidth - newWidth
    } else if (handle === 'tr') {
        newWidth = Math.max(50, interaction.origWidth + dx)
        newHeight = Math.round(newWidth / ASPECT_RATIO)
        newTop = interaction.origTop + interaction.origHeight - newHeight
    } else if (handle === 'tl') {
        newWidth = Math.max(50, interaction.origWidth - dx)
        newHeight = Math.round(newWidth / ASPECT_RATIO)
        newLeft = interaction.origLeft + interaction.origWidth - newWidth
        newTop = interaction.origTop + interaction.origHeight - newHeight
    }

    newLeft = Math.max(0, newLeft)
    newTop = Math.max(0, newTop)
    if (newLeft + newWidth > imgW) newWidth = imgW - newLeft
    if (newTop + newHeight > imgH) {
        newHeight = imgH - newTop
        newWidth = Math.round(newHeight * ASPECT_RATIO)
    }

    cropState.left = newLeft
    cropState.top = newTop
    cropState.width = newWidth
    cropState.height = newHeight
}
