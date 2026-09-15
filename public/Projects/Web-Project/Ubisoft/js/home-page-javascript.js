"use strict";

// open modal box

const gameBtnOnHeader = document.querySelector(".game-btn-on-header");
const gameBtnOnHeaderIcon = document.querySelector(".bx-chevron-down");
const openModalheaderSection = document.querySelector(
  ".open-modal-header-section",
);

gameBtnOnHeader.addEventListener("mouseover", () => {
  openModalheaderSection.classList.add("transform-for-modal-box");
  gameBtnOnHeaderIcon.classList.add("iconDeg");
});

gameBtnOnHeader.addEventListener("mouseleave", () => {
  openModalheaderSection.classList.remove("transform-for-modal-box");
  gameBtnOnHeaderIcon.classList.remove("iconDeg");
});

openModalheaderSection.addEventListener("mouseover", () => {
  openModalheaderSection.classList.add("transform-for-modal-box");
  gameBtnOnHeaderIcon.classList.add("iconDeg");
});

openModalheaderSection.addEventListener("mouseleave", () => {
  openModalheaderSection.classList.remove("transform-for-modal-box");
  gameBtnOnHeaderIcon.classList.remove("iconDeg");
});

// change img - first slider

const allBtn = document.querySelectorAll(".change-box");
const allBox = [...document.querySelectorAll(".top-slider-boxs")];

allBtn.forEach((btn, index) => {
  btn.addEventListener("click", () => {
    allBtn.forEach((b) => {
      b.classList.remove("select-box");
    });
    let indexNum = index;
    if (indexNum == 0) {
      allBox.map((box) => {
        allBtn[0].classList.add("select-box");
        box.classList.add("hide-box");
        allBox[0].classList.remove("hide-box");
      });
    } else if (indexNum == 1) {
      allBtn[1].classList.add("select-box");
      allBox.map((box) => {
        box.classList.add("hide-box");
        allBox[1].classList.remove("hide-box");
      });
    } else if (indexNum == 2) {
      allBtn[2].classList.add("select-box");
      allBox.map((box) => {
        box.classList.add("hide-box");
        allBox[2].classList.remove("hide-box");
      });
    } else if (indexNum == 3) {
      allBtn[3].classList.add("select-box");
      allBox.map((box) => {
        box.classList.add("hide-box");
        allBox[3].classList.remove("hide-box");
      });
    }
  });
});

// first game slider fetch

const sliderGameRoot = document.querySelector(".first-games-slider-root");

(async () => {
  try {
    const res = await fetch("/api/ubisoft?type=first");
    const data = await res.json();
    data.map((item) => {
      if (item.discountPercent == null) {
        item.discountPercent = "0%";
      }
      if (item.originalPrice == null) {
        item.originalPrice = item.finalPrice;
      }
      sliderGameRoot.innerHTML += `
        <div class="game-card">
            <img
              src="${item.image}"
              alt=""
            />
            <h2 class="game-name">${item.title.split(" ").splice(0, 2).join(" ")}</h2>
            <p class="game-description">${item.description}</p>
            <div class="all-price">
              <p class="original-price">${item.originalPrice}</p>
              <div class="discount-and-price">
                <p class="discount">${item.discountPercent}</p>
                <p class="price">${item.finalPrice}</p>
              </div>
            </div>
        </div>
      `;
    });
  } catch (error) {
    console.log(error.message);
  }
})();

// transform game slider

const nextBtn = document.querySelector(".next-in-first-game-slider");
const prevBtn = document.querySelector(".prev-in-first-game-slider");
const gameSlider = document.querySelector(".first-games-slider-root");
const spansSlider = document.querySelectorAll(".spans-in-game-slider span");

nextBtn.addEventListener("click", () => {
  gameSlider.classList.add("transform-game-slider");
  spansSlider[0].classList.remove("back-color-span-for-slider");
  spansSlider[1].classList.add("back-color-span-for-slider");
  nextBtn.disabled = true;
  setTimeout(() => { nextBtn.disabled = false; }, 500);
});

prevBtn.addEventListener("click", () => {
  gameSlider.classList.remove("transform-game-slider");
  spansSlider[0].classList.add("back-color-span-for-slider");
  spansSlider[1].classList.remove("back-color-span-for-slider");
  prevBtn.disabled = true;
  setTimeout(() => { prevBtn.disabled = false; }, 500);
});

// first game slider fetch

const secondSliderGameRoot = document.querySelector(
  ".second-games-slider-root",
);

