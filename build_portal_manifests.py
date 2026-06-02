#!/usr/bin/env python3
"""Build lightweight manifests for the static Forbin portal."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path


def compact_image_record(image: dict, annotation_count: int) -> dict:
    metadata = image.get("metadata") or {}
    return {
        "id": image.get("id"),
        "file_names": image.get("file_names", {}),
        "carton": metadata.get("Carton", "Inconnu"),
        "pays": metadata.get("Pays"),
        "classe": metadata.get("Classe"),
        "continent": metadata.get("Continent"),
        "type": metadata.get("Type"),
        "cluster_label": metadata.get("ClusterLabel"),
        "annotation_count": annotation_count,
    }


def build_manifests(source: Path, output_dir: Path) -> None:
    coco = json.loads(source.read_text(encoding="utf-8"))
    output_dir.mkdir(parents=True, exist_ok=True)
    cartons_dir = output_dir / "cartons"
    cartons_dir.mkdir(parents=True, exist_ok=True)

    annotations_by_image = defaultdict(list)
    for annotation in coco.get("annotations", []):
        annotations_by_image[annotation.get("image_id")].append(annotation)

    images_by_carton = defaultdict(list)
    for image in coco.get("images", []):
        carton = (image.get("metadata") or {}).get("Carton", "Inconnu")
        images_by_carton[carton].append(image)

    index = []
    for carton, images in sorted(images_by_carton.items()):
        countries = Counter((image.get("metadata") or {}).get("Pays", "Non renseigné") for image in images)
        classes = Counter((image.get("metadata") or {}).get("Classe", "Non renseigné") for image in images)

        carton_annotations = []
        for image in images:
            carton_annotations.extend(annotations_by_image.get(image.get("id"), []))

        carton_payload = {
            "info": coco.get("info", {}),
            "licenses": coco.get("licenses", []),
            "categories": coco.get("categories", []),
            "images": images,
            "annotations": carton_annotations,
        }
        carton_path = cartons_dir / f"{carton}.json"
        carton_path.write_text(
            json.dumps(carton_payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

        index.append(
            {
                "carton": carton,
                "images": len(images),
                "annotations": len(carton_annotations),
                "countries": countries.most_common(),
                "classes": classes.most_common(),
                "manifest": f"cartons/{carton}.json",
                "download": f"{carton}.tar",
                "preview": [
                    compact_image_record(image, len(annotations_by_image.get(image.get("id"), [])))
                    for image in images[:5]
                ],
            }
        )

    (output_dir / "cartons_index.json").write_text(
        json.dumps({"cartons": index}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default="samples/subset.json", type=Path)
    parser.add_argument("--output-dir", default="data/portal", type=Path)
    args = parser.parse_args()
    build_manifests(args.source, args.output_dir)


if __name__ == "__main__":
    main()
