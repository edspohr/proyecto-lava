'use strict';
// Design demo only: equal-weight PI/AR average is illustrative, not an approved business formula.
const DEMO = { pi: 72, ar: 56 };
const values = { ...DEMO };
const milestones = [25, 50, 75, 100];
let previousProgress = 64;
let celebrationTimer;
function render(announce = false) {
  for (const area of ['pi', 'ar']) {
    const value = values[area];
    document.querySelector(`#simulation-${area}`).value = value;
    document.querySelector(`#${area}-value`).value = `${value}%`;
    document.querySelector(`#${area}-percentage`).innerHTML = `${value}<small>%</small>`;
    document.querySelector(`#${area}-fill`).style.width = `${value}%`;
    document.querySelector(`#${area}-meter`).setAttribute('aria-valuenow', value);
    document.querySelector(`#${area}-remaining`).textContent = value === 100 ? '¡Meta simulada alcanzada!' : `Faltan ${100 - value} puntos`;
  }
  const progress = Math.round((values.pi + values.ar) / 2);
  const complete = progress === 100;
  const level = Math.min(4, Math.floor(progress / 25) + 1);
  document.querySelector('#percentage').innerHTML = `${progress}<span>%</span>`;
  document.querySelector('#global-fill').style.width = `${progress}%`;
  document.querySelector('#global-meter').setAttribute('aria-valuenow', progress);
  document.querySelector('#level-label').textContent = complete ? 'META SIMULADA' : `NIVEL 0${level}`;
  document.querySelector('#stage-name').textContent = complete ? '¡Juntos conquistamos la meta!' : ['La aventura comienza', 'Encendiendo motores', 'Tomando impulso', 'La meta está cerca'][level - 1];
  document.querySelector('#remaining').textContent = complete ? '¡Meta alcanzada en esta simulación!' : `${100 - progress} puntos para alcanzar la meta`;
  document.querySelector('#milestones').innerHTML = milestones.map(mark => `<div class="milestone ${progress >= mark ? 'reached' : ''}" aria-label="Hito ${mark}%, ${progress >= mark ? 'alcanzado' : 'pendiente'}"><span aria-hidden="true">${progress >= mark ? '✓' : '·'}</span>${mark}%</div>`).join('');
  document.querySelector('#announcement').textContent = '';
  if (announce && complete && previousProgress < 100) {
    document.querySelector('#announcement').textContent = '¡PI y AR alcanzaron la meta en la simulación! Las condiciones reales del beneficio están por confirmar.';
    const celebration = document.querySelector('#celebration');
    celebration.classList.remove('playing');
    void celebration.offsetWidth;
    celebration.classList.add('playing');
    clearTimeout(celebrationTimer);
    celebrationTimer = setTimeout(() => celebration.classList.remove('playing'), 2500);
  }
  previousProgress = progress;
}
for (const area of ['pi', 'ar']) document.querySelector(`#simulation-${area}`).addEventListener('input', event => {
  values[area] = Math.max(0, Math.min(100, Number(event.target.value) || 0));
  render(true);
});
document.querySelector('#reset').addEventListener('click', () => {
  Object.assign(values, DEMO);
  render();
  document.querySelector('#announcement').textContent = 'Demo restablecida: PI 72%, AR 56%, avance global 64%.';
});
render();