(async () => {
  try {
    const res = await fetch("/api/ubisoft?type=second");
    const data = await res.json();
    data.map((item) => {
      if (item.discountPercent == null) {
        item.discountPercent = "0%";
      }
      if (item.originalPrice == null) {
        item.originalPrice = item.finalPrice;
      }
      secondSliderGameRoot.innerHTML += `
            <div class="second-game-card">
              <img
                src="${item.image}"
                alt=""
              />
              <h2 class="game-name">${item.title.split(" ").splice(0, 2).join(" ")}</h2>
              <p class="game-description">${item.description}</p>
              <div class="all-price">
                <p class="original-price">${item.originalPrice}</p>
                <div class="discount-and-price">
                  <p class="discount">${item.discountPercent}</p>
                  <p class="price">${item.finalPrice}</p>
                </div>
              </div>
            </div>
      `;
    });
  } catch (error) {
    console.log(error.message);
  }
})();

// transform game slider second

const nextBtnSecondSlider = document.querySelector(
  ".next-in-second-game-slider",
);
const prevBtnSecondSlider = document.querySelector(
  ".prev-in-second-game-slider",
);
const gameSliderSecondSlider = document.querySelector(
  ".second-games-slider-root",
);
const spansSliderSecondSlider = document.querySelectorAll(
  ".spans-in-game-slider-second span",
);

nextBtnSecondSlider.addEventListener("click", () => {
  gameSliderSecondSlider.classList.add("transform-game-slider-second");
  spansSliderSecondSlider[0].classList.remove("back-color-span-for-slider");
  spansSliderSecondSlider[1].classList.add("back-color-span-for-slider");
  nextBtnSecondSlider.disabled = true;
  setTimeout(() => { nextBtnSecondSlider.disabled = false; }, 500);
});

prevBtnSecondSlider.addEventListener("click", () => {
  gameSliderSecondSlider.classList.remove("transform-game-slider-second");
  spansSliderSecondSlider[0].classList.add("back-color-span-for-slider");
  spansSliderSecondSlider[1].classList.remove("back-color-span-for-slider");
  prevBtnSecondSlider.disabled = true;
  setTimeout(() => { prevBtnSecondSlider.disabled = false; }, 500);
});

// humbergur menu js

const humberIcon = document.querySelector(".humburger-menu-icon");
const deleteHubmerSpan = document.querySelector(
  ".humburger-menu-icon span:nth-child(2)",
);
const firstSpan = document.querySelector(
  ".humburger-menu-icon span:nth-child(1)",
);
const lastSpan = document.querySelector(
  ".humburger-menu-icon span:nth-child(3)",
);
const gameMenuInHumburgerMenuBtn = document.querySelector(
  ".open-modal-in-header-mobile-size p",
);
const gameMenuInHumburgerMenuBtnArrow = document.querySelector(
  ".open-modal-in-header-mobile-size p > i",
);
const gameUnderMenu = document.querySelector(".link-box");

const body = document.querySelector("body");
const hubmerSection = document.querySelector(".hamburger-menu-section");

let isActiveHumberMenu = false;
let isActiveUnderMenu = false;

humberIcon.addEventListener("click", () => {
  if (!isActiveHumberMenu) {
    hubmerSection.classList.add("show-humbergur-menu");
    deleteHubmerSpan.classList.add("disabled-span");
    firstSpan.classList.add("rotate-first-span");
    lastSpan.classList.add("rotate-last-span");
    isActiveHumberMenu = true;
    body.classList.add("body-overflow");
  } else {
    hubmerSection.classList.remove("show-humbergur-menu");
    deleteHubmerSpan.classList.remove("disabled-span");
    firstSpan.classList.remove("rotate-first-span");
    lastSpan.classList.remove("rotate-last-span");
    isActiveHumberMenu = false;
    body.classList.remove("body-overflow");
    gameUnderMenu.classList.remove("fit-content-height");
    isActiveUnderMenu = false;
  }
});

gameMenuInHumburgerMenuBtn.addEventListener("click", () => {
  if (!isActiveUnderMenu) {
    gameUnderMenu.classList.add("fit-content-height");
    gameMenuInHumburgerMenuBtnArrow.classList.add("rotate-arrow");
    isActiveUnderMenu = true;
  } else {
    gameUnderMenu.classList.remove("fit-content-height");
    gameMenuInHumburgerMenuBtnArrow.classList.remove("rotate-arrow");
    isActiveUnderMenu = false;
  }
});
