// 8th Wall Image Target Generator — Main Application
// Orchestrates upload, settings, crop interaction, processing, and output.

import { CONSTANTS } from './src/constants.js'
import { getDefaultCrop, validateCrop } from './src/crop.js'
import { processImage, canvasToBlob } from './src/processing.js'
import { renderCropOverlay, initInteractiveCrop } from './src/interactive.js'

const $ = (id) => document.getElementById(id)

// ---- DOM Elements ----

const elements = {
    uploadZone: $('uploadZone'),
    imageFileInput: $('imageFileInput'),
    previewArea: $('previewArea'),
    imagePreview: $('imagePreview'),
    imageMeta: $('imageMeta'),
    cropOverlay: $('cropOverlay'),
    cropSizeBadge: $('cropSizeBadge'),
    previewWrapper: $('previewWrapper'),
    cylinderFields: $('cylinderFields'),
    cylinderCircumference: $('cylinderCircumference'),
    targetWidthInput: $('targetWidth'),
    useDefaultCrop: $('useDefaultCrop'),
    manualCropInputs: $('manualCropInputs'),
    isRotatedToggle: $('isRotated'),
    cropTop: $('cropTop'),
    cropLeft: $('cropLeft'),
    cropWidth: $('cropWidth'),
    cropHeight: $('cropHeight'),
    targetName: $('targetName'),
    generateBtn: $('generateBtn'),
    outputModal: $('outputModal'),
    modalClose: $('modalClose'),
    outputGrid: $('outputGrid'),
    jsonContent: $('jsonContent'),
    jsonPreview: $('jsonPreview'),
    jsonToggleBtn: $('jsonToggleBtn'),
    downloadBtn: $('downloadBtn'),
    processingOverlay: $('processingOverlay'),
    toast: $('toast'),
}

// ---- Shared State ----

const state = {
    loadedImage: null,
    imageFileName: '',
    imageFormat: 'jpg',
    generatedZipBlob: null,
    cropState: { top: 0, left: 0, width: 0, height: 0 },
}

// ---- Toast ----

let toastTimeout
function showToast(message, type = 'info') {
    clearTimeout(toastTimeout)
    elements.toast.textContent = message
    elements.toast.className = `toast ${type} visible`
    toastTimeout = setTimeout(() => elements.toast.classList.remove('visible'), 4000)
}

// ---- Sync UI ↔ State ----

function syncInputsFromCropState() {
    elements.cropTop.value = Math.round(state.cropState.top)
    elements.cropLeft.value = Math.round(state.cropState.left)
    elements.cropWidth.value = Math.round(state.cropState.width)
    elements.cropHeight.value = Math.round(state.cropState.height)
}

function render() {
    renderCropOverlay(state.cropState, elements.cropOverlay, elements.cropSizeBadge, elements.imagePreview, state.loadedImage)
}

function onCropChange() {
    syncInputsFromCropState()
    render()
    validateForm()
}

function applyDefaultCrop() {
    if (!state.loadedImage) return
    const metadata = { width: state.loadedImage.naturalWidth, height: state.loadedImage.naturalHeight }
    const sourceIsLandscape = metadata.width >= metadata.height
    const crop = getDefaultCrop(metadata, sourceIsLandscape)
    state.cropState = { top: crop.top, left: crop.left, width: crop.width, height: crop.height }
    syncInputsFromCropState()
}

function validateForm() {
    const hasImage = !!state.loadedImage
    const hasName = elements.targetName.value.trim().length > 0
    const geomType = document.querySelector('input[name="geometryType"]:checked').value
    let valid = hasImage && hasName && state.cropState.width >= CONSTANTS.minimumWidth && state.cropState.height >= CONSTANTS.minimumHeight

    if (geomType === 'cylinder') {
        const circ = parseFloat(elements.cylinderCircumference.value)
        const tw = parseFloat(elements.targetWidthInput.value)
        valid = valid && !isNaN(circ) && circ > 0 && !isNaN(tw) && tw > 0 && tw <= circ
    }

    elements.generateBtn.disabled = !valid
}

// ---- Upload ----

function handleFile(file) {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
        showToast('Please upload a JPG, PNG, or WebP image.', 'error')
        return
    }

    state.imageFileName = file.name
    const ext = file.name.split('.').pop().toLowerCase()
    state.imageFormat = ext === 'jpeg' ? 'jpg' : ext

    const reader = new FileReader()
    reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
            state.loadedImage = img
            showPreview(img, file)
            applyDefaultCrop()
            render()
            validateForm()
        }
        img.src = e.target.result
    }
    reader.readAsDataURL(file)
}

