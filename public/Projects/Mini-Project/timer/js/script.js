"use strict";

const towMinutesEl = document.querySelector(".tow-minutes");
const oneMinutesEl = document.querySelector(".one-minutes");
const towSecondsEl = document.querySelector(".tow-seconds");
const oneSecondsEl = document.querySelector(".one-seconds");
const towSecondsSpeedEl = document.querySelector(".tow-seconds-speed");
const oneSecondsSpeedEl = document.querySelector(".one-seconds-speed");

const startBtn = document.querySelector(".start");
const stopBtn = document.querySelector(".stop");
const resetBtn = document.querySelector(".reset");
const lapBtn = document.querySelector(".lap");
const lapBoxEl = document.querySelector(".lap-box");

let numone = 0; // minutes - tens digit
let numtow = 0; // minutes - ones digit
let numthree = 0; // seconds - tens digit
let numfour = 0; // seconds - ones digit
let numfive = 0; // centiseconds - tens digit
let numsix = 0; // centiseconds - ones digit

let timer;
let active = false;

function render() {
  towMinutesEl.textContent = numone;
  oneMinutesEl.textContent = numtow;
  towSecondsEl.textContent = numthree;
  oneSecondsEl.textContent = numfour;
  towSecondsSpeedEl.textContent = numfive;
  oneSecondsSpeedEl.textContent = numsix;
}

startBtn.addEventListener("click", () => {
  if (active) return; // already running, ignore extra clicks
  active = true;

  timer = setInterval(() => {
    numsix++;
    if (numsix == 10) {
      numfive++;
      numsix = 0;
    }
    if (numfive == 10) {
      numfour++;
      numfive = 0;
    }
    if (numfour == 10) {
      numthree++;
      numfour = 0;
    }
    if (numthree == 6) {
      numtow++;
      numthree = 0;
    }
    if (numtow == 10) {
      numone++;
      numtow = 0;
    }

    render();
  }, 10);
});

stopBtn.addEventListener("click", () => {
  active = false;
  clearInterval(timer);
});

resetBtn.addEventListener("click", () => {
  numone = 0;
  numtow = 0;
  numthree = 0;
  numfour = 0;
  numfive = 0;
  numsix = 0;

  active = false;
  clearInterval(timer);

  render();
  lapBoxEl.innerHTML = "";
});

lapBtn.addEventListener("click", () => {
  lapBoxEl.innerHTML += `<p class="lap-text">${numone}${numtow}:${numthree}${numfour}:${numfive}${numsix}</p>`;
});

render();
