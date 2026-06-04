# Forbin Dataset:  *A collection of historical photographs with archival metadata*

This repository hosts a small **public sample** of the *Forbin Dataset*, a large-scale collection of historical photographs taken or collected by **Victor Forbin (1868–1947)**.  
The full dataset (images + COCO-style annotations + metadata) will be released on **Hugging Face** after the acceptance of the associated data paper.

This GitHub version provides:
- A small curated subset of images  
- COCO-style annotations (segmentation polygons)  
- Archival metadata (Box ID, description, notes, dates when available)  
- A lightweight **explorer interface** (HTML/JS) to preview images and annotations

## Human-facing portal strategy

The repository is designed as a lightweight public portal. Large image files stay
on Huma-Num Sharedocs, while GitHub Pages provides a simple interface for browsing,
searching, visualizing annotations, and showing model predictions.

- Keep only representative samples in `samples/images`.
- Keep heavy images on Huma-Num Sharedocs.
- Configure remote image and download URLs in `config.js`.
- Use `build_portal_manifests.py` to split a COCO file into carton-level JSON
  manifests for faster browsing.
- Expose predictions as optional visual layers, so non-technical users can turn
  model outputs on and off from the explorer.
- Match model predictions by `file_name` when prediction files and subset files
  use different COCO `image_id` values.
- Stream mode uses direct Sharedocs image URLs and Sharedocs thumbnails instead
  of downloading archives.

Example:

```bash
python3 build_portal_manifests.py --source samples/subset.json --output-dir data/portal
```

Build the full streaming manifests from the inference image index:

```bash
python3 build_stream_manifests.py \
  --source data/forbin_infer_all.json \
  --metadata-source forbin_all.json \
  --detections-source data/forbin_detections.json \
  --output-dir data/stream
```

The explorer supports two user-facing modes:

- `explorer.html?mode=sample`: fast local subset hosted in GitHub.
- `explorer.html?mode=stream`: full dataset, loaded carton by carton from
  Huma-Num Sharedocs direct image URLs.

In stream mode, carton manifests include metadata from `forbin_all.json`, and
model predictions are split into carton-level files under `data/stream/predictions`
so the browser only loads predictions for the selected carton.


## 📜 Dataset Description

The Forbin Dataset contains digitized historical photographs from the personal archives of Victor Forbin, a French explorer, photographer, and writer.  
Images are accompanied by rich metadata and manually extracted segmentation polygons suitable for:

- Computer Vision  
- Document Analysis  
- Cultural Heritage Studies  
- Machine Learning Research  

The sample included here is intended for **illustration and early experimentation only**.  
The upcoming full release will contain tens of thousands of images with complete metadata and annotations.


## 🔖 License

This sample dataset is released under the following license:

**Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**  
➡️ https://creativecommons.org/licenses/by-nc/4.0/

This means:
- ✔ You must provide attribution  
- ✔ You may share and adapt the material  
- ❌ You may **not** use it for commercial purposes  


## 📚 Citation

If you use this dataset or the sample in academic work, please cite the forthcoming data paper:

```

[Under review] 
Chelali M., Gosselet S. K., Cloppet F., Kurtz C., Bloch I. and Foliard D., The Forbin Dataset: Forbin Dataset:  A collection of historical photographs with archival metadata, 2025.

```


## 🖥️ Online Demo (GitHub Pages)

Once published, the explorer will be available at: [https://mchelali.github.io/forbin_dataset/](https://mchelali.github.io/forbin_dataset/)



## 🤝 Acknowledgment of Authors

This dataset originates from the personal archives of **Victor Forbin**, digitized and curated by the *High Vision Project – Archives & Vision Initiative*.  
All annotation and data processing work was performed by the project contributors.
