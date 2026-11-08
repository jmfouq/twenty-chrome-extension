# Twenty pour Gmail, LinkedIn et le web

Extension Chrome qui affiche dans un panneau latéral les contacts et sociétés de l'email Gmail ouvert, ou du profil LinkedIn affiché, tels qu'ils existent dans ton CRM Twenty.

## Gmail

- **Voir** : expéditeur et destinataires du fil ouvert, retrouvés par email (tes collègues, qui partagent ton domaine, sont ignorés) ; sociétés retrouvées par domaine (les domaines perso comme gmail.com sont ignorés).
- **Ajouter** : bouton "Ajouter" par contact ou société, ou "Tout ajouter". Ajouter une personne crée aussi sa société si elle n'existe pas, et l'y rattache.
- **Modifier** : clic sur un champ (poste, téléphone, LinkedIn, nom, domaine...) pour le modifier directement dans Twenty.
- **Notes, tâches, opportunités** : opportunités liées à la personne ou à sa société (un clic ouvre l'opportunité pour modifier son nom, son étape, son montant, sa date de clôture et y ajouter notes et tâches), notes et tâches récentes, création d'une note ou d'une tâche (titre prérempli avec l'objet du mail).

## LinkedIn

- **Profil d'une personne** : la fiche est retrouvée par l'URL du profil LinkedIn. Sinon, les fiches portant le même nom sont proposées avec un bouton "Lier" (enregistre le lien LinkedIn sur la fiche). "Ajouter" crée la personne avec son nom, son poste actuel, son lien LinkedIn et sa société (créée si besoin).
- **Suggestions "Depuis LinkedIn"** : si le poste affiché sur LinkedIn diffère de celui de Twenty, un bouton propose de l'exporter. Si la société actuelle n'existe pas dans Twenty, un bouton la crée et y rattache la personne.
- **Page d'une entreprise** : la société est retrouvée par son lien LinkedIn, puis par le domaine de son site ou son nom. Le domaine du site et le lien LinkedIn peuvent être exportés vers la fiche en un clic.
- LinkedIn n'affiche pas les emails : les personnes ajoutées depuis LinkedIn n'ont pas d'email.

## Autres sites

Sur n'importe quel site, le panneau cherche la société par le domaine du site (sous-domaines ignorés : app.agicap.com donne agicap.com). Si elle n'existe pas, "Ajouter" la crée avec ce domaine et un nom tiré du titre de la page.

## Ask AI

Le bouton "Ask AI" en haut du panneau ouvre une conversation avec l'IA de Twenty. Le même bouton sur une fiche (personne, société, opportunité) envoie la fiche comme contexte. Les conversations sont aussi dans l'historique Ask AI de Twenty ("Continuer dans Twenty"). Il faut que le rôle ait accès à l'IA ; chaque question consomme des crédits IA.

## People Data Labs

Chaque fiche ouverte a un bouton "Enrichir avec People Data Labs". Il lance l'enrichissement de l'app People Data Labs installée sur le workspace Twenty (champs vides complétés, valeurs existantes conservées). Si l'app n'est pas installée, le panneau l'indique.

## Installation

1. Installer les dépendances et construire l'extension :

   ```bash
   npm install
   npm run build
   ```

2. Dans Chrome, ouvrir `chrome://extensions`, activer le **Mode développeur** (en haut à droite).
3. Cliquer sur **Charger l'extension non empaquetée** et choisir le dossier `dist`.
4. Épingler l'extension (icône puzzle), puis cliquer dessus pour ouvrir le panneau.

Après une modification du code : `npm run build`, puis le bouton recharger de l'extension dans `chrome://extensions`.

## Connexion

Au premier lancement, le panneau demande l'URL du serveur Twenty :

- Twenty Cloud : `https://api.twenty.com`
- Auto-hébergé : l'URL de ton serveur (celle de l'API).

"Se connecter avec Twenty" ouvre la page d'autorisation de Twenty (OAuth). Après validation, l'extension garde la session et la renouvelle automatiquement. "Déconnexion" en haut du panneau efface la session.

Les actions passent par ton compte Twenty : tu ne vois et ne modifies que ce que ton rôle autorise.

## Développement

```bash
npm run dev        # rebuild automatique du panneau
npm test           # tests unitaires
npm run typecheck
```

Structure :

- `src/content/` : lecture de la page (participants du fil Gmail, profil ou entreprise LinkedIn).
- `src/panel/auth/` : connexion OAuth (enregistrement du client, PKCE, refresh).
- `src/panel/api/` : appels GraphQL à Twenty.
- `src/panel/components/` : interface du panneau.

La détection repose sur le HTML des pages. Si Gmail ou LinkedIn changent leur structure, c'est `src/content/extractGmailSnapshot.ts` ou `src/content/extractLinkedinSnapshot.ts` qu'il faudra ajuster.
