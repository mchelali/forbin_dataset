#!/usr/bin/env python3
"""Build static manifests for streaming images from Huma-Num Sharedocs."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


SIDE_SUFFIX_RE = re.compile(r"__(0001|0002)(?=\.[^.]+$)", re.IGNORECASE)
DEFAULT_PREDICTION_OVERLAP_THRESHOLD = 0.8
DEFAULT_TRANSCRIPTION_OVERLAP_THRESHOLD = 0.5
TRANSCRIPTION_CATEGORY_OFFSET = 1000
TRANSCRIPTION_SOURCE_NAME = "monkeyocr"


def get_side(file_name: str) -> str:
    return "verso" if file_name.lower().endswith("__0002.jpg") else "recto"


def get_pair_key(file_name: str) -> str:
    return SIDE_SUFFIX_RE.sub("", file_name)


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


def make_transcription_data(transcription_source: Path | None) -> dict:
    if not transcription_source:
        return {
            "source": None,
            "metadata_lookup": {},
            "annotations_by_image": {},
            "annotations_by_file_name": {},
            "categories": [],
            "category_lookup": {},
        }

    payload = json.loads(transcription_source.read_text(encoding="utf-8"))
    metadata_lookup = {}
    file_names_by_image_id = {}
    for image in payload.get("images", []):
        file_names = image.get("file_names") or {}
        if image.get("id") is not None:
            file_names_by_image_id[image["id"]] = file_names
        for file_name in (image.get("file_names") or {}).values():
            if file_name:
                metadata_lookup[file_name] = image

    category_lookup = {
        category.get("id"): category
        for category in payload.get("categories", [])
    }
    categories = []
    for category in payload.get("categories", []):
        categories.append(
            {
                **category,
                "id": TRANSCRIPTION_CATEGORY_OFFSET + int(category["id"]),
                "source": TRANSCRIPTION_SOURCE_NAME,
                "source_category_id": category["id"],
            }
        )

    annotations_by_image = defaultdict(list)
    annotations_by_file_name = defaultdict(list)
    for annotation in payload.get("annotations", []):
        if not has_transcription_payload(annotation):
            continue
        side = annotation.get("side") or annotation.get("source_face") or "unknown"
        file_name = get_transcription_annotation_file_name(annotation, file_names_by_image_id, side)
        if not file_name:
            continue
        item = dict(annotation)
        item["id"] = make_transcription_annotation_id(annotation, file_name, side)
        item["source_annotation_id"] = annotation.get("id")
        item["source_file_name"] = file_name
        item["source"] = TRANSCRIPTION_SOURCE_NAME
        item["text_source"] = TRANSCRIPTION_SOURCE_NAME
        item["source_category_id"] = annotation.get("category_id")
        item["category_id"] = TRANSCRIPTION_CATEGORY_OFFSET + int(annotation["category_id"])
        item["is_text_pure"] = is_pure_transcription_text_annotation(annotation, category_lookup)
        item["side"] = side
        item.setdefault("source_face", item["side"])
        annotations_by_image[item.get("image_id")].append(item)
        annotations_by_file_name[file_name].append(item)

    return {
        "source": str(transcription_source),
        "metadata_lookup": metadata_lookup,
        "annotations_by_image": annotations_by_image,
        "annotations_by_file_name": annotations_by_file_name,
        "categories": categories,
        "category_lookup": category_lookup,
    }


def make_transcription_annotation_id(annotation: dict, file_name: str, side: str) -> str:
    file_key = normalize_file_stem(Path(file_name).stem)
    return f"{TRANSCRIPTION_SOURCE_NAME}-{file_key}-{side}-{annotation.get('id')}"


def get_transcription_annotation_file_name(
    annotation: dict,
    file_names_by_image_id: dict,
    side: str,
) -> str | None:
    file_names = file_names_by_image_id.get(annotation.get("image_id")) or {}
    if side and file_names.get(side):
        return file_names[side]

    source_image = annotation.get("source_image")
    if source_image:
        source_stem = normalize_file_stem(source_image)
        for file_name in file_names.values():
            if normalize_file_stem(Path(file_name).stem) == source_stem:
                return file_name

    if len(file_names) == 1:
        return next(iter(file_names.values()))
    return None


def normalize_file_stem(value: str) -> str:
    return re.sub(r"_+", "_", str(value)).lower()


def has_transcription_text(annotation: dict) -> bool:
    return bool(str(annotation.get("text") or "").strip())


def has_transcription_payload(annotation: dict) -> bool:
    return has_transcription_text(annotation) or bool(annotation.get("bbox") or annotation.get("segmentation"))


def is_pure_transcription_text_annotation(annotation: dict, category_lookup: dict) -> bool:
    if not has_transcription_text(annotation):
        return False
    text_type = str(annotation.get("text_type") or "").lower()
    if text_type.startswith("tampon"):
        return False
    category = category_lookup.get(annotation.get("category_id")) or {}
    if str(category.get("supercategory") or "").lower() == "tampon":
        return False
    return True


def build_stream_metadata(image: dict, metadata_lookup: dict, transcription_metadata_lookup: dict) -> dict:
    file_name = image["file_name"]
    carton = file_name.split("/", 1)[0]
    metadata_image = metadata_lookup.get(file_name) or {}
    transcription_image = transcription_metadata_lookup.get(file_name) or {}
    metadata = {
        **(metadata_image.get("metadata") or image.get("metadata") or {}),
        **(transcription_image.get("metadata") or {}),
    }
    return {
        **metadata,
        "Carton": carton,
        "Pays": metadata.get("Pays", "Non renseigné"),
        "Classe": metadata.get("Classe", "Streaming Hugging Face"),
        "Source": "Huma-Num Sharedocs",
    }


def make_stream_side_record(image: dict, metadata_lookup: dict, transcription_metadata_lookup: dict) -> dict:
    file_name = image["file_name"]
    return {
        "source_id": image.get("id"),
        "file_name": file_name,
        "pair_key": get_pair_key(file_name),
        "side": get_side(file_name),
        "width": image.get("width"),
        "height": image.get("height"),
        "metadata": build_stream_metadata(image, metadata_lookup, transcription_metadata_lookup),
    }


def split_metadata_by_side(side_records: list[dict]) -> dict:
    metadata_by_side = {
        record["side"]: record.get("metadata") or {}
        for record in side_records
    }
    if not metadata_by_side:
        return {"metadata": {}}

    all_metadata = list(metadata_by_side.values())
    first_metadata = all_metadata[0]
    if all(metadata == first_metadata for metadata in all_metadata[1:]):
        return {"metadata": first_metadata}

    shared_keys = set(first_metadata)
    for metadata in all_metadata[1:]:
        shared_keys &= set(metadata)
    common_metadata = {
        key: first_metadata[key]
        for key in shared_keys
        if all(metadata.get(key) == first_metadata[key] for metadata in all_metadata[1:])
    }

    payload = {"metadata": common_metadata}
    for side, metadata in metadata_by_side.items():
        side_metadata = {
            key: value
            for key, value in metadata.items()
            if common_metadata.get(key) != value
        }
        if side_metadata:
            payload[f"metadata_{side}"] = side_metadata
    return payload


def make_stream_image_record(side_records: list[dict], metadata_lookup: dict) -> tuple[dict, dict]:
    side_records = sorted(side_records, key=lambda record: 0 if record["side"] == "recto" else 1)
    first = side_records[0]
    metadata_image = metadata_lookup.get(first["file_name"]) or {}
    image_id = metadata_image.get("id") or f"stream-{first['source_id']}"

    record = {
        "id": image_id,
        "file_names": {
            side_record["side"]: side_record["file_name"]
            for side_record in side_records
        },
        "remote_source": "sharedocs",
    }
    record.update(split_metadata_by_side(side_records))

    image_lookup = {}
    for side_record in side_records:
        source_id = side_record["source_id"]
        if source_id is None:
            continue
        image_lookup[source_id] = {
            "image_id": image_id,
            "file_name": side_record["file_name"],
            "side": side_record["side"],
        }
    return record, image_lookup


def build_annotation_lookup(payload: dict, image_lookup: dict) -> dict:
    annotations_by_image = defaultdict(list)
    for annotation in payload.get("annotations", []):
        source_image_id = annotation.get("image_id")
        image_info = image_lookup.get(source_image_id)
        if not image_info:
            continue
        item = dict(annotation)
        item["source_image_id"] = source_image_id
        item["image_id"] = image_info["image_id"]
        item["file_name"] = image_info["file_name"]
        item["side"] = image_info["side"]
        item.setdefault("source_face", image_info["side"])
        annotations_by_image[item["image_id"]].append(item)
    return annotations_by_image


def build_transcription_annotation_lookup(
    images_by_carton: dict,
    transcription_annotations_by_file_name: dict,
) -> dict:
    annotations_by_image = defaultdict(list)
    seen = set()
    for images in images_by_carton.values():
        for image in images:
            image_id = image.get("id")
            for side, file_name in (image.get("file_names") or {}).items():
                for annotation in transcription_annotations_by_file_name.get(file_name, []):
                    annotation_key = (image_id, side, annotation.get("id"))
                    if annotation_key in seen:
                        continue
                    seen.add(annotation_key)
                    item = dict(annotation)
                    item["image_id"] = image_id
                    item["file_name"] = file_name
                    item["side"] = side
                    item["source_face"] = side
                    annotations_by_image[image_id].append(item)
    return annotations_by_image


def bbox_area(bbox: list | tuple | None) -> float:
    if not bbox or len(bbox) < 4:
        return 0.0
    return max(0.0, float(bbox[2])) * max(0.0, float(bbox[3]))


def bbox_overlap_ratio(first: list | tuple | None, second: list | tuple | None) -> float:
    first_area = bbox_area(first)
    second_area = bbox_area(second)
    if first_area <= 0 or second_area <= 0:
        return 0.0

    first_x1, first_y1 = float(first[0]), float(first[1])
    first_x2, first_y2 = first_x1 + float(first[2]), first_y1 + float(first[3])
    second_x1, second_y1 = float(second[0]), float(second[1])
    second_x2, second_y2 = second_x1 + float(second[2]), second_y1 + float(second[3])

    inter_w = max(0.0, min(first_x2, second_x2) - max(first_x1, second_x1))
    inter_h = max(0.0, min(first_y2, second_y2) - max(first_y1, second_y1))
    intersection = inter_w * inter_h
    if intersection <= 0:
        return 0.0
    return intersection / min(first_area, second_area)


def prediction_group_key(prediction: dict) -> tuple:
    return (
        prediction.get("image_id"),
        prediction.get("side") or prediction.get("source_face"),
        prediction.get("category_id"),
    )


def prediction_sort_category(prediction: dict) -> str:
    return str(prediction.get("category_id") or "")


def remove_overlapping_predictions(predictions: list[dict], overlap_threshold: float) -> list[dict]:
    if overlap_threshold <= 0:
        return predictions

    predictions_by_group = defaultdict(list)
    for prediction in predictions:
        predictions_by_group[prediction_group_key(prediction)].append(prediction)

    filtered = []
    for group_predictions in predictions_by_group.values():
        kept = []
        ordered_predictions = sorted(
            group_predictions,
            key=lambda prediction: float(prediction.get("score") or 0.0),
            reverse=True,
        )
        for prediction in ordered_predictions:
            if any(
                bbox_overlap_ratio(prediction.get("bbox"), kept_prediction.get("bbox")) >= overlap_threshold
                for kept_prediction in kept
            ):
                continue
            kept.append(prediction)
        filtered.extend(kept)

    return sorted(
        filtered,
        key=lambda prediction: (
            str(prediction.get("file_name") or ""),
            str(prediction.get("image_id") or ""),
            str(prediction.get("side") or ""),
            prediction_sort_category(prediction),
            -float(prediction.get("score") or 0.0),
        ),
    )


def enrich_predictions_with_transcriptions(
    predictions: list[dict],
    transcription_annotations_by_image: dict,
    transcription_overlap_threshold: float,
) -> set:
    assigned_transcription_ids = set()
    predictions_by_priority = sorted(
        predictions,
        key=lambda prediction: float(prediction.get("score") or 0.0),
        reverse=True,
    )

    for prediction in predictions_by_priority:
        image_id = prediction.get("image_id")
        side = prediction.get("side") or prediction.get("source_face")
        candidates = []
        for annotation in transcription_annotations_by_image.get(image_id, []):
            if not has_transcription_text(annotation):
                continue
            annotation_id = annotation.get("id")
            if annotation_id in assigned_transcription_ids:
                continue
            annotation_side = annotation.get("side") or annotation.get("source_face")
            if side and annotation_side and annotation_side != side:
                continue
            overlap = bbox_overlap_ratio(prediction.get("bbox"), annotation.get("bbox"))
            if overlap >= transcription_overlap_threshold:
                candidates.append((overlap, annotation))

        if not candidates:
            continue

        candidates.sort(key=lambda item: item[0], reverse=True)
        ocr_matches = []
        for overlap, annotation in candidates:
            assigned_transcription_ids.add(annotation["id"])
            ocr_matches.append(
                {
                    "id": annotation.get("id"),
                    "source_annotation_id": annotation.get("source_annotation_id"),
                    "text": annotation.get("text"),
                    "bbox": annotation.get("bbox"),
                    "overlap": overlap,
                    "source": TRANSCRIPTION_SOURCE_NAME,
                }
            )

        texts = [match["text"] for match in ocr_matches if str(match.get("text") or "").strip()]
        if texts:
            existing_text = str(prediction.get("text") or "").strip()
            prediction["text"] = " / ".join([text for text in [existing_text, *texts] if text])
            prediction["text_source"] = TRANSCRIPTION_SOURCE_NAME
            prediction["transcription_source"] = TRANSCRIPTION_SOURCE_NAME
            prediction["ocr_matches"] = ocr_matches

    return assigned_transcription_ids


def merge_categories(*category_groups: list[dict]) -> list[dict]:
    categories_by_key = {}
    for categories in category_groups:
        for category in categories or []:
            key = (category.get("source"), category.get("id"))
            categories_by_key[key] = category
    return sorted(
        categories_by_key.values(),
        key=lambda category: (str(category.get("source") or ""), int(category.get("id") or 0)),
    )


def make_carton_transcription_annotations(
    images: list[dict],
    transcription_annotations_by_image: dict,
    assigned_transcription_ids: set,
) -> list[dict]:
    annotations = []
    for image in images:
        image_id = image.get("id")
        file_names = image.get("file_names") or {}
        for annotation in transcription_annotations_by_image.get(image_id, []):
            if annotation.get("id") in assigned_transcription_ids:
                continue
            item = dict(annotation)
            item.pop("is_text_pure", None)
            side = item.get("side") or item.get("source_face")
            item["image_id"] = image_id
            if side and file_names.get(side):
                item["file_name"] = file_names[side]
            annotations.append(item)
    return annotations


def build_prediction_manifests(
    detections_source: Path | None,
    output_dir: Path,
    image_lookup: dict,
    overlap_threshold: float,
    transcription_annotations_by_image: dict,
    transcription_overlap_threshold: float,
    all_cartons: set[str] | None = None,
) -> tuple[dict, set]:
    predictions_dir = output_dir / "predictions"
    predictions_dir.mkdir(parents=True, exist_ok=True)
    predictions_by_carton = defaultdict(list)

    if detections_source:
        detections = json.loads(detections_source.read_text(encoding="utf-8"))
        items = detections if isinstance(detections, list) else detections.get("annotations", [])

        for detection in items:
            source_image_id = detection.get("image_id")
            image_info = image_lookup.get(source_image_id)
            file_name = detection.get("file_name") or (image_info or {}).get("file_name")
            if not file_name:
                continue

            carton = file_name.split("/", 1)[0]
            prediction = dict(detection)
            prediction["file_name"] = file_name
            if image_info:
                prediction["source_image_id"] = source_image_id
                prediction["image_id"] = image_info["image_id"]
                prediction["side"] = image_info["side"]
                prediction.setdefault("source_face", image_info["side"])
            else:
                prediction["side"] = get_side(file_name)
                prediction.setdefault("source_face", prediction["side"])
            predictions_by_carton[carton].append(prediction)

    index = {}
    assigned_transcription_ids = set()
    cartons = set(predictions_by_carton)
    cartons.update(all_cartons or set())
    for carton in sorted(cartons):
        predictions = predictions_by_carton.get(carton, [])
        predictions = remove_overlapping_predictions(predictions, overlap_threshold)
        assigned_transcription_ids.update(
            enrich_predictions_with_transcriptions(
                predictions,
                transcription_annotations_by_image,
                transcription_overlap_threshold,
            )
        )
        path = predictions_dir / f"{carton}.json"
        path.write_text(
            json.dumps({"predictions": predictions}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        index[carton] = {
            "manifest": f"predictions/{carton}.json",
            "predictions": len(predictions),
        }
    return index, assigned_transcription_ids


def get_index_metadata(image: dict) -> dict:
    metadata = image.get("metadata") or {}
    if metadata.get("Pays") or metadata.get("Classe"):
        return metadata

    for side in ("recto", "verso"):
        side_metadata = image.get(f"metadata_{side}") or {}
        if side_metadata.get("Pays") or side_metadata.get("Classe"):
            return {**metadata, **side_metadata}
    return metadata


def build_stream_manifests(
    source: Path,
    output_dir: Path,
    metadata_source: Path | None,
    detections_source: Path | None,
    prediction_overlap_threshold: float,
    transcription_source: Path | None,
    transcription_overlap_threshold: float,
) -> None:
    payload = json.loads(source.read_text(encoding="utf-8"))
    metadata_lookup = make_metadata_lookup(metadata_source)
    transcription_data = make_transcription_data(transcription_source)
    transcription_metadata_lookup = transcription_data["metadata_lookup"]
    output_dir.mkdir(parents=True, exist_ok=True)
    cartons_dir = output_dir / "cartons"
    cartons_dir.mkdir(parents=True, exist_ok=True)

    side_records_by_carton_pair = defaultdict(list)
    for image in payload.get("images", []):
        if not image.get("file_name"):
            continue
        side_record = make_stream_side_record(image, metadata_lookup, transcription_metadata_lookup)
        carton = side_record["file_name"].split("/", 1)[0]
        side_records_by_carton_pair[(carton, side_record["pair_key"])].append(side_record)

    images_by_carton = defaultdict(list)
    image_lookup = {}
    for (carton, _pair_key), side_records in sorted(side_records_by_carton_pair.items()):
        image_record, source_lookup = make_stream_image_record(side_records, metadata_lookup)
        images_by_carton[carton].append(image_record)
        image_lookup.update(source_lookup)

    annotations_by_image = build_annotation_lookup(payload, image_lookup)
    transcription_annotations_by_image = build_transcription_annotation_lookup(
        images_by_carton,
        transcription_data["annotations_by_file_name"],
    )
    prediction_index, assigned_transcription_ids = build_prediction_manifests(
        detections_source,
        output_dir,
        image_lookup,
        prediction_overlap_threshold,
        transcription_annotations_by_image,
        transcription_overlap_threshold,
        set(images_by_carton),
    )

    index = []
    for carton, images in sorted(images_by_carton.items()):
        manifest_name = f"{carton}.json"
        carton_annotations = []
        for image in images:
            carton_annotations.extend(annotations_by_image.get(image.get("id"), []))
        carton_annotations.extend(
            make_carton_transcription_annotations(
                images,
                transcription_annotations_by_image,
                assigned_transcription_ids,
            )
        )

        countries = Counter(
            get_index_metadata(image).get("Pays", "Non renseigné")
            for image in images
        )
        classes = Counter(
            get_index_metadata(image).get("Classe", "Non renseigné")
            for image in images
        )
        carton_payload = {
            "info": {
                "description": f"Streaming manifest for {carton}",
                "source": str(source),
                "metadata_source": str(metadata_source) if metadata_source else None,
                "transcription_source": transcription_data["source"],
                "transcription_overlap_threshold": transcription_overlap_threshold,
            },
            "licenses": payload.get("licenses", []),
            "categories": merge_categories(payload.get("categories", []), transcription_data["categories"]),
            "images": images,
            "annotations": carton_annotations,
        }
        (cartons_dir / manifest_name).write_text(
            json.dumps(carton_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        index.append(
            {
                "carton": carton,
                "images": len(images),
                "annotations": len(carton_annotations),
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
                "prediction_overlap_threshold": prediction_overlap_threshold,
                "transcription_source": transcription_data["source"],
                "transcription_overlap_threshold": transcription_overlap_threshold,
                "cartons": index,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default="data/forbin_infer_all.json", type=Path)
    parser.add_argument("--output-dir", default="data/stream", type=Path)
    parser.add_argument("--metadata-source", default="forbin_all.json", type=Path)
    parser.add_argument("--detections-source", default="data/forbin_all_sadetr.json", type=Path)
    parser.add_argument("--transcription-source", default="data/forbin_all_monkeyocr.json", type=Path)
    parser.add_argument(
        "--prediction-overlap-threshold",
        default=DEFAULT_PREDICTION_OVERLAP_THRESHOLD,
        type=float,
        help=(
            "Remove lower-scored predictions when their bbox overlap ratio "
            "with a higher-scored prediction is at least this value."
        ),
    )
    parser.add_argument(
        "--transcription-overlap-threshold",
        default=DEFAULT_TRANSCRIPTION_OVERLAP_THRESHOLD,
        type=float,
        help=(
            "Attach MonkeyOCR text to a predicted stamp when their bbox overlap "
            "ratio is at least this value."
        ),
    )
    args = parser.parse_args()
    build_stream_manifests(
        args.source,
        args.output_dir,
        args.metadata_source if args.metadata_source.exists() else None,
        args.detections_source if args.detections_source.exists() else None,
        args.prediction_overlap_threshold,
        args.transcription_source if args.transcription_source.exists() else None,
        args.transcription_overlap_threshold,
    )


if __name__ == "__main__":
    main()
