window.FORBIN_CONFIG = {
    mode: "sample",
    datasetUrl: "samples/subset.json",
    imageBaseUrl: "samples/images/",
    downloadBaseUrl: "https://huggingface.co/datasets/mchelali/forbin_dataset/resolve/main/images/",
    streamIndexUrl: "data/stream/cartons_index.json",
    streamManifestBaseUrl: "data/stream/",
    tarImageFallback: {
        enabled: true,
        baseUrl: "https://huggingface.co/datasets/mchelali/forbin_dataset/resolve/main/images/"
    },
    fullDataset: {
        datasetUrl: "https://huggingface.co/datasets/mchelali/forbin_dataset/resolve/main/annotations/forbin_annotations.json",
        imageBaseUrl: "https://huggingface.co/datasets/mchelali/forbin_dataset/resolve/main/images/"
    },
    predictionSources: [
        {
            id: "stamp-detector",
            label: "Model Predictions",
            color: "#2d7dd2",
            enabledByDefault: false,
            url: "data/forbin_detections.json",
            imagesUrl: "data/forbin_infer_all.json",
            matchBy: "file_name",
            streamByCarton: true
        }
    ]
};
