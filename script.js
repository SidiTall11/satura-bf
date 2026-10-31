const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-nav');

// Reveal content as it enters the viewport, with a graceful no-JS fallback.
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('js-motion');
  const revealTargets = document.querySelectorAll(
    '.mission-grid, .principles article, .path-heading, .steps article, .path-foot, .platform-heading, .feature, .quote-band blockquote, .action-content, .timeline-item, .phone-benefits h2, .benefit-grid article, .phone-reminder h2',
  );
  revealTargets.forEach((element, index) => {
    element.classList.add('reveal');
    if (element.matches('.principles article, .steps article, .feature')) {
      element.classList.add(`reveal-delay-${(index % 3) + 1}`);
    }
  });

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });

  revealTargets.forEach((element) => observer.observe(element));
}

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation?.classList.toggle('open', !isOpen);
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('open');
  });
});

document.querySelector('.notice-close')?.addEventListener('click', () => {
  document.querySelector('.notice')?.remove();
});

document.querySelectorAll('.notice-quit, .quick-exit').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.replace('about:blank');
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.querySelector('.notice-quit, .quick-exit')) {
    window.location.replace('about:blank');
  }
});



// Annuaire: local filtering, no third-party tracking or user data submission.
const resourceSearch = document.querySelector('#resource-search');
const resourceKind = document.querySelector('#resource-kind');
const resourceCards = [...document.querySelectorAll('#resource-list .resource-card')];
const resourceCount = document.querySelector('#directory-count');
function filterResources() {
  const query = (resourceSearch?.value || '').trim().toLocaleLowerCase('fr');
  const kind = resourceKind?.value || 'all';
  let visible = 0;
  resourceCards.forEach((card) => {
    const matchesText = `${card.textContent} ${card.dataset.search || ''}`.toLocaleLowerCase('fr').includes(query);
    const matchesKind = kind === 'all' || card.dataset.kind === kind;
    const show = matchesText && matchesKind;
    card.hidden = !show;
    if (show) visible += 1;
  });
  if (resourceCount) resourceCount.textContent = `${visible} ressource${visible > 1 ? 's' : ''} affichée${visible > 1 ? 's' : ''}`;
}
resourceSearch?.addEventListener('input', filterResources);
resourceKind?.addEventListener('change', filterResources);
// Fail closed: never send contact data until an approved endpoint is configured.
document.querySelector('#contact-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const status = document.querySelector('#contact-status');
  if (status) status.textContent = 'Le formulaire est désactivé. Aucune donnée n’a été envoyée.';
});

// Hackathon walkthrough: structured scenario only; no name, phone, transcript, or audio.
const demoIntakeForm = document.querySelector('#demo-intake-form');
demoIntakeForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.querySelector('#demo-intake-status');
  const submitButton = demoIntakeForm.querySelector('button[type="submit"]');
  const values = new FormData(demoIntakeForm);
  submitButton.disabled = true;
  if (status) status.textContent = 'Transmission au tableau de coordination…';
  try {
    const response = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ category: values.get('category'), area: values.get('area'), scenario: values.get('scenario') === 'on' })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'La demande n’a pas pu être transmise.');
    if (status) status.textContent = `Demande transmise · référence ${result.case.id}. Elle apparaît maintenant dans le tableau de coordination.`;
    demoIntakeForm.reset();
  } catch (error) {
    if (status) status.textContent = `Le parcours interactif est indisponible. ${error.message} Pour une aide réelle, appelez le 80 00 12 87.`;
  } finally {
    submitButton.disabled = false;
  }
});
