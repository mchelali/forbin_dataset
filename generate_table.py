from huggingface_hub import list_repo_files
import os
import json

# --- PARAMÈTRES À CONFIGURER ---
REPO_ID = "mchelali/forbin_dataset"
REPO_TYPE = "dataset"
REVISION = "main"
# Chemin local vers votre JSON d'annotations pour mapper les régions (à adapter)
# Si vous n'avez pas de JSON local, cette étape sera simulée.
ANNOTATIONS_FILE_PATH = "forbin_all.json"
# ------------------------------


def get_region_mapping(json_path):
    """
    Crée un mapping {Nom_du_Carton: Région} à partir du JSON d'annotations.
    Nécessite que le JSON soit au format COCO avec le champ 'Carton' dans 'metadata'.
    """
    print("Chargement du JSON pour le mapping des régions...")
    if not os.path.exists(json_path):
        print("ATTENTION: Fichier JSON non trouvé. Le champ 'Région' sera vide.")
        return {}

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    region_map = {}
    for img_data in data.get("images", []):
        carton = img_data["metadata"].get("Carton")  # Ex: SHDGR__GR_2_K_247_2
        region = img_data["metadata"].get("Pays")  # Ex: Afrique Occidentale
        if carton and region:
            region_map[carton] = region

    # Gérer le cas où la clé est le nom du tar (sans .tar)
    tar_map = {f"{k}.tar": v for k, v in region_map.items()}
    return tar_map


def generate_html_table(repo_id, repo_type, revision, region_map):
    """
    Récupère la liste des fichiers TAR du dépôt et génère le tableau HTML.
    """

    # 1. Obtenir les chemins des fichiers
    try:
        file_paths = list_repo_files(
            repo_id=repo_id,
            repo_type=repo_type,
            revision=revision,
        )
    except Exception as e:
        print(f"Erreur de l'API HF: {e}")
        return "<tr><td colspan='3'>Erreur de chargement des fichiers. Vérifiez l'ID du dépôt.</td></tr>"

    # 2. Construction de l'URL de base et du tableau
    base_url = f"https://huggingface.co/{repo_type}s/{repo_id}/resolve/{revision}/"

    table_rows = []

    # Entêtes du tableau
    table_rows.append(
        "<thead><tr><th>Nom du Fichier</th><th>Région / Thématique</th><th>Lien de Téléchargement</th></tr></thead><tbody>"
    )

    for path in file_paths:
        file_name = os.path.basename(path)

        # Nous ne nous intéressons qu'aux archives TAR volumineuses
        if not file_name.endswith(".tar"):
            continue

        full_url = (
            base_url + path + "?download=true"
        )  # Ajout de ?download=true pour le clic web

        # 3. Extraction de la Région
        # Le nom du fichier TAR (ex: SHDGR__GR_2_K_247_2.tar) sert de clé dans la map
        region = region_map.get(file_name, "Non spécifié")

        # 4. Création de la ligne HTML
        row = f"""
        <tr>
            <td><code>{file_name}</code></td>
            <td>{region}</td>
            <td><a href="{full_url}" target="_blank">Télécharger</a></td>
        </tr>
        """
        table_rows.append(row)

    table_rows.append("</tbody>")

    # Structure complète du tableau
    html_table = f"""
<table class="data-table">
    {''.join(table_rows)}
</table>
    """
    return html_table


# --- EXÉCUTION DU SCRIPT ---
if __name__ == "__main__":

    # Étape A: Récupération du mapping Région/Carton
    region_mapping = get_region_mapping(ANNOTATIONS_FILE_PATH)

    # Étape B: Génération du code HTML du tableau
    html_output = generate_html_table(REPO_ID, REPO_TYPE, REVISION, region_mapping)

    # Étape C: Affichage du résultat à copier-coller dans index.html
    print("\n" + "=" * 50)
    print("COPIEZ LE CODE HTML SUIVANT ET COLLEZ-LE DANS VOTRE index.html")
    print("=" * 50)
    with open("output_table.html", "w", encoding="utf-8") as f:
        f.write(html_output)
    print("=" * 50)
