#!/bin/bash
#
# link-module.sh — crée un lien symbolique du dist/ d'un module Moulinette
# vers le dossier modules/ de chaque version de FoundryVTT (12 à 14).
#
# Usage:
#   ./scripts/link-module.sh <repoDir> [moduleID] [chemin-de-base]
#
# Arguments:
#   repoDir        Nom du dossier sous moulinette-craft/ contenant dist/
#                  (obligatoire).
#   moduleID       Nom du lien déposé dans Data/modules/ (optionnel,
#                  par défaut identique à repoDir). Utile quand le nom
#                  du dépôt diffère de l'ID du module (module.json).
#   chemin-de-base Répertoire dans lequel chercher moulinette-craft/
#                  (optionnel, défaut ".", ou variable d'env BASE_DIR).
#
# Exemple:
#   ./scripts/link-module.sh moulinette-audio-foundryvtt-module moulinette-soundboards
#   ./scripts/link-module.sh moulinette-soundboards "" ~/projets/moulinette-craft
#
# Les liens sont déposés dans ~/.local/share/FoundryVTT<version>/Data/modules
# (surchargeable via la variable d'env FOUNDRY_DATA_ROOT).

set -euo pipefail

REPO_DIR="${1:-}"
MODULE_ID="${2:-$REPO_DIR}"
BASE_DIR="${3:-${BASE_DIR:-.}}"
FOUNDRY_DATA_ROOT="${FOUNDRY_DATA_ROOT:-$HOME/.local/share}"
VERSIONS=(12 13 14)

if [[ -z "$REPO_DIR" ]]; then
  echo "Usage: $0 <repoDir> [moduleID] [chemin-de-base]" >&2
  exit 1
fi

SOURCE_DIST="$BASE_DIR/moulinette-craft/$REPO_DIR/dist"

if [[ ! -d "$SOURCE_DIST" ]]; then
  echo "Erreur: le répertoire source n'existe pas: $SOURCE_DIST" >&2
  exit 1
fi

# Chemin absolu pour que le lien symbolique reste valide quel que soit
# l'endroit d'où il est consulté.
SOURCE_DIST_ABS="$(cd "$SOURCE_DIST" && pwd)"

for VERSION in "${VERSIONS[@]}"; do
  FOUNDRY_DIR="$FOUNDRY_DATA_ROOT/FoundryVTT${VERSION}"
  MODULES_DIR="$FOUNDRY_DIR/Data/modules"
  TARGET_LINK="$MODULES_DIR/$MODULE_ID"

  if [[ ! -d "$FOUNDRY_DIR" ]]; then
    echo "⚠️  FoundryVTT${VERSION} introuvable dans $FOUNDRY_DATA_ROOT, ignoré."
    continue
  fi

  mkdir -p "$MODULES_DIR"

  if [[ -e "$TARGET_LINK" || -L "$TARGET_LINK" ]]; then
    rm -rf "$TARGET_LINK"
  fi

  ln -s "$SOURCE_DIST_ABS" "$TARGET_LINK"
  echo "✅ FoundryVTT${VERSION}: $TARGET_LINK -> $SOURCE_DIST_ABS"
done
