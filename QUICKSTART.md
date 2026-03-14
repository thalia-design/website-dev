# QUICKSTART - website-dev

## 1) Rôle des repos
- `website-dev` : source de développement (code, templates, données, styles, assets de travail).
- `thalia-design.github.io` : sortie de build publiée (HTML/CSS/JS statiques).
- `assets` : assets publiés servis côté site sous des URLs `assets/...`.

## 2) Principe du projet
- Site statique.
- En dev : structure DRY/modulaire.
- En build : redondance normale (pages HTML générées).
- Source de vérité : `dev/` et `config/` dans `website-dev`.
- Ne pas éditer manuellement les fichiers générés dans `build/`.

## 3) Structure utile (source)
- `dev/index.html` : page d'accueil.
- `dev/p/<slug>/index.html` : pages projet.
- `dev/data/projects.js` : données projets (clé = slug).
- `dev/assets/projets/<slug>/` : médias liés au projet.
- `dev/import/html/` : composants HTML réutilisables.
- `dev/import/styles/` : styles modulaires.

## 4) Contrat de slug (point critique)
Le même slug doit exister dans 3 endroits :
1. Clé dans `dev/data/projects.js`
2. Dossier page `dev/p/<slug>/`
3. Dossier assets `dev/assets/projets/<slug>/`

Si l'un manque, le rendu devient incohérent (placeholders non remplacés, assets manquants, liens cassés).

## 5) Ce qui est auto-généré
- La grille home est générée depuis `dev/data/projects.js`.
- Les placeholders `{p%...%}` d'une page projet sont remplis depuis l'entrée data du même slug.
- Placeholders de chemin :
  - `{%ap%}` -> `assets/projets`
  - `{%p%}` -> slug de la page courante
  - `{%dirDepth%}` -> profondeur relative