function showPreview(img, file) {
    elements.imagePreview.src = img.src
    elements.uploadZone.classList.add('hidden')
    elements.previewArea.classList.add('visible')

    const sizeKB = (file.size / 1024).toFixed(1)
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
    const sizeStr = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`

    elements.imageMeta.innerHTML = `
    <span class="image-meta-tag">${img.naturalWidth} × ${img.naturalHeight}</span>
    <span class="image-meta-tag">${state.imageFormat.toUpperCase()}</span>
    <span class="image-meta-tag">${sizeStr}</span>
    <span class="image-meta-tag" style="cursor:pointer; color: var(--purple);" id="changeImageBtn">↻ Change</span>
  `
    $('changeImageBtn').addEventListener('click', () => {
        state.loadedImage = null
        elements.previewArea.classList.remove('visible')
        elements.uploadZone.classList.remove('hidden')
        elements.outputModal.classList.remove('visible')
        validateForm()
    })
}

// ---- Event Listeners ----

elements.uploadZone.addEventListener('click', () => elements.imageFileInput.click())
elements.uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); elements.uploadZone.classList.add('drag-over') })
elements.uploadZone.addEventListener('dragleave', () => elements.uploadZone.classList.remove('drag-over'))
elements.uploadZone.addEventListener('drop', (e) => { e.preventDefault(); elements.uploadZone.classList.remove('drag-over'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]) })
elements.imageFileInput.addEventListener('change', () => { if (elements.imageFileInput.files.length) handleFile(elements.imageFileInput.files[0]) })

// Geometry type
document.querySelectorAll('input[name="geometryType"]').forEach((radio) => {
    radio.addEventListener('change', () => {
        const val = document.querySelector('input[name="geometryType"]:checked').value
        elements.cylinderFields.classList.toggle('visible', val === 'cylinder')
        validateForm()
    })
})

// Crop toggle
elements.useDefaultCrop.addEventListener('change', () => {
    const isDefault = elements.useDefaultCrop.checked
    elements.manualCropInputs.classList.toggle('hidden', isDefault)
    elements.previewWrapper.classList.toggle('draw-mode', !isDefault)
    if (isDefault && state.loadedImage) applyDefaultCrop()
    render()
    validateForm()
})

// Manual crop fields
elements.cropWidth.addEventListener('input', () => {
    const w = parseInt(elements.cropWidth.value, 10)
    if (!isNaN(w) && w > 0) {
        const h = Math.round((w * 4) / 3)
        elements.cropHeight.value = h
        state.cropState.width = w
        state.cropState.height = h
    }
    render()
    validateForm()
})

elements.isRotatedToggle.addEventListener('change', () => {
    if (state.loadedImage && elements.useDefaultCrop.checked) applyDefaultCrop()
    elements.cropWidth.dispatchEvent(new Event('input'))
    render()
})

    ;[elements.cropTop, elements.cropLeft].forEach((el) => {
        el.addEventListener('input', () => {
            state.cropState.top = parseInt(elements.cropTop.value, 10) || 0
            state.cropState.left = parseInt(elements.cropLeft.value, 10) || 0
            render()
            validateForm()
        })
    })

elements.targetName.addEventListener('input', validateForm)
elements.imagePreview.addEventListener('load', render)
window.addEventListener('resize', render)

// ---- Interactive crop (drag / draw / resize) ----

initInteractiveCrop(elements, state, onCropChange)

// ---- Modal controls ----

elements.modalClose.addEventListener('click', () => elements.outputModal.classList.remove('visible'))
elements.outputModal.addEventListener('click', (e) => { if (e.target === elements.outputModal) elements.outputModal.classList.remove('visible') })
elements.jsonToggleBtn.addEventListener('click', () => {
    elements.jsonPreview.classList.toggle('hidden')
    elements.jsonToggleBtn.textContent = elements.jsonPreview.classList.contains('hidden') ? 'Show JSON ▾' : 'Hide JSON ▴'
})

// ---- Generate ----

elements.generateBtn.addEventListener('click', async () => {
    if (!state.loadedImage) return

    const name = elements.targetName.value.trim()
    const geomType = document.querySelector('input[name="geometryType"]:checked').value
    const isRot = elements.isRotatedToggle.checked && !elements.useDefaultCrop.checked

    const crop = {
        ...state.cropState,
        top: Math.round(state.cropState.top),
        left: Math.round(state.cropState.left),
        width: Math.round(state.cropState.width),
        height: Math.round(state.cropState.height),
        isRotated: isRot,
        originalWidth: isRot ? state.loadedImage.naturalHeight : state.loadedImage.naturalWidth,
        originalHeight: isRot ? state.loadedImage.naturalWidth : state.loadedImage.naturalHeight,
    }

    const metadata = isRot
        ? { width: state.loadedImage.naturalHeight, height: state.loadedImage.naturalWidth }
        : { width: state.loadedImage.naturalWidth, height: state.loadedImage.naturalHeight }

    const issues = validateCrop(crop, metadata)
    if (issues.length) {
        showToast(issues.join('\n'), 'error')
        return
    }

    let cropResult
    if (geomType === 'cylinder') {
        const circ = parseFloat(elements.cylinderCircumference.value)
        const tw = parseFloat(elements.targetWidthInput.value)
        const unit = document.querySelector('input[name="unit"]:checked').value
        cropResult = {
            type: 'CYLINDER',
            geometry: {
                ...crop,
                targetCircumferenceTop: tw,
                cylinderCircumferenceTop: circ,
                cylinderCircumferenceBottom: circ,
                cylinderSideLength: (state.loadedImage.naturalHeight / state.loadedImage.naturalWidth) * tw,
                arcAngle: (tw / circ) * 360,
                coniness: 0,
                inputMode: 'ADVANCED',
                unit,
            },
        }
    } else {
        cropResult = { type: 'PLANAR', geometry: crop }
    }

    elements.processingOverlay.classList.add('visible')
    try {
        await new Promise((r) => setTimeout(r, 50))

        const { originalCanvas, croppedCanvas, thumbnailCanvas, luminanceCanvas } = processImage(state.loadedImage, crop)
        const ext = state.imageFormat

        const resources = {
            originalImage: `${name}_original.${ext}`,
            croppedImage: `${name}_cropped.${ext}`,
            thumbnailImage: `${name}_thumbnail.${ext}`,
            luminanceImage: `${name}_luminance.${ext}`,
        }

        const data = {
            imagePath: `image-targets/${resources.luminanceImage}`,
            metadata: null,
            name,
            type: cropResult.type,
            properties: cropResult.geometry,
            resources,
            created: Date.now(),
            updated: Date.now(),
        }

        const [originalBlob, croppedBlob, thumbnailBlob, luminanceBlob] = await Promise.all([
            canvasToBlob(originalCanvas, ext),
            canvasToBlob(croppedCanvas, ext),
            canvasToBlob(thumbnailCanvas, ext),
            canvasToBlob(luminanceCanvas, ext),
        ])

        const zip = new JSZip()
        const folder = zip.folder(name)
        folder.file(resources.originalImage, originalBlob)
        folder.file(resources.croppedImage, croppedBlob)
        folder.file(resources.thumbnailImage, thumbnailBlob)
        folder.file(resources.luminanceImage, luminanceBlob)
        folder.file(`${name}.json`, JSON.stringify(data, null, 2) + '\n')

        state.generatedZipBlob = await zip.generateAsync({ type: 'blob' })

        showOutput({
            original: URL.createObjectURL(originalBlob),
            cropped: URL.createObjectURL(croppedBlob),
            thumbnail: URL.createObjectURL(thumbnailBlob),
            luminance: URL.createObjectURL(luminanceBlob),
        }, data)

        showToast('Image target generated successfully!', 'success')
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error')
        console.error(err)
    } finally {
        elements.processingOverlay.classList.remove('visible')
    }
})

// ---- Output Display (Modal) ----

function showOutput(urls, data) {
    elements.outputModal.classList.add('visible')
    const items = [
        { label: 'Original', badge: `${data.properties.originalWidth}×${data.properties.originalHeight}`, url: urls.original },
        { label: 'Cropped', badge: `${data.properties.width}×${data.properties.height}`, url: urls.cropped },
        { label: 'Thumbnail', badge: '350px', url: urls.thumbnail },
        { label: 'Luminance', badge: '640px grayscale', url: urls.luminance },
    ]

    elements.outputGrid.innerHTML = items.map((item) => `
    <div class="output-item">
      <img src="${item.url}" alt="${item.label}">
      <div class="output-item-label">
        ${item.label}
        <span class="badge">${item.badge}</span>
      </div>
    </div>`).join('')

    elements.jsonContent.textContent = JSON.stringify(data, null, 2)
    elements.jsonPreview.classList.add('hidden')
    elements.jsonToggleBtn.textContent = 'Show JSON ▾'
}

// ---- Download ----

elements.downloadBtn.addEventListener('click', () => {
    if (!state.generatedZipBlob) return
    const name = elements.targetName.value.trim() || 'image-target'
    const a = document.createElement('a')
    a.href = URL.createObjectURL(state.generatedZipBlob)
    a.download = `${name}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
    showToast('ZIP downloaded!', 'success')
})

// ---- Init ----

validateForm()
