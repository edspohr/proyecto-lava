'use strict';
// Illustrative global progress only; official calculation awaits 2026 rules.
const DEMO_PROGRESS = 64;
let currentProgress = DEMO_PROGRESS;
const milestones = [25, 50, 75, 100];
const slider = document.querySelector('#simulation');
let celebrationTimer;
function renderProgress(value, announce = false) {
  const progress = Math.max(0, Math.min(100, Number(value) || 0));
  const previous = currentProgress;
  currentProgress = progress;
  slider.value = progress;
  const complete = progress === 100;
  const level = Math.min(4, Math.floor(progress / 25) + 1);
  document.querySelector('#percentage').innerHTML = `${progress}<span>%</span>`;
  document.querySelector('#slider-value').value = `${progress}%`;
  document.querySelector('#gauge-fill').style.strokeDashoffset = 691.1504 * (1 - progress / 100);
  document.querySelector('#gauge-fill').style.stroke = complete ? 'var(--lime)' : 'var(--orange)';
  document.querySelector('#level-label').textContent = complete ? 'MISIÓN COMPLETA' : `NIVEL 0${level}`;
  document.querySelector('#stage-name').textContent = complete ? '¡Juntos conquistamos la meta!' : ['La aventura comienza', 'Encendiendo motores', 'Tomando impulso', 'A un paso de la cima'][level - 1];
  document.querySelector('#remaining').textContent = complete ? 'Meta simulada. Beneficio real por confirmar.' : `${100 - progress} puntos para alcanzar la meta`;
  document.querySelector('#milestones').innerHTML = milestones.map((mark, i) => `<div class="milestone ${progress >= mark ? 'reached' : ''}" aria-label="Hito ${mark}%, ${progress >= mark ? 'alcanzado' : 'pendiente'}"><span aria-hidden="true">${progress >= mark ? '✓' : i + 1}</span>${mark}%</div>`).join('');
  document.querySelector('#announcement').textContent = '';
  if (announce && complete && previous < 100) {
    document.querySelector('#announcement').textContent = '¡Misión global completa en la simulación! Beneficio real por confirmar.';
    const celebration = document.querySelector('#celebration');
    celebration.classList.remove('playing');
    void celebration.offsetWidth;
    celebration.classList.add('playing');
    clearTimeout(celebrationTimer);
    celebrationTimer = setTimeout(() => celebration.classList.remove('playing'), 2500);
  }
}
slider.addEventListener('input', () => renderProgress(slider.value, true));
document.querySelector('#reset').addEventListener('click', () => {
  renderProgress(DEMO_PROGRESS);
  document.querySelector('#announcement').textContent = `Demo global restablecida al ${DEMO_PROGRESS}%.`;
});
renderProgress(DEMO_PROGRESS);
