# 8th Wall Image Target Generator

A web-based tool for generating [8th Wall](https://www.8thwall.com/) AR image target metadata from your images. All processing runs client-side in the browser — no server needed.

🔗 **Live App**: [8thwallimagetarget.pratikmane.tech](https://8thwallimagetarget.pratikmane.tech)

## Features

- **Drag-and-drop** image upload (JPG, PNG, WebP)
- **Flat & Cylinder** target geometry support
- **Interactive crop tool** — draw, drag, and resize the crop region (locked to 3:4 ratio)
- **Default or manual crop** with live preview overlay
- **Generates 4 images** + JSON metadata (same format as the [8th Wall CLI tool](https://github.com/8thwall/8thwall/tree/main/apps/image-target-cli))
- **ZIP download** of all output files
- **100% client-side** — no data leaves your browser

## Output Format

For each image target, the tool generates:

| File | Description |
|---|---|
| `{name}_original.jpg` | Original image (optionally rotated) |
| `{name}_cropped.jpg` | Cropped region (3:4 aspect ratio) |
| `{name}_thumbnail.jpg` | 350px height thumbnail |
| `{name}_luminance.jpg` | 640px height grayscale (used by AR engine) |
| `{name}.json` | Metadata with crop geometry and file references |

## Usage

Upload an image → select geometry type → adjust crop → enter a name → click **Generate** → download ZIP.

Load generated targets into the 8th Wall engine:

```js
const onxrloaded = () => {
  XR8.XrController.configure({
    imageTargetData: [
      require('../image-targets/target1.json'),
    ],
  })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)
```

## Project Structure

```
├── index.html          Main page
├── styles.css          Styles
├── app.js              Main orchestrator
└── src/
    ├── constants.js    Shared constants
    ├── crop.js         Crop math (default crop, validation, clamping)
    ├── processing.js   Canvas API image pipeline (crop, resize, grayscale)
    └── interactive.js  Drag/draw/resize crop interactions
```

## Run Locally

```bash
npx serve .
```

## License

MIT
