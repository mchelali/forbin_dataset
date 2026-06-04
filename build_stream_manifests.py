#!/usr/bin/env python3
"""Build static manifests for streaming images from Huma-Num Sharedocs."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path


def make_metadata_lookup(metadata_source: Path | None) -> dict:
    if not metadata_source:
        return {}

    payload = json.loads(metadata_source.read_text(encoding="utf-8"))
    lookup = {}
    for image in payload.get("images", []):
        for file_name in (image.get("file_names") or {}).values():
            if file_name:
                lookup[file_name] = image
        if image.get("file_name"):
            lookup[image["file_name"]] = image
    return lookup


def make_stream_image_record(image: dict, metadata_lookup: dict) -> dict:
    file_name = image["file_name"]
    carton = file_name.split("/", 1)[0]
    metadata_image = metadata_lookup.get(file_name) or {}
    metadata = metadata_image.get("metadata") or {}
    face = "verso" if file_name.lower().endswith("__0002.jpg") else "recto"
    return {
        "id": f"stream-{image['id']}",
        "file_names": {
            face: file_name,
        },
        "width": image.get("width"),
        "height": image.get("height"),
        "remote_source": "sharedocs",
        "metadata": {
            **metadata,
            "Carton": carton,
            "Pays": metadata.get("Pays", "Non renseigné"),
            "Classe": metadata.get("Classe", "Streaming Hugging Face"),
            "Source": "Huma-Num Sharedocs",
        },
    }


def make_prediction_lookup(infer_payload: dict) -> dict:
    return {
        image["id"]: image["file_name"]
        for image in infer_payload.get("images", [])
        if image.get("id") is not None and image.get("file_name")
    }


def build_prediction_manifests(
    detections_source: Path | None,
    output_dir: Path,
    image_id_to_file: dict,
) -> dict:
    if not detections_source:
        return {}

    predictions_dir = output_dir / "predictions"
    predictions_dir.mkdir(parents=True, exist_ok=True)
    detections = json.loads(detections_source.read_text(encoding="utf-8"))
    items = detections if isinstance(detections, list) else detections.get("annotations", [])
    predictions_by_carton = defaultdict(list)

    for detection in items:
        file_name = detection.get("file_name") or image_id_to_file.get(detection.get("image_id"))
        if not file_name:
            continue
        carton = file_name.split("/", 1)[0]
        prediction = dict(detection)
        prediction["file_name"] = file_name
        predictions_by_carton[carton].append(prediction)

    index = {}
    for carton, predictions in sorted(predictions_by_carton.items()):
        path = predictions_dir / f"{carton}.json"
        path.write_text(
            json.dumps({"predictions": predictions}, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        index[carton] = {
            "manifest": f"predictions/{carton}.json",
            "predictions": len(predictions),
        }
    return index


def build_stream_manifests(
    source: Path,
    output_dir: Path,
    metadata_source: Path | None,
    detections_source: Path | None,
) -> None:
    payload = json.loads(source.read_text(encoding="utf-8"))
    metadata_lookup = make_metadata_lookup(metadata_source)
    image_id_to_file = make_prediction_lookup(payload)
    output_dir.mkdir(parents=True, exist_ok=True)
    cartons_dir = output_dir / "cartons"
    cartons_dir.mkdir(parents=True, exist_ok=True)
    prediction_index = build_prediction_manifests(detections_source, output_dir, image_id_to_file)

    images_by_carton = defaultdict(list)
    for image in payload.get("images", []):
        carton = image["file_name"].split("/", 1)[0]
        images_by_carton[carton].append(make_stream_image_record(image, metadata_lookup))

    index = []
    for carton, images in sorted(images_by_carton.items()):
        manifest_name = f"{carton}.json"
        countries = Counter(image["metadata"].get("Pays", "Non renseigné") for image in images)
        classes = Counter(image["metadata"].get("Classe", "Non renseigné") for image in images)
        carton_payload = {
            "info": {
                "description": f"Streaming manifest for {carton}",
                "source": str(source),
                "metadata_source": str(metadata_source) if metadata_source else None,
            },
            "licenses": [],
            "categories": [],
            "images": images,
            "annotations": [],
        }
        (cartons_dir / manifest_name).write_text(
            json.dumps(carton_payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        index.append(
            {
                "carton": carton,
                "images": len(images),
                "annotations": 0,
                "predictions": prediction_index.get(carton, {}).get("predictions", 0),
                "countries": countries.most_common(),
                "classes": classes.most_common(),
                "manifest": f"cartons/{manifest_name}",
                "predictions_manifest": prediction_index.get(carton, {}).get("manifest"),
                "download": carton,
                "preview": images[:5],
            }
        )

    (output_dir / "cartons_index.json").write_text(
        json.dumps(
            {
                "mode": "stream",
                "source": str(source),
                "metadata_source": str(metadata_source) if metadata_source else None,
                "detections_source": str(detections_source) if detections_source else None,
                "cartons": index,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default="data/forbin_infer_all.json", type=Path)
    parser.add_argument("--output-dir", default="data/stream", type=Path)
    parser.add_argument("--metadata-source", default="forbin_all.json", type=Path)
    parser.add_argument("--detections-source", default="data/forbin_detections.json", type=Path)
    args = parser.parse_args()
    build_stream_manifests(
        args.source,
        args.output_dir,
        args.metadata_source if args.metadata_source.exists() else None,
        args.detections_source if args.detections_source.exists() else None,
    )


if __name__ == "__main__":
    main()
