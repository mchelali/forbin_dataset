/*
 * Forbin Dataset — translations (English / French).
 *
 * HOW TO EDIT
 *  - One entry per key, with every language side by side: { en: "...", fr: "..." }.
 *  - {name} placeholders are filled by the code: t("key", { name: value }).
 *  - Plural entries use { one: "...", other: "..." } for each language.
 *  - Entries used with data-i18n-html may contain simple markup (<code>, <strong>, <a>).
 *  - "theme:<English value>" and "category:<English value>" entries translate data values
 *    of the download inventory; a missing French value falls back to English.
 *  - Open i18n/check.html in a browser to list missing or unused keys.
 *  - To add a language: add a field (e.g. es: "...") and list it in scripts/i18n.js (SUPPORTED).
 */
window.FORBIN_I18N = {
  // ─── Page titles and descriptions (SEO) ───────────────────────────────────
  // Keep titles under ~60 characters and descriptions under ~160: search engines truncate beyond.
  "meta.home.title": {
    en: "Forbin Dataset — Historical Photographs and Stamp Detection",
    fr: "Forbin Dataset — Photographies historiques et détection de tampons"
  },
  "meta.home.description": {
    en: "Forbin Dataset: 62,135 historical photographs with archival metadata, OCR and stamp detection annotations for historical document analysis and computer vision.",
    fr: "Forbin Dataset : 62 135 photographies historiques avec métadonnées d'archives, OCR et détection de tampons pour l'analyse de documents historiques et la vision par ordinateur."
  },
  "meta.home.keywords": {
    en: "Forbin, Victor Forbin, Forbin Dataset, historical photographs, historical documents, stamp detection, stamp recognition, OCR, handwritten text recognition, archival metadata, COCO annotations, document analysis, document layout analysis, computer vision, visual heritage, cultural heritage, digital humanities, news photo agency, press photography, recto verso, image dataset, Service historique de la Défense, HIGH VISION, photographies historiques, documents historiques, détection de tampons",
    fr: "Forbin, Victor Forbin, Forbin Dataset, photographies historiques, documents historiques, détection de tampons, reconnaissance de tampons, OCR, reconnaissance d'écriture manuscrite, métadonnées d'archives, annotations COCO, analyse de documents, analyse de la mise en page, vision par ordinateur, patrimoine visuel, patrimoine culturel, humanités numériques, agence de photographie de presse, photographie de presse, recto verso, jeu de données d'images, Service historique de la Défense, HIGH VISION, historical photographs, historical documents, stamp detection"
  },
  "meta.explorer.title": {
    en: "Explorer — Forbin Dataset historical photographs and annotations",
    fr: "Explorateur — Photographies historiques et annotations du Forbin Dataset"
  },
  "meta.explorer.description": {
    en: "Browse the Forbin historical photographs box by box: recto and verso images, archival metadata, OCR transcriptions, annotated stamps and stamp detection predictions.",
    fr: "Parcourez les photographies historiques du fonds Forbin carton par carton : recto et verso, métadonnées d'archives, transcriptions OCR, tampons annotés et prédictions de détection de tampons."
  },
  "meta.download.title": {
    en: "Download the Forbin Dataset — historical photographs and annotations",
    fr: "Télécharger le Forbin Dataset — photographies historiques et annotations"
  },
  "meta.download.description": {
    en: "Download the Forbin Dataset of historical photographs: 256 archive boxes with COCO annotations, OCR and stamp detection data, searchable by region and theme.",
    fr: "Téléchargez le Forbin Dataset de photographies historiques : 256 cartons d'archives avec annotations COCO, OCR et détection de tampons, consultables par région et par thème."
  },
  "meta.map.title": {
    en: "Historical map — Forbin Dataset",
    fr: "Carte historique — Forbin Dataset"
  },
  "meta.map.description": {
    en: "Explore the places mentioned in the Forbin historical photographs, geocoded from archival metadata and OCR.",
    fr: "Explorez les lieux mentionnés dans les photographies historiques du fonds Forbin, géocodés à partir des métadonnées d'archives et de l'OCR."
  },
  "meta.image.alt": {
    en: "Recolorized portrait of Victor Forbin, explorer and photographer",
    fr: "Portrait recolorisé de Victor Forbin, explorateur et photographe"
  },

  // ─── Navigation and footer ────────────────────────────────────────────────
  "nav.home": { en: "Home", fr: "Accueil" },
  "nav.explore": { en: "Explore", fr: "Explorer" },
  "nav.map": { en: "Map", fr: "Carte" },
  "nav.download": { en: "Download", fr: "Télécharger" },
  "nav.documentation": { en: "Documentation", fr: "Documentation" },
  "nav.about": { en: "About", fr: "À propos" },
  "nav.main": { en: "Main navigation", fr: "Navigation principale" },
  "nav.open": { en: "Open navigation", fr: "Ouvrir la navigation" },
  "nav.menu": { en: "Menu", fr: "Menu" },
  "nav.brand": { en: "Forbin Dataset home", fr: "Accueil du Forbin Dataset" },
  "nav.language": { en: "Language", fr: "Langue" },
  "nav.lang.en": { en: "English", fr: "English" },
  "nav.lang.fr": { en: "Français", fr: "Français" },
  "footer.credits": {
    en: "Archives held by the Service historique de la Défense · ANR HIGH VISION (ANR-24-CE38-4079)",
    fr: "Archives conservées par le Service historique de la Défense · ANR HIGH VISION (ANR-24-CE38-4079)"
  },
  "skip.content": { en: "Skip to content", fr: "Aller au contenu" },
  "skip.workspace": { en: "Skip to the workspace", fr: "Aller à l'espace de travail" },
  "skip.downloads": { en: "Skip to downloads", fr: "Aller aux téléchargements" },
  "skip.map": { en: "Skip to the map", fr: "Aller à la carte" },

  // ─── Home page ────────────────────────────────────────────────────────────
  "home.eyebrow": {
    en: "Historical photographs · Document analysis · Digital humanities",
    fr: "Photographies historiques · Analyse de documents · Humanités numériques"
  },
  "home.title": { en: "The Forbin Dataset", fr: "Le Forbin Dataset" },
  "home.lead": {
    en: "More than 62,000 historical photographs from the archives of Victor Forbin, enriched with archival metadata, transcriptions, annotated stamps and automatic stamp detection.",
    fr: "Plus de 62 000 photographies historiques issues des archives de Victor Forbin, enrichies de métadonnées d'archives, de transcriptions, de tampons annotés et d'une détection automatique des tampons."
  },
  "home.explore": { en: "Explore the collection", fr: "Explorer la collection" },
  "home.download": { en: "Download the data", fr: "Télécharger les données" },
  "home.holder.small": { en: "Original archives held by", fr: "Archives originales conservées par" },
  "home.portrait.caption": {
    en: "Victor Forbin (1868–1947), explorer, photographer and writer.",
    fr: "Victor Forbin (1868–1947), explorateur, photographe et écrivain."
  },
  "home.metrics.label": { en: "Key figures", fr: "Chiffres clés" },
  "home.metrics.photos": { en: "historical photographs", fr: "photographies historiques" },
  "home.metrics.boxes": { en: "archive boxes", fr: "cartons d'archives" },
  "home.metrics.license": { en: "distribution license", fr: "licence de diffusion" },
  "home.perspectives.eyebrow": { en: "One collection, three perspectives", fr: "Une collection, trois regards" },
  "home.perspectives.title": {
    en: "From historical documents to research data",
    fr: "Des documents historiques aux données de recherche"
  },
  "home.heritage.title": { en: "Heritage", fr: "Patrimoine" },
  "home.heritage.text": {
    en: "Digitized photographic prints from Victor Forbin's personal archives, preserved by the Service historique de la Défense within their original archival organization.",
    fr: "Des tirages photographiques numérisés issus des archives personnelles de Victor Forbin, conservés par le Service historique de la Défense dans leur organisation archivistique d'origine."
  },
  "home.research.title": { en: "Research", fr: "Recherche" },
  "home.research.text": {
    en: "Searchable metadata, places, subjects, captions and press-agency stamps for history, the history of photography and digital humanities.",
    fr: "Métadonnées, lieux, sujets, légendes et tampons d'agences de presse consultables pour l'histoire, l'histoire de la photographie et les humanités numériques."
  },
  "home.computational.title": { en: "Computational data", fr: "Données computationnelles" },
  "home.computational.text": {
    en: "COCO polygons, OCR output and stamp detection predictions for historical document analysis and computer vision.",
    fr: "Polygones COCO, sorties OCR et prédictions de détection de tampons pour l'analyse de documents historiques et la vision par ordinateur."
  },
  "home.tasks.eyebrow": { en: "Research tasks", fr: "Tâches de recherche" },
  "home.tasks.title": {
    en: "A benchmark for historical document analysis",
    fr: "Un jeu de référence pour l'analyse de documents historiques"
  },
  "home.tasks.stamps.title": { en: "Stamp detection", fr: "Détection de tampons" },
  "home.tasks.stamps.text": {
    en: "Photo agency and archive stamps are annotated on the verso of the prints, with model predictions for stamp detection and recognition.",
    fr: "Les tampons d'agences photographiques et d'archives sont annotés au verso des tirages, avec des prédictions de modèles pour la détection et la reconnaissance de tampons."
  },
  "home.tasks.ocr.title": { en: "OCR and handwriting", fr: "OCR et écriture manuscrite" },
  "home.tasks.ocr.text": {
    en: "Typed and handwritten captions, titles, dates and signatures are located and transcribed for text recognition on historical documents.",
    fr: "Légendes dactylographiées et manuscrites, titres, dates et signatures sont localisés et transcrits pour la reconnaissance de texte sur documents historiques."
  },
  "home.tasks.recto.title": { en: "Recto–verso linking", fr: "Liaison recto–verso" },
  "home.tasks.recto.text": {
    en: "Each photograph pairs the image side with its annotated back, linking visual content with its archival and editorial history.",
    fr: "Chaque photographie associe la face image à son verso annoté, reliant le contenu visuel à son histoire archivistique et éditoriale."
  },
  "home.desk.eyebrow": { en: "Digital research desk", fr: "Poste de recherche numérique" },
  "home.desk.title": {
    en: "Study images, their context and their circulation",
    fr: "Étudier les images, leur contexte et leur circulation"
  },
  "home.desk.text": {
    en: "The explorer preserves each document's archival path, from its box to its recto or verso.",
    fr: "L'explorateur conserve le parcours archivistique de chaque document, du carton au recto ou au verso."
  },
  "home.desk.item1": { en: "Search metadata and transcriptions", fr: "Rechercher dans les métadonnées et les transcriptions" },
  "home.desk.item2": { en: "Compare annotations and predictions", fr: "Comparer annotations et prédictions" },
  "home.desk.item3": { en: "Zoom into recto and verso details", fr: "Zoomer sur les détails du recto et du verso" },
  "home.desk.item4": { en: "Reuse structured data for research", fr: "Réutiliser des données structurées pour la recherche" },
  "home.citation.text": {
    en: "The collection combines images, archival metadata and annotations designed for reproducible research.",
    fr: "La collection associe images, métadonnées d'archives et annotations conçues pour une recherche reproductible."
  },
  "home.citation.copy": { en: "Copy BibTeX", fr: "Copier le BibTeX" },
  "home.citation.copyLabel": { en: "Copy the BibTeX reference", fr: "Copier la référence BibTeX" },
  "home.citation.doi": { en: "Read the publication · DOI", fr: "Lire la publication · DOI" },
  "home.citation.copied": { en: "Reference copied to the clipboard.", fr: "Référence copiée dans le presse-papiers." },
  "home.citation.copyFailed": {
    en: "Automatic copying is unavailable. Select the reference manually.",
    fr: "La copie automatique est indisponible. Sélectionnez la référence manuellement."
  },
  "home.about.eyebrow": { en: "About", fr: "À propos" },
  "home.about.title": {
    en: "HIGH VISION — Computer vision for a history of early news photo agencies",
    fr: "HIGH VISION — Histoire des agences d'images et vision par ordinateur"
  },
  "home.about.text": {
    en: "The Forbin Dataset is produced within the <a class=\"text-link\" href=\"https://highvision.hypotheses.org\" target=\"_blank\" rel=\"noopener\">ANR HIGH VISION project</a> (ANR-24-CE38-4079), which brings together historians and computer vision researchers to study the birth of an international visual culture through the archives of early news photo agencies: Forbin, Rol, Bain News and Black Star.",
    fr: "Le Forbin Dataset est produit dans le cadre du <a class=\"text-link\" href=\"https://highvision.hypotheses.org\" target=\"_blank\" rel=\"noopener\">projet ANR HIGH VISION</a> (ANR-24-CE38-4079), qui réunit historiens et chercheurs en vision par ordinateur pour étudier la naissance d'une culture visuelle internationale à travers les archives des premières agences photographiques de presse : Forbin, Rol, Bain News et Black Star."
  },
  "home.partners.label": { en: "Archive holder and partners", fr: "Détenteur des archives et partenaires" },
  "home.holder.eyebrow": { en: "Archive holder", fr: "Détenteur des archives" },
  "home.holder.text": {
    en: "The original photographs of Victor Forbin are preserved by the Service historique de la Défense (SHD), under the reference <span class=\"archive-reference\">GR 2 K 247</span>. The SHD holds these archives; the images published here are digitized reproductions made available for research.",
    fr: "Les photographies originales de Victor Forbin sont conservées par le Service historique de la Défense (SHD), sous la cote <span class=\"archive-reference\">GR 2 K 247</span>. Le SHD est détenteur de ces archives ; les images publiées ici sont des reproductions numériques mises à disposition pour la recherche."
  },
  "home.holder.link": { en: "Visit the SHD website", fr: "Visiter le site du SHD" },
  "home.consortium.eyebrow": { en: "Research consortium", fr: "Consortium de recherche" },
  "home.consortium.text": {
    en: "The dataset is produced by the HIGH VISION consortium, which brings together computer science laboratories, historians and heritage institutions.",
    fr: "Le jeu de données est produit par le consortium HIGH VISION, qui réunit des laboratoires d'informatique, des historiens et des institutions patrimoniales."
  },
  "home.consortium.link": { en: "Visit the HIGH VISION website", fr: "Visiter le site de HIGH VISION" },
  "home.consortium.logoAlt": { en: "HIGH VISION project website", fr: "Site du projet HIGH VISION" },
  "home.consortium.partners": { en: "Consortium partners", fr: "Partenaires du consortium" },
  "home.funding": {
    en: "Funded by the French National Research Agency under grant ANR-24-CE38-4079.",
    fr: "Financé par l'Agence nationale de la recherche au titre du projet ANR-24-CE38-4079."
  },

  // ─── Home page: collection, dataset card, citations (used by index-preview.html) ──
  "home.facts.photosValue": { en: "62,135", fr: "62 135" },
  "home.facts.imagesValue": { en: "120,106", fr: "120 106" },
  "home.facts.images": { en: "images, recto and verso", fr: "images, recto et verso" },

  "home.facts.story.eyebrow": { en: "The collection", fr: "La collection" },
  "home.facts.story.title": {
    en: "Victor Forbin and his news picture agency",
    fr: "Victor Forbin et son agence de photographies de presse"
  },
  "home.facts.story.text": {
    en: "Victor Forbin began as a journalist in the 1880s, writing for <em>Excelsior</em>, the <em>Journal des Voyages</em>, the <em>Revue des deux mondes</em> and <em>L’Illustration</em>. In the early twentieth century he set up his own news picture agency: he bought prints in London, Berlin, Rome and New York and sold them to the main French newspapers. Its activity peaked in the 1910s and 1920s.",
    fr: "Victor Forbin débute comme journaliste dans les années 1880 et collabore à <em>Excelsior</em>, au <em>Journal des Voyages</em>, à la <em>Revue des deux mondes</em> et à <em>L’Illustration</em>. Au début du XX<sup>e</sup> siècle, il fonde sa propre agence de photographies de presse : il achète des tirages à Londres, Berlin, Rome et New York et les revend aux principaux journaux français. Son activité culmine dans les années 1910 et 1920."
  },
  "home.facts.structure.label": { en: "How the archive is organized", fr: "Organisation de l'archive" },
  "home.facts.structure.box": { en: "Boxes", fr: "Cartons" },
  "home.facts.structure.boxText": {
    en: "256 digitized, sorted by geographical area, about 240 photographs each",
    fr: "256 numérisés, classés par zone géographique, environ 240 photographies chacun"
  },
  "home.facts.structure.envelope": { en: "Envelopes", fr: "Enveloppes" },
  "home.facts.structure.envelopeText": { en: "Photographs grouped by theme", fr: "Photographies regroupées par thème" },
  "home.facts.structure.photo": { en: "Photographs", fr: "Photographies" },
  "home.facts.structure.photoText": {
    en: "Each one digitized on both sides, recto and verso",
    fr: "Chacune numérisée sur ses deux faces, recto et verso"
  },

  "home.facts.tasks.caption.title": { en: "Captioning and similarity search", fr: "Légendes et recherche par similarité" },
  "home.facts.tasks.caption.text": {
    en: "Paired images, texts and metadata support caption generation, image similarity search and metadata enrichment.",
    fr: "Images, textes et métadonnées associés permettent la génération de légendes, la recherche d'images similaires et l'enrichissement des métadonnées."
  },
  "home.facts.tasks.circulation.title": { en: "Circulation in the press", fr: "Circulation dans la presse" },
  "home.facts.tasks.circulation.text": {
    en: "Visual similarity and archival metadata help trace how photographs were reused and republished.",
    fr: "La similarité visuelle et les métadonnées d'archives aident à retracer la réutilisation et la republication des photographies."
  },
  "home.facts.tasks.degradation.title": { en: "Degradation analysis", fr: "Analyse des dégradations" },
  "home.facts.tasks.degradation.text": {
    en: "Faded ink, stains and bleed-through offer a realistic test of robustness for recognition models.",
    fr: "Encre pâlie, taches et transferts d'encre offrent un test réaliste de robustesse pour les modèles de reconnaissance."
  },

  "home.facts.card.eyebrow": { en: "Documentation", fr: "Documentation" },
  "home.facts.card.title": { en: "The dataset at a glance", fr: "Le jeu de données en bref" },
  "home.facts.card.holder": { en: "Archive holder", fr: "Détenteur des archives" },
  "home.facts.card.holderValue": {
    en: "Service historique de la Défense, series <span class=\"archive-reference\">GR 2 K 247</span>",
    fr: "Service historique de la Défense, cote <span class=\"archive-reference\">GR 2 K 247</span>"
  },
  "home.facts.card.content": { en: "Content", fr: "Contenu" },
  "home.facts.card.contentValue": {
    en: "62,135 photographs, 120,106 images (recto and verso)",
    fr: "62 135 photographies, 120 106 images (recto et verso)"
  },
  "home.facts.card.digitization": { en: "Digitization", fr: "Numérisation" },
  "home.facts.card.digitizationValue": {
    en: "By Azentis, at 300 dpi, with Canon 5DSR and Fujifilm GFX 100 S cameras",
    fr: "Par Azentis, à 300 dpi, avec des appareils Canon 5DSR et Fujifilm GFX 100 S"
  },
  "home.facts.card.metadata": { en: "Metadata", fr: "Métadonnées" },
  "home.facts.card.metadataValue": {
    en: "Class, continent, subject or country and sizes; 674 original labels grouped into 30 themes (in French)",
    fr: "Classe, continent, sujet ou pays et dimensions ; 674 libellés d'origine regroupés en 30 thèmes"
  },
  "home.facts.card.formats": { en: "Formats", fr: "Formats" },
  "home.facts.card.formatsValue": { en: "JPEG images and COCO-style JSON", fr: "Images JPEG et JSON de type COCO" },
  "home.facts.card.files": { en: "File names", fr: "Noms de fichiers" },
  "home.facts.card.filesValue": {
    en: "<code>SHDGR__GR_2_K_247_157_010__0001.jpg</code>: box 157, photograph 010, <code>0001</code> recto, <code>0002</code> verso",
    fr: "<code>SHDGR__GR_2_K_247_157_010__0001.jpg</code> : carton 157, photographie 010, <code>0001</code> recto, <code>0002</code> verso"
  },
  "home.facts.card.languages": { en: "Languages", fr: "Langues" },
  "home.facts.card.languagesValue": { en: "French and English", fr: "Français et anglais" },
  "home.facts.card.license": { en: "License", fr: "Licence" },
  "home.facts.card.published": { en: "Published", fr: "Publication" },
  "home.facts.card.publishedValue": { en: "9 December 2025", fr: "9 décembre 2025" },
  "home.facts.card.doi": { en: "Dataset DOI", fr: "DOI du jeu de données" },

  "home.facts.citation.eyebrow": { en: "Citation", fr: "Citation" },
  "home.facts.citation.title": { en: "Cite the article or the dataset", fr: "Citer l'article ou le jeu de données" },
  "home.facts.citation.article": { en: "Article", fr: "Article" },
  "home.facts.citation.dataset": { en: "Dataset", fr: "Jeu de données" },
  "home.facts.citation.datasetDoi": { en: "Open the dataset · DOI", fr: "Ouvrir le jeu de données · DOI" },

  "home.facts.credits": {
    en: "Dataset created by Mohamed Chelali, Sylvain-Karl Gosselet and Daniel Foliard (ECHELLES), Florence Cloppet and Camille Kurtz (LIPADE), and Isabelle Bloch (LIP6). With thanks to everyone who contributed to annotation and to identifying the circulation of photographs, in particular Sihem Yousfi and Marie-Louise Kitoko.",
    fr: "Jeu de données créé par Mohamed Chelali, Sylvain-Karl Gosselet et Daniel Foliard (ECHELLES), Florence Cloppet et Camille Kurtz (LIPADE) et Isabelle Bloch (LIP6). Remerciements à toutes les personnes qui ont contribué à l'annotation et à l'identification de la circulation des photographies, en particulier Sihem Yousfi et Marie-Louise Kitoko."
  },

  // ─── Explorer: layout and filters ─────────────────────────────────────────
  "explorer.collection": { en: "Collection", fr: "Collection" },
  "explorer.forbinCollection": { en: "Forbin Collection", fr: "Collection Forbin" },
  "explorer.breadcrumb": { en: "Breadcrumb", fr: "Fil d'Ariane" },
  "explorer.docNav": { en: "Document navigation", fr: "Navigation entre documents" },
  "explorer.previousDoc": { en: "Previous document", fr: "Document précédent" },
  "explorer.nextDoc": { en: "Next document", fr: "Document suivant" },
  "explorer.information": { en: "Information", fr: "Informations" },
  "explorer.collectionNav": { en: "Collection navigation", fr: "Navigation dans la collection" },
  "explorer.indexedImages": { en: "indexed images", fr: "images indexées" },
  "explorer.modes": { en: "Exploration mode", fr: "Mode d'exploration" },
  "explorer.mode.sample": { en: "Local subset", fr: "Échantillon local" },
  "explorer.mode.stream": { en: "Full collection", fr: "Collection complète" },
  "explorer.boxSearch": { en: "Search the box inventory", fr: "Rechercher dans l'inventaire des cartons" },
  "explorer.boxSearchPlaceholder": { en: "Box, country or subject", fr: "Carton, pays ou sujet" },
  "explorer.sortBoxes": { en: "Sort boxes", fr: "Trier les cartons" },
  "explorer.sort.archiveAsc": { en: "Archive number: ascending", fr: "Numéro d'archive : croissant" },
  "explorer.sort.archiveDesc": { en: "Archive number: descending", fr: "Numéro d'archive : décroissant" },
  "explorer.sort.imagesDesc": { en: "Image count: highest first", fr: "Nombre d'images : décroissant" },
  "explorer.sort.imagesAsc": { en: "Image count: lowest first", fr: "Nombre d'images : croissant" },
  "explorer.sort.description": { en: "Country or subject: A–Z", fr: "Pays ou sujet : A–Z" },
  "explorer.boxes": { en: "Boxes", fr: "Cartons" },
  "explorer.archivalStructure": { en: "Archival structure", fr: "Structure archivistique" },
  "explorer.selectedBox": { en: "Selected box", fr: "Carton sélectionné" },
  "explorer.chooseBox": { en: "Choose a box", fr: "Choisissez un carton" },
  "explorer.selectBoxHint": { en: "Select a box on the left to browse its images.", fr: "Sélectionnez un carton à gauche pour parcourir ses images." },
  "explorer.searchImages": { en: "Search images in this box", fr: "Rechercher des images dans ce carton" },
  "explorer.searchPlaceholder": { en: "Title, place, subject, OCR…", fr: "Titre, lieu, sujet, OCR…" },
  "explorer.searchField": { en: "Search field", fr: "Champ de recherche" },
  "explorer.field.all": { en: "All metadata", fr: "Toutes les métadonnées" },
  "explorer.field.identifier": { en: "Identifier and filename", fr: "Identifiant et nom de fichier" },
  "explorer.field.title": { en: "Title", fr: "Titre" },
  "explorer.field.country": { en: "Place", fr: "Lieu" },
  "explorer.field.subject": { en: "Subject and class", fr: "Sujet et classe" },
  "explorer.field.description": { en: "Description", fr: "Description" },
  "explorer.field.ocr": { en: "OCR and transcriptions", fr: "OCR et transcriptions" },
  "explorer.clearFilters": { en: "Clear filters", fr: "Effacer les filtres" },
  "explorer.moreFilters": { en: "More filters", fr: "Plus de filtres" },
  "explorer.countryRegion": { en: "Country or region", fr: "Pays ou région" },
  "explorer.subject": { en: "Subject", fr: "Sujet" },
  "explorer.allPlaces": { en: "All places", fr: "Tous les lieux" },
  "explorer.allSubjects": { en: "All subjects", fr: "Tous les sujets" },
  "explorer.availability": { en: "Enrichment availability", fr: "Enrichissements disponibles" },
  "explorer.filter.ocr": { en: "OCR or transcription", fr: "OCR ou transcription" },
  "explorer.filter.annotations": { en: "Annotations", fr: "Annotations" },
  "explorer.filter.verso": { en: "Reverse side", fr: "Verso" },
  "explorer.images": { en: "Images", fr: "Images" },
  "explorer.selectImageHint": { en: "Select an image to open the document", fr: "Sélectionnez une image pour ouvrir le document" },
  "explorer.selectBoxGallery": { en: "Select a box to display its image gallery.", fr: "Sélectionnez un carton pour afficher sa galerie d'images." },

  // ─── Explorer: viewer and document panel ──────────────────────────────────
  "explorer.viewer": { en: "Document viewer", fr: "Visionneuse de documents" },
  "explorer.backToGallery": { en: "← Back to gallery", fr: "← Retour à la galerie" },
  "explorer.sides": { en: "Document sides", fr: "Faces du document" },
  "explorer.viewerControls": { en: "Viewer controls", fr: "Commandes de la visionneuse" },
  "explorer.zoomOut": { en: "Zoom out (-)", fr: "Dézoomer (-)" },
  "explorer.zoomIn": { en: "Zoom in (+)", fr: "Zoomer (+)" },
  "explorer.fit": { en: "Fit", fr: "Ajuster" },
  "explorer.fitTitle": { en: "Fit the image to the screen (0)", fr: "Ajuster l'image à l'écran (0)" },
  "explorer.fullscreen": { en: "Full screen", fr: "Plein écran" },
  "explorer.fullscreenTitle": { en: "Display the viewer in full screen", fr: "Afficher la visionneuse en plein écran" },
  "explorer.colorKeyLabel": { en: "Annotation and prediction color key", fr: "Légende des couleurs des annotations et prédictions" },
  "explorer.emptyViewer": { en: "Select a document to display its image", fr: "Sélectionnez un document pour afficher son image" },
  "explorer.emptyViewerHint": {
    en: "Full-collection images are loaded on demand from Sharedocs.",
    fr: "Les images de la collection complète sont chargées à la demande depuis Sharedocs."
  },
  "explorer.mainImageAlt": { en: "Selected archival document", fr: "Document d'archive sélectionné" },
  "explorer.annotationLayer": { en: "Annotation layer", fr: "Calque d'annotations" },
  "explorer.viewerHelp": {
    en: "Scroll, pinch or +/− to zoom · Drag to pan · ←/→ to change document · Hover over an area to view its annotation",
    fr: "Molette, pincement ou +/− pour zoomer · Glisser pour se déplacer · ←/→ pour changer de document · Survoler une zone pour voir son annotation"
  },
  "explorer.docInfo": { en: "Document information", fr: "Informations sur le document" },
  "explorer.selectedDoc": { en: "Selected document", fr: "Document sélectionné" },
  "explorer.copyId": { en: "Copy identifier", fr: "Copier l'identifiant" },
  "explorer.viewOnMap": { en: "View on map", fr: "Voir sur la carte" },
  "explorer.archivalMetadata": { en: "Archival metadata", fr: "Métadonnées d'archives" },
  "explorer.noDocument": { en: "No document selected.", fr: "Aucun document sélectionné." },
  "explorer.textsSection": { en: "OCR, transcriptions and predictions", fr: "OCR, transcriptions et prédictions" },
  "explorer.textsPlaceholder": { en: "Related text will appear here.", fr: "Les textes associés apparaîtront ici." },

  // ─── Explorer: dynamic strings ────────────────────────────────────────────
  "explorer.noBox": { en: "No box found.", fr: "Aucun carton trouvé." },
  "explorer.imageCount": { en: { one: "{count} image", other: "{count} images" }, fr: { one: "{count} image", other: "{count} images" } },
  "explorer.loadingBox": { en: "Loading images from box {carton}…", fr: "Chargement des images du carton {carton}…" },
  "explorer.boxError": { en: "Unable to load the box: {error}", fr: "Impossible de charger le carton : {error}" },
  "explorer.imagesInBox": {
    en: { one: "{count} image in the selected box.", other: "{count} images in the selected box." },
    fr: { one: "{count} image dans le carton sélectionné.", other: "{count} images dans le carton sélectionné." }
  },
  "explorer.noMatch": { en: "No image matches the active filters.", fr: "Aucune image ne correspond aux filtres actifs." },
  "explorer.noResults": { en: "No results found.", fr: "Aucun résultat." },
  "explorer.resultsSummary": {
    en: { one: "{count} result out of {total} images.", other: "{count} results out of {total} images." },
    fr: { one: "{count} résultat sur {total} images.", other: "{count} résultats sur {total} images." }
  },
  "explorer.untitled": { en: "Untitled document", fr: "Document sans titre" },
  "explorer.notSpecified": { en: "Not specified", fr: "Non renseigné" },
  "explorer.thumbnailAlt": { en: "Document {id} thumbnail", fr: "Vignette du document {id}" },
  "explorer.annotationsCount": {
    en: { one: "{count} annotation", other: "{count} annotations" },
    fr: { one: "{count} annotation", other: "{count} annotations" }
  },
  "explorer.detectionsCount": {
    en: { one: "{count} detection", other: "{count} detections" },
    fr: { one: "{count} détection", other: "{count} détections" }
  },
  "explorer.page.first": { en: "First", fr: "Début" },
  "explorer.page.prev": { en: "Prev.", fr: "Préc." },
  "explorer.page.next": { en: "Next", fr: "Suiv." },
  "explorer.page.last": { en: "Last", fr: "Fin" },
  "explorer.page.range": { en: "{start}–{end} of {total} images", fr: "{start}–{end} sur {total} images" },
  "explorer.mapImageNotFound": { en: "Image referenced by the map could not be found.", fr: "L'image référencée par la carte est introuvable." },
  "explorer.loadingImage": { en: "Loading image…", fr: "Chargement de l'image…" },
  "explorer.imageUnavailable": { en: "Image unavailable", fr: "Image indisponible" },
  "explorer.imageErrorSharedocs": {
    en: "The document is indexed, but its file could not be loaded from Huma-Num Sharedocs.",
    fr: "Le document est indexé, mais son fichier n'a pas pu être chargé depuis Huma-Num Sharedocs."
  },
  "explorer.imageErrorLocal": {
    en: "The document is indexed, but its image file could not be loaded.",
    fr: "Le document est indexé, mais son fichier image n'a pas pu être chargé."
  },
  "explorer.imageAlt": { en: "Document {id} — {face}", fr: "Document {id} — {face}" },
  "explorer.face.recto": { en: "recto", fr: "recto" },
  "explorer.face.verso": { en: "verso", fr: "verso" },
  "explorer.openOnSharedocs": { en: "Open {carton} on Sharedocs", fr: "Ouvrir {carton} sur Sharedocs" },
  "explorer.dimensions": { en: "Dimensions ({face})", fr: "Dimensions ({face})" },
  "explorer.texts.annotations": { en: "Annotations", fr: "Annotations" },
  "explorer.texts.predictions": { en: "Text predictions", fr: "Prédictions de texte" },
  "explorer.texts.stamps": { en: "Detected and transcribed stamps", fr: "Tampons détectés et transcrits" },
  "explorer.texts.sectionCount": { en: "{title} ({count})", fr: "{title} ({count})" },
  "explorer.texts.empty": { en: "No text for this side.", fr: "Aucun texte pour cette face." },
  "explorer.texts.ocrZones": { en: "{count} OCR zones", fr: "{count} zones OCR" },
  "explorer.source.annotation": { en: "annotation", fr: "annotation" },
  "explorer.source.textPrediction": { en: "text prediction", fr: "prédiction de texte" },
  "explorer.source.prediction": { en: "prediction", fr: "prédiction" },
  "explorer.annotationTitle": { en: "Annotation", fr: "Annotation" },
  "explorer.monkeyTitle": { en: "MonkeyOCR text prediction", fr: "Prédiction de texte MonkeyOCR" },
  "explorer.stampTitle": { en: "Stamp — confidence {score}", fr: "Tampon — confiance {score}" },
  "explorer.stampTitleNoScore": { en: "Stamp — prediction", fr: "Tampon — prédiction" },
  "explorer.overlay.manual": { en: "Manual annotation", fr: "Annotation manuelle" },
  "explorer.overlay.monkey": { en: "MonkeyOCR prediction", fr: "Prédiction MonkeyOCR" },
  "explorer.overlay.score": { en: "score {score}", fr: "score {score}" },
  "explorer.overlay.noText": { en: "No transcription", fr: "Aucune transcription" },
  "explorer.legend.title": { en: "Color key", fr: "Légende" },
  "explorer.legend.manual": { en: "Manual annotations", fr: "Annotations manuelles" },
  "explorer.legend.monkey": { en: "MonkeyOCR predictions", fr: "Prédictions MonkeyOCR" },
  "prediction.stamp-detector": { en: "Stamp detector predictions", fr: "Prédictions du détecteur de tampons" },
  "explorer.dc.identifier": { en: "Identifier", fr: "Identifiant" },
  "explorer.dc.title": { en: "Title", fr: "Titre" },
  "explorer.dc.subject": { en: "Subject", fr: "Sujet" },
  "explorer.dc.description": { en: "Description", fr: "Description" },
  "explorer.dc.type": { en: "Type", fr: "Type" },
  "explorer.dc.coverage": { en: "Place", fr: "Lieu" },
  "explorer.dc.relation": { en: "Relation", fr: "Relation" },
  "explorer.dc.rights": { en: "Rights", fr: "Droits" },
  "explorer.dc.date": { en: "Date", fr: "Date" },
  "explorer.dc.contributor": { en: "Contributor", fr: "Contributeur" },
  "explorer.dc.Cluster": { en: "Document group", fr: "Groupe de documents" },
  "explorer.boxNotSpecified": { en: "Box not specified", fr: "Carton non précisé" },
  "explorer.documentLabel": { en: "Document {id}", fr: "Document {id}" },
  "explorer.document": { en: "Document", fr: "Document" },
  "explorer.fullscreenUnavailable": { en: "Full-screen mode is not available in this browser.", fr: "Le mode plein écran n'est pas disponible dans ce navigateur." },
  "explorer.idCopied": { en: "Identifier copied: {id}", fr: "Identifiant copié : {id}" },
  "explorer.idShown": { en: "Identifier: {id}", fr: "Identifiant : {id}" },
  "explorer.dataError": { en: "Some data could not be loaded: {error}", fr: "Certaines données n'ont pas pu être chargées : {error}" },

  // ─── Download page ────────────────────────────────────────────────────────
  "download.eyebrow": { en: "Research data", fr: "Données de recherche" },
  "download.title": { en: "Download the Forbin Dataset", fr: "Télécharger le Forbin Dataset" },
  "download.intro": {
    en: "Access the full collection of historical photographs or search for a box by region and theme. Archives are distributed in <code>.tar</code> format.",
    fr: "Accédez à la collection complète de photographies historiques ou recherchez un carton par région et par thème. Les archives sont distribuées au format <code>.tar</code>."
  },
  "download.openHF": { en: "Open the full dataset on Hugging Face", fr: "Ouvrir le jeu de données complet sur Hugging Face" },
  "download.inventory": { en: "Download inventory", fr: "Inventaire des téléchargements" },
  "download.available": { en: "Available boxes", fr: "Cartons disponibles" },
  "download.search": { en: "Search", fr: "Rechercher" },
  "download.searchPlaceholder": { en: "Box, country or theme", fr: "Carton, pays ou thème" },
  "download.category": { en: "Category", fr: "Catégorie" },
  "download.allCategories": { en: "All categories", fr: "Toutes les catégories" },
  "download.displayMode": { en: "Display mode", fr: "Mode d'affichage" },
  "download.table": { en: "Table", fr: "Tableau" },
  "download.compact": { en: "Compact", fr: "Compact" },
  "download.empty": { en: "No box matches these criteria.", fr: "Aucun carton ne correspond à ces critères." },
  "download.col.archive": { en: "Archive", fr: "Archive" },
  "download.col.theme": { en: "Region or theme", fr: "Région ou thème" },
  "download.col.access": { en: "Access", fr: "Accès" },
  "download.link": { en: "Download", fr: "Télécharger" },
  "download.count": {
    en: { one: "{count} box out of {total}", other: "{count} boxes out of {total}" },
    fr: { one: "{count} carton sur {total}", other: "{count} cartons sur {total}" }
  },

  "category:France": { en: "France", fr: "France" },
  "category:Africa": { en: "Africa", fr: "Afrique" },
  "category:Asia": { en: "Asia", fr: "Asie" },
  "category:Middle East": { en: "Middle East", fr: "Moyen-Orient" },
  "category:Americas": { en: "Americas", fr: "Amériques" },
  "category:Oceania": { en: "Oceania", fr: "Océanie" },
  "category:World Wars": { en: "World Wars", fr: "Guerres mondiales" },
  "category:Aviation": { en: "Aviation", fr: "Aviation" },
  "category:Science and inventions": { en: "Science and inventions", fr: "Sciences et inventions" },
  "category:Women": { en: "Women", fr: "Femmes" },
  "category:Fashion, cinema and sport": { en: "Fashion, cinema and sport", fr: "Mode, cinéma et sport" },
  "category:Europe": { en: "Europe", fr: "Europe" },
  "category:Society and everyday life": { en: "Society and everyday life", fr: "Société et vie quotidienne" },
  "category:Not specified": { en: "Not specified", fr: "Non renseigné" },

  "theme:Aerostation. Airships": { fr: "Aérostation. Dirigeables" },
  "theme:Africa (Unreferenced Photographs)": { fr: "Afrique (photographies non référencées)" },
  "theme:Africa, Ethiopia, Somalia": { fr: "Afrique, Éthiopie, Somalie" },
  "theme:Africa, animals, and miscellaneous": { fr: "Afrique, animaux et divers" },
  "theme:Agonees Archipelago": { fr: "Archipel des Agonées" },
  "theme:Agricultural equipment": { fr: "Matériel agricole" },
  "theme:Albania (115)": { fr: "Albanie (115)" },
  "theme:Albania (215)": { fr: "Albanie (215)" },
  "theme:Albania (Eastern Front) 515": { fr: "Albanie (front d'Orient) 515" },
  "theme:Albania - Eastern Front (315)": { fr: "Albanie - front d'Orient (315)" },
  "theme:Albania, Eastern Front (415)": { fr: "Albanie, front d'Orient (415)" },
  "theme:Alfeiri": { fr: "Alfeiri" },
  "theme:Arabia": { fr: "Arabie" },
  "theme:Australia": { fr: "Australie" },
  "theme:Austria": { fr: "Autriche" },
  "theme:Aviation": { fr: "Aviation" },
  "theme:Aviation. Aircraft": { fr: "Aviation. Avions" },
  "theme:Aviation. Aircraft and pilots": { fr: "Aviation. Avions et pilotes" },
  "theme:Aviation. Aviators": { fr: "Aviation. Aviateurs" },
  "theme:Aviators": { fr: "Aviateurs" },
  "theme:Beach, swimming": { fr: "Plage, natation" },
  "theme:Belgium": { fr: "Belgique" },
  "theme:Bleriot": { fr: "Blériot" },
  "theme:Bulgaria": { fr: "Bulgarie" },
  "theme:Cambodia": { fr: "Cambodge" },
  "theme:Canada": { fr: "Canada" },
  "theme:Central and South America, Chile": { fr: "Amérique centrale et du Sud, Chili" },
  "theme:Ceylon": { fr: "Ceylan" },
  "theme:China": { fr: "Chine" },
  "theme:Cinema": { fr: "Cinéma" },
  "theme:Czechoslovakia": { fr: "Tchécoslovaquie" },
  "theme:Denmark": { fr: "Danemark" },
  "theme:East Africa": { fr: "Afrique de l'Est" },
  "theme:Eastern Front": { fr: "Front d'Orient" },
  "theme:Eastern Front, Montenegro": { fr: "Front d'Orient, Monténégro" },
  "theme:Egypt": { fr: "Égypte" },
  "theme:Emigrants": { fr: "Émigrants" },
  "theme:Fashion": { fr: "Mode" },
  "theme:First World War": { fr: "Première Guerre mondiale" },
  "theme:First World War and miscellaneous": { fr: "Première Guerre mondiale et divers" },
  "theme:First World War. Camouflage": { fr: "Première Guerre mondiale. Camouflage" },
  "theme:First World War. Conferences and peace treaties": { fr: "Première Guerre mondiale. Conférences et traités de paix" },
  "theme:First World War. Health services": { fr: "Première Guerre mondiale. Service de santé" },
  "theme:First World War. Peace treaty": { fr: "Première Guerre mondiale. Traité de paix" },
  "theme:Forbin Monogram": { fr: "Monogramme Forbin" },
  "theme:Former Yugoslavia": { fr: "Ex-Yougoslavie" },
  "theme:France": { fr: "France" },
  "theme:France, Angleterre, United States": { fr: "France, Angleterre, États-Unis" },
  "theme:France, Belgium": { fr: "France, Belgique" },
  "theme:France-British": { fr: "France–Grande-Bretagne" },
  "theme:France. First World War": { fr: "France. Première Guerre mondiale" },
  "theme:France. First World War and miscellaneous": { fr: "France. Première Guerre mondiale et divers" },
  "theme:France. First World War. Artillery, 75 mm gun": { fr: "France. Première Guerre mondiale. Artillerie, canon de 75" },
  "theme:Franco-British relations": { fr: "Relations franco-britanniques" },
  "theme:Freemasonry": { fr: "Franc-maçonnerie" },
  "theme:French Equatorial Africa": { fr: "Afrique-Équatoriale française" },
  "theme:GREECE": { fr: "GRÈCE" },
  "theme:Germany": { fr: "Allemagne" },
  "theme:Germany 212": { fr: "Allemagne 212" },
  "theme:Germany 213": { fr: "Allemagne 213" },
  "theme:Glass eyes": { fr: "Yeux de verre" },
  "theme:Great Britain": { fr: "Grande-Bretagne" },
  "theme:Great Britain, Asia": { fr: "Grande-Bretagne, Asie" },
  "theme:Greece": { fr: "Grèce" },
  "theme:Hawaii": { fr: "Hawaï" },
  "theme:Health, sciences": { fr: "Santé, sciences" },
  "theme:Hungary": { fr: "Hongrie" },
  "theme:INDE": { fr: "INDE" },
  "theme:IRAK": { fr: "IRAK" },
  "theme:Iceland": { fr: "Islande" },
  "theme:India": { fr: "Inde" },
  "theme:Indochina": { fr: "Indochine" },
  "theme:Indonesia, Malaysia": { fr: "Indonésie, Malaisie" },
  "theme:Instant photographs": { fr: "Instantanés" },
  "theme:Inventions, inventors": { fr: "Inventions, inventeurs" },
  "theme:Iran, Persia": { fr: "Iran, Perse" },
  "theme:Iraq": { fr: "Irak" },
  "theme:Ireland": { fr: "Irlande" },
  "theme:Italy": { fr: "Italie" },
  "theme:Japan / Korea": { fr: "Japon / Corée" },
  "theme:Japon, Australia, Alaska": { fr: "Japon, Australie, Alaska" },
  "theme:Landscapes and everyday life": { fr: "Paysages et vie quotidienne" },
  "theme:Lapland, Finland": { fr: "Laponie, Finlande" },
  "theme:Levant": { fr: "Levant" },
  "theme:Levant/Palestine": { fr: "Levant/Palestine" },
  "theme:Libya": { fr: "Libye" },
  "theme:Malta": { fr: "Malte" },
  "theme:Military symbols and ceremonies": { fr: "Symboles et cérémonies militaires" },
  "theme:Monaco": { fr: "Monaco" },
  "theme:Morocco": { fr: "Maroc" },
  "theme:Netherlands": { fr: "Pays-Bas" },
  "theme:New Zealand": { fr: "Nouvelle-Zélande" },
  "theme:North Pole, South Pole": { fr: "Pôle Nord, pôle Sud" },
  "theme:Norway": { fr: "Norvège" },
  "theme:Oceania, Burma, Singapore": { fr: "Océanie, Birmanie, Singapour" },
  "theme:Papua": { fr: "Papouasie" },
  "theme:Persian Gulf": { fr: "Golfe Persique" },
  "theme:Photographers": { fr: "Photographes" },
  "theme:Poland": { fr: "Pologne" },
  "theme:Portugal": { fr: "Portugal" },
  "theme:Printing, journalism, journalists": { fr: "Imprimerie, journalisme, journalistes" },
  "theme:Quai d'Orsay, Versailles": { fr: "Quai d'Orsay, Versailles" },
  "theme:Romania": { fr: "Roumanie" },
  "theme:Russia": { fr: "Russie" },
  "theme:Sahara, Mauritania": { fr: "Sahara, Mauritanie" },
  "theme:Salvation Army": { fr: "Armée du Salut" },
  "theme:Sculpture": { fr: "Sculpture" },
  "theme:South Africa": { fr: "Afrique du Sud" },
  "theme:Spain": { fr: "Espagne" },
  "theme:Sports, musicians": { fr: "Sports, musiciens" },
  "theme:Sudan, Anglo-Egyptian": { fr: "Soudan anglo-égyptien" },
  "theme:Sweden": { fr: "Suède" },
  "theme:Switzerland": { fr: "Suisse" },
  "theme:Thailand": { fr: "Thaïlande" },
  "theme:Tunisia": { fr: "Tunisie" },
  "theme:Turkey": { fr: "Turquie" },
  "theme:USA": { fr: "États-Unis" },
  "theme:United States": { fr: "États-Unis" },
  "theme:West Africa": { fr: "Afrique de l'Ouest" },
  "theme:Women at Work": { fr: "Femmes au travail" },
  "theme:Women in uniform": { fr: "Femmes en uniforme" },
  "theme:Women in various situations": { fr: "Femmes dans diverses situations" },
  "theme:Yugoslavia": { fr: "Yougoslavie" },

  // ─── Map page ─────────────────────────────────────────────────────────────
  "map.toggle": { en: "Filters and legend", fr: "Filtres et légende" },
  "map.controls": { en: "Map controls", fr: "Commandes de la carte" },
  "map.eyebrow": { en: "Collection geography", fr: "Géographie de la collection" },
  "map.title": { en: "Historical map", fr: "Carte historique" },
  "map.intro": {
    en: "Explore automatically geocoded places from archival metadata and OCR/NER.",
    fr: "Explorez les lieux géocodés automatiquement à partir des métadonnées d'archives et de l'OCR/NER."
  },
  "map.layers": { en: "Layers", fr: "Calques" },
  "map.layer.places": { en: "Aggregated Forbin places", fr: "Lieux Forbin agrégés" },
  "map.layer.defaultOnly": { en: "Hide generic or low-quality labels", fr: "Masquer les libellés génériques ou peu fiables" },
  "map.search": { en: "Search", fr: "Rechercher" },
  "map.searchPlaceholder": { en: "Place, country or document ID", fr: "Lieu, pays ou identifiant de document" },
  "map.advancedFilters": { en: "Advanced filters", fr: "Filtres avancés" },
  "map.minScore": { en: "Mention geocoding score", fr: "Score de géocodage des mentions" },
  "map.minScoreHelp": {
    en: "Applied to detailed OCR/NER mentions after selecting a place.",
    fr: "Appliqué aux mentions OCR/NER détaillées après la sélection d'un lieu."
  },
  "map.minDocuments": { en: "Minimum documents", fr: "Documents minimum" },
  "map.source": { en: "Source", fr: "Source" },
  "map.source.all": { en: "All sources", fr: "Toutes les sources" },
  "map.source.metadata": { en: "Metadata only", fr: "Métadonnées uniquement" },
  "map.source.mixed": { en: "Metadata and OCR/NER", fr: "Métadonnées et OCR/NER" },
  "map.source.mixedShort": { en: "Metadata + OCR/NER", fr: "Métadonnées + OCR/NER" },
  "map.source.ocr": { en: "OCR/NER only", fr: "OCR/NER uniquement" },
  "map.country": { en: "Country", fr: "Pays" },
  "map.allCountries": { en: "All countries", fr: "Tous les pays" },
  "map.validation": { en: "Validation", fr: "Validation" },
  "map.validation.all": { en: "All statuses", fr: "Tous les statuts" },
  "map.validation.automatic": { en: "Automatic", fr: "Automatique" },
  "map.validation.accepted": { en: "Accepted", fr: "Accepté" },
  "map.validation.needs_review": { en: "Needs review", fr: "À vérifier" },
  "map.validation.rejected": { en: "Rejected", fr: "Rejeté" },
  "map.quality.title": { en: "Automatic geocoding", fr: "Géocodage automatique" },
  "map.quality.text": {
    en: "These project layers are not written to OpenHistoricalMap. Verify ambiguous places before reuse.",
    fr: "Ces calques du projet ne sont pas versés dans OpenHistoricalMap. Vérifiez les lieux ambigus avant toute réutilisation."
  },
  "map.loadingData": { en: "Loading data…", fr: "Chargement des données…" },
  "map.legend": { en: "Legend", fr: "Légende" },
  "map.mapLabel": { en: "OpenHistoricalMap map", fr: "Carte OpenHistoricalMap" },
  "map.compass": { en: "Compass rose", fr: "Rose des vents" },
  "map.loadingBasemap": { en: "Loading the historical basemap…", fr: "Chargement du fond de carte historique…" },
  "map.period": { en: "Historical map period", fr: "Période de la carte historique" },
  "map.year": { en: "Historical map year", fr: "Année de la carte historique" },
  "map.era": { en: "Forbin era", fr: "Époque Forbin" },
  "map.eraTitle": { en: "Show the Victor Forbin period, 1868–1947", fr: "Afficher la période de Victor Forbin, 1868–1947" },
  "map.timelineHelp": { en: "Timeline help", fr: "Aide sur la frise" },
  "map.timelineHelpText": {
    en: "This slider changes the OpenHistoricalMap background period.",
    fr: "Ce curseur change la période du fond de carte OpenHistoricalMap."
  },
  "map.placeDetails": { en: "Place details", fr: "Détails du lieu" },
  "map.forbinPlace": { en: "Forbin place", fr: "Lieu Forbin" },
  "map.close": { en: "Close", fr: "Fermer" },
  "map.closeDetails": { en: "Close details", fr: "Fermer les détails" },
  "map.selectPoint": { en: "Select a point to display its information.", fr: "Sélectionnez un point pour afficher ses informations." },
  "map.loadingPlaces": { en: "Loading aggregated Forbin places…", fr: "Chargement des lieux Forbin agrégés…" },
  "map.loadError": { en: "Unable to load Forbin geographic data: {error}", fr: "Impossible de charger les données géographiques Forbin : {error}" },
  "map.stats.title": { en: "Forbin geographic extraction", fr: "Extraction géographique Forbin" },
  "map.stats.visible": { en: "Visible places: {visible} / {total}", fr: "Lieux visibles : {visible} / {total}" },
  "map.stats.resolved": { en: "Resolved mentions: {count}", fr: "Mentions résolues : {count}" },
  "map.stats.ambiguous": { en: "Ambiguous entities: {count}", fr: "Entités ambiguës : {count}" },
  "map.stats.unresolved": { en: "Unresolved entities: {count}", fr: "Entités non résolues : {count}" },
  "map.automaticWarning.title": { en: "Automatic result — verification required", fr: "Résultat automatique — vérification nécessaire" },
  "map.automaticWarning.text": {
    en: "This geocoding may be ambiguous and has not been contributed to OpenHistoricalMap.",
    fr: "Ce géocodage peut être ambigu et n'a pas été versé dans OpenHistoricalMap."
  },
  "map.placeStats": { en: "Place statistics", fr: "Statistiques du lieu" },
  "map.metric.documents": { en: "Documents", fr: "Documents" },
  "map.metric.mentions": { en: "Mentions", fr: "Mentions" },
  "map.metric.metadata": { en: "Metadata", fr: "Métadonnées" },
  "map.metric.ocr": { en: "OCR/NER", fr: "OCR/NER" },
  "map.resolvedPlace": { en: "Resolved place", fr: "Lieu résolu" },
  "map.row.canonical": { en: "Canonical name", fr: "Nom de référence" },
  "map.row.country": { en: "Country", fr: "Pays" },
  "map.row.admin": { en: "Administrative area", fr: "Division administrative" },
  "map.row.geonames": { en: "GeoNames ID", fr: "Identifiant GeoNames" },
  "map.row.feature": { en: "Feature", fr: "Type d'entité" },
  "map.row.precision": { en: "Geometry precision", fr: "Précision de la géométrie" },
  "map.row.coordinates": { en: "Coordinates", fr: "Coordonnées" },
  "map.openGeonames": { en: "Open in GeoNames", fr: "Ouvrir dans GeoNames" },
  "map.sourceLabels": { en: "Source labels", fr: "Libellés sources" },
  "map.mainBoxes": { en: "Main archive boxes", fr: "Principaux cartons d'archives" },
  "map.relatedDocuments": { en: "Related documents", fr: "Documents liés" },
  "map.openImage": { en: "Open image and metadata", fr: "Ouvrir l'image et les métadonnées" },
  "map.firstDocuments": { en: "Showing the first {count} documents.", fr: "Affichage des {count} premiers documents." },
  "map.noDocument": { en: "No linked document is available in the index.", fr: "Aucun document lié n'est disponible dans l'index." },
  "map.detailedMentions": { en: "Detailed mentions", fr: "Mentions détaillées" },
  "map.loadingMentions": { en: "Loading the detailed mention layer on demand…", fr: "Chargement à la demande des mentions détaillées…" },
  "map.minScoreNote": { en: "Minimum geocoding score: {score}", fr: "Score de géocodage minimum : {score}" },
  "map.noMention": { en: "No mention matches the active source and score filters.", fr: "Aucune mention ne correspond aux filtres de source et de score actifs." },
  "map.firstMentions": { en: "Showing the first {count} mentions.", fr: "Affichage des {count} premières mentions." },
  "map.unlabelled": { en: "Unlabelled mention", fr: "Mention sans libellé" },
  "map.unresolved": { en: "Unresolved", fr: "Non résolu" },
  "map.row.document": { en: "Document", fr: "Document" },
  "map.row.role": { en: "Spatial role", fr: "Rôle spatial" },
  "map.row.ner": { en: "NER score", fr: "Score NER" },
  "map.row.geocoding": { en: "Geocoding score", fr: "Score de géocodage" },
  "map.row.face": { en: "Source face", fr: "Face source" },
  "map.row.files": { en: "Files", fr: "Fichiers" },
  "map.openDocument": { en: "Open document", fr: "Ouvrir le document" },
  "map.mentionsError": { en: "Unable to load mentions: {error}", fr: "Impossible de charger les mentions : {error}" },
  "map.searchResults": { en: "Search results", fr: "Résultats de recherche" },
  "map.resultsFor": {
    en: { one: "{count} result for “{query}”", other: "{count} results for “{query}”" },
    fr: { one: "{count} résultat pour « {query} »", other: "{count} résultats pour « {query} »" }
  },
  "map.place": { en: "Place", fr: "Lieu" },
  "map.documentsCount": { en: { one: "{count} document", other: "{count} documents" }, fr: { one: "{count} document", other: "{count} documents" } },
  "map.noSearchResult": { en: "No place or linked document matches this search.", fr: "Aucun lieu ni document lié ne correspond à cette recherche." },
  "map.bce": { en: "{year} BCE", fr: "{year} av. J.-C." }
};
