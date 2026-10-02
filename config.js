window.FORBIN_CONFIG = {
    mode: "sample",
    datasetUrl: "samples/subset.json",
    imageBaseUrl: "samples/images/",
    thumbnailBaseUrl: "samples/thumbnails/",
    streamIndexUrl: "data/stream/cartons_index.json",
    streamManifestBaseUrl: "data/stream/",
    sharedocs: {
        enabled: true,
        baseUrl: "https://sharedocs.huma-num.fr/wl/",
        publicId: "XOJp1buzC6FcbIL2K2qeIbj52WtPEaq4"
    },
    predictionSources: [
        {
            // Loaded carton by carton from data/stream/predictions/ in both
            // sample and stream modes, matched by file name.
            id: "stamp-detector",
            label: "Stamp detector predictions",
            color: "#2d7dd2",
            matchBy: "file_name",
            streamByCarton: true
        }
    ]
};
