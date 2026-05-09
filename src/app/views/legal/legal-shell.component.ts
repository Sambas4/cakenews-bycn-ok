import { Component, computed, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

type LegalDoc = 'terms' | 'privacy' | 'mentions';

interface LegalContent {
  title: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
}

const TERMS: LegalContent = {
  title: 'Conditions Générales d\'Utilisation',
  intro: `Les présentes CGU régissent l'usage de l'application CakeNews. En accédant
au service, l'utilisateur accepte ces conditions sans réserve.`,
  sections: [
    {
      heading: '1. Objet',
      body: [
        `CakeNews est un service de diffusion d'informations éditoriales rédigées
par des journalistes humains. L'application permet de consulter, réagir
et partager du contenu, ainsi que de signaler des publications dont la
véracité ou l'éthique semble discutable.`,
      ],
    },
    {
      heading: '2. Compte utilisateur',
      body: [
        `La création d'un compte requiert une adresse email valide. L'utilisateur
s'engage à fournir des informations exactes et à protéger ses identifiants.`,
        `L'authentification à deux facteurs (TOTP) est disponible et recommandée
pour les comptes éditeurs. L'utilisateur est seul responsable des
activités effectuées depuis son compte.`,
      ],
    },
    {
      heading: '3. Contenu et modération',
      body: [
        `Les articles publiés sont rédigés par l'équipe éditoriale CakeNews. Les
commentaires, votes "Vibe" et signalements relèvent de la responsabilité
de leur auteur.`,
        `CakeNews se réserve le droit de modérer, masquer ou supprimer tout
contenu contraire aux lois en vigueur ou à la charte de bonne conduite.
Les actions de modération sont consignées dans un journal d'audit
interne.`,
      ],
    },
    {
      heading: '4. Propriété intellectuelle',
      body: [
        `Les articles, illustrations et marques restent la propriété de CakeNews
ou de leurs ayants droit. Toute reproduction non autorisée est interdite.`,
        `Le contenu produit par l'utilisateur (commentaires, votes, follows)
reste sa propriété mais l'utilisateur accorde à CakeNews une licence
non exclusive de diffusion dans le cadre du service.`,
      ],
    },
    {
      heading: '5. Disponibilité du service',
      body: [
        `CakeNews fait ses meilleurs efforts pour assurer la disponibilité du
service mais ne peut garantir une absence d'interruption. L'application
fonctionne en mode hors-ligne pour les derniers articles consultés.`,
      ],
    },
    {
      heading: '6. Responsabilité',
      body: [
        `CakeNews ne peut être tenu responsable des dommages indirects résultant
de l'utilisation du service. L'utilisateur reconnaît avoir conscience
des limites inhérentes à un service en ligne.`,
      ],
    },
    {
      heading: '7. Évolution des CGU',
      body: [
        `Les présentes CGU peuvent être modifiées à tout moment. Toute évolution
substantielle déclenche une demande explicite de consentement à la
prochaine connexion.`,
      ],
    },
  ],
};

const PRIVACY: LegalContent = {
  title: 'Politique de confidentialité',
  intro: `CakeNews considère la protection de tes données comme un engagement
éditorial autant qu'une obligation légale. Cette page documente
précisément ce que nous collectons, pourquoi, et comment tu peux
exercer tes droits RGPD.`,
  sections: [
    {
      heading: 'Responsable du traitement',
      body: [
        `Le responsable du traitement des données personnelles est l'éditeur
de CakeNews. Pour toute question relative à tes données :
contact@cakenews.app.`,
      ],
    },
    {
      heading: 'Données collectées',
      body: [
        `Au strict minimum nécessaire au service : email, pseudo, photo
de profil, préférences, historique de lecture, votes, commentaires
publiés, signalements, follows, événements de score de confiance.`,
        `Aucune donnée biométrique. Aucune donnée publicitaire. Aucun
partage de profil avec des tiers.`,
      ],
    },
    {
      heading: 'Base légale',
      body: [
        `Exécution du contrat (article 6.1.b RGPD) pour les données
nécessaires au fonctionnement du compte. Consentement explicite
(article 6.1.a) pour le suivi anonyme des erreurs.`,
      ],
    },
    {
      heading: 'Conservation',
      body: [
        `Les données du compte sont conservées tant que le compte est actif.
La suppression du compte déclenche un effacement définitif des données
personnelles, à l'exception des journaux d'audit légaux conservés
36 mois.`,
      ],
    },
    {
      heading: 'Tes droits',
      body: [
        `Droit d'accès et de portabilité : un export complet est disponible
en un tap depuis Profil → Paramètres → "Exporter mes données".`,
        `Droit de rectification : modifie ton profil directement dans
l'application.`,
        `Droit à l'effacement : Profil → Paramètres → "Supprimer le compte".
La suppression est immédiate et définitive.`,
        `Droit d'opposition au suivi anonyme : refuse le bandeau de
consentement, ou révoque-le ultérieurement.`,
      ],
    },
    {
      heading: 'Sécurité',
      body: [
        `Communications chiffrées en transit (TLS 1.3). Mots de passe stockés
hachés (bcrypt). MFA TOTP disponible pour tous les comptes.
Politique de sécurité Content-Security-Policy stricte.`,
      ],
    },
    {
      heading: 'Réclamation',
      body: [
        `Tu peux à tout moment introduire une réclamation auprès de la CNIL :
www.cnil.fr.`,
      ],
    },
  ],
};

const MENTIONS: LegalContent = {
  title: 'Mentions légales',
  intro: `Informations éditoriales requises par la loi française pour la
confiance dans l'économie numérique (LCEN, article 6.III).`,
  sections: [
    {
      heading: 'Éditeur',
      body: [
        `Service édité par l'équipe CakeNews. Les coordonnées complètes
(forme juridique, siège social, RCS, capital social, directeur de
publication, contact email) doivent être renseignées dans la version
de production avant la mise en ligne.`,
      ],
    },
    {
      heading: 'Hébergement',
      body: [
        `Application hébergée par Supabase et l'infrastructure CDN du
fournisseur d'hébergement choisi pour le déploiement.`,
      ],
    },
    {
      heading: 'Directeur de la publication',
      body: [
        `Le directeur de la publication est l'administrateur principal du
service tel que désigné lors du déploiement.`,
      ],
    },
    {
      heading: 'Contact',
      body: [
        `Toute question éditoriale ou juridique : contact@cakenews.app.
Toute question relative aux données personnelles :
privacy@cakenews.app.`,
      ],
    },
  ],
};

const DOCS: Record<LegalDoc, LegalContent> = {
  terms: TERMS,
  privacy: PRIVACY,
  mentions: MENTIONS,
};

/**
 * Single shell rendering one of the three legal documents based on the
 * `:doc` route parameter. Pure presentation — content is sourced from
 * the `DOCS` map above and ships in the bundle so the pages remain
 * available offline (compliance teams ask for it).
 *
 * If the route param is unknown, we render the terms by default.
 */
@Component({
  selector: 'app-legal-shell',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="w-full h-full bg-black flex flex-col text-white">
      <header class="flex items-center justify-between px-5 h-14 border-b border-white/[0.04] z-10 shrink-0">
        <button type="button" (click)="goBack()" aria-label="Retour"
          class="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors">
          <lucide-icon name="chevron-left" class="w-4 h-4"></lucide-icon>
        </button>
        <h1 class="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Légal</h1>
        <span class="w-9 h-9"></span>
      </header>

      <article class="flex-1 overflow-y-auto custom-scrollbar px-6 pt-6 pb-24 max-w-prose mx-auto w-full">
        <h2 class="text-[20px] font-[1000] tracking-tight text-white">{{ content().title }}</h2>
        <p class="text-[12.5px] text-zinc-400 leading-relaxed mt-2">{{ content().intro }}</p>

        <div class="mt-6 space-y-6">
          @for (section of content().sections; track section.heading) {
            <section>
              <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-[#7ae25c] mb-2">
                {{ section.heading }}
              </h3>
              @for (p of section.body; track $index) {
                <p class="text-[12.5px] text-zinc-300 leading-relaxed mb-3 whitespace-pre-line">{{ p }}</p>
              }
            </section>
          }
        </div>

        <p class="text-[10px] text-zinc-600 mt-10">
          Dernière mise à jour&nbsp;: {{ today }}.
        </p>
      </article>
    </div>
  `,
})
export class LegalShellComponent {
  private route = inject(ActivatedRoute);
  private location = inject(Location);

  readonly content = computed<LegalContent>(() => {
    const raw = this.route.snapshot.paramMap.get('doc') as LegalDoc | null;
    return DOCS[raw ?? 'terms'] ?? TERMS;
  });

  readonly today = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });

  goBack(): void { this.location.back(); }
}
