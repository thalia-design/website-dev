import "./main.scss";
import "./import/scripts/postcss-vh-correction.js";

//- LIBRARIES
import Swup from "swup";
import LocomotiveScroll from "locomotive-scroll/packages/lib";
import Muuri from 'muuri';
// import anime from 'animejs/lib/anime.es.js';
import BezierEasing from "bezier-easing"


//- VARS
const docHTML = document.documentElement;



// HELPER FUNCTIONS
const _GET = {
    viewportSize : () => {
        return [
            window.innerWidth  || docHTML.clientWidth  || document.body.clientWidth,
            window.innerHeight || docHTML.clientHeight || document.body.clientHeight
        ]
    },
    elementCenterPos : (el) => {
        const elRect = el.getBoundingClientRect();
        return [
            elRect.left + (elRect.width / 2),
            elRect.top + (elRect.height / 2)
        ]
    },
    scrollbarWidth : (forceNewBigger = false) => {
        let sw = window.innerWidth - docHTML.clientWidth;
        if(forceNewBigger) {
            const swCurrent = parseFloat(window.getComputedStyle(docHTML).getPropertyValue('--scrollbar-width').replace("px", ""));
            sw = (swCurrent > sw) ? swCurrent : sw;
        }
        docHTML.style.setProperty('--scrollbar-width', ((sw > 0) ? sw : 0) + 'px');
        return sw;
    },
    randomIntFromInterval : (min, max) => { // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min)
    },
}

function lerp (start, end, amt) { return (1 - amt) * start + amt * end; }

function atTransitionEnd(el, callback, options = {property : false, once : true, debug : false}) {
    if (!options.property) { // all css properties
        el.addEventListener("transitionend", () => {
            callback();
        }, { once : options.once });
    }
    else { // only for specified css property
        el.addEventListener("transitionend", (ev) => {
            if (ev.propertyName == options.property) { callback(); }
        }, { once : options.once });
    }

    if (options.debug) {
        el.addEventListener("transitionend", (ev) => {
            console.debug("[atTransitionEnd] "+ ev.propertyName + ((options.property) ? (" (selected)") : ""), el);
        });
    }

    let isNotAlreadyListening = true;
    atTransitionEnd_Array.forEach((e) => { isNotAlreadyListening &= (e == el) ? false : true; });
    if (isNotAlreadyListening) {
        atTransitionEnd_Array.push(el);
        el.childNodes.forEach((el) => { el.addEventListener("transitionend", (ev) => { ev.stopPropagation(); })});
    }
} let atTransitionEnd_Array = [];



//- OPTIONS
let THALIA_GLOBALS = {};
THALIA_GLOBALS.vpSize = _GET.viewportSize();
window.addEventListener("resize", () => { THALIA_GLOBALS.vpSize = _GET.viewportSize(); });



// SMOOTH SCROLL
let ScrollMain;
const SCROLL = {
    options : {
        scroll: {
            lenisOptions: {
                smoothWheel: true,
                smoothTouch: false,
                wheelMultiplier: 0.9,
                duration: 1,
                easing: (x) => Math.min(1, 1.001 - Math.pow(5, -7 * x)), // https://www.desmos.com/calculator/brs54l4xou
                orientation: 'vertical',
                gestureOrientation: 'vertical',
            },
            triggerRootMargin: '-1px -1px -1px -1px', // inview elements
            rafRootMargin: '100% 100% 100% 100%', // scroll elements
            autoResize: true,
            //scrollCallback: ScrollMain_onScroll,
        },
        scrollTo: {
            offset: 0,
            duration: 0.9,
            immediate : false,
            lock: false,
            easing: (x) => ( BezierEasing(0.45, 0, 0.05, 1)(x) ),
        },
    },
    resize : (instance, delay = 200) => {
        setTimeout(() => {
            instance.resize();
        }, delay);
    },
    getScroll : (instance) => {
        return instance.lenisInstance.targetScroll;
    },
    initEvents : () => {
        window.addEventListener('scrollHit', (e) => { // data-scroll-position="start,start"
            if (e.detail.progress >= 1) {
                e.detail.target.classList.add("is-scroll-hit");
                return;
            } else {
                e.detail.target.classList.remove("is-scroll-hit");
            }
        });
    },
}


// STICKY MENU
let STICKY_MENU = {
    elements : {
        menusContainers : document.querySelectorAll(".sticky-menu wrapper[menu-show-id]"),

        projectNameSpan : document.querySelector(".sticky-menu wrapper[menu-show-id] .project-name"),
        projectH1 : undefined,
    },
    init : () => {
        docHTML.setAttribute("thalia-sticky-menu-state", "false");
        STICKY_MENU.elements.menusContainers.forEach((el) => { el.setAttribute("menu-show-state", "false"); });

        STICKY_MENU.toggleMenuFromURL(swup.location.pathname);
        swup.hooks.on('content:replace', (visit) => { STICKY_MENU.toggleMenuFromURL(visit.to.url); });

        window.addEventListener('scrollStickyMenu', (e) => {
            if (SCROLL.getScroll(ScrollMain) < 5) {
                docHTML.setAttribute("thalia-sticky-menu-state", "true");
                return;
            }
            docHTML.setAttribute("thalia-sticky-menu-state", e.detail.way === "enter");
        });
    },
    triggerAnimate : (el, state = false) => {
        el.style.width = el.firstElementChild.getBoundingClientRect().width + "px";

        setTimeout(() => {
            el.setAttribute("menu-show-state", "transition-"+ state);

            atTransitionEnd(
                el,
                () => {
                    el.setAttribute("menu-show-state", state);
                    el.style.width = null;
                },
                { once : true }
            );
        }, 100);
    },
    toggleMenu: (menuKey) => {
        if (menuKey === "project") {
            STICKY_MENU.elements.projectH1 = document.querySelector(".section-main-gallery h1.project-title");

            if (!STICKY_MENU.elements.projectH1) {
                STICKY_MENU.elements.projectNameSpan.innerText = "t";
            }
            else {
                STICKY_MENU.elements.projectNameSpan.innerText = STICKY_MENU.elements.projectH1.innerText;
            }

        }

        const selectMenus = document.querySelectorAll('*[menu-show-id="'+ menuKey +'"]');
        if(selectMenus.length <= 0) { console.error("[STICKY_MENU.toggleMenu] not found : "+ menuKey); return; };

        STICKY_MENU.elements.menusContainers.forEach((el) => {
            if (el.getAttribute("menu-show-id") !== menuKey) {
                STICKY_MENU.triggerAnimate(el, false);
            }
        });

        selectMenus.forEach((el) => {
            if (el.getAttribute("menu-show-state").includes("true")) { return; }
            STICKY_MENU.triggerAnimate(el, true);
        });
    },
    toggleMenuFromURL : (toURL) => {
        if (toURL !== "/") {
            STICKY_MENU.toggleMenu("project");
        }
        else {
            STICKY_MENU.toggleMenu("filters");
        }
    },
}



// THALIA CHARA ANIMATIONS
let THALIA_CHARA = {
    options : {
        dragIntensity : [0.5, 0.6],
        angleDamping : 0.025,
        look : {
            maxDistance : 10,
            damping : [20, 15]
        },
        blink : {
            startTimeout : 2000,
            interval : 4000,
            randomIntervalAdd : 10000,
            speed : 190,
        }
    },
    data : {
        dragPos : [0, 0],
        look : {},
        blinkIntervalInstance : null,
    },
    elements : {
        dragContainer : document.querySelector("main"),
        contentContainer : document.querySelector(".section-main-head"),
        main : document.querySelector(".interactive-chara-thalia svg.thalia-chara"),
        mainEyes : document.querySelector(".interactive-chara-thalia svg.thalia-chara g[data-name='eyes']"),
        hands : document.querySelectorAll(".chara-thalia--hands svg.thalia-chara"),
        socialBtns : document.querySelectorAll(".section-main-head .socials .social-btn")
    },
    interactions : {
        init: () => {
            if(THALIA_CHARA.elements.main && !THALIA_CHARA.data.activated) {
                THALIA_CHARA.data.activated = true;
                THALIA_CHARA.data.state = "resting";
                docHTML.setAttribute("thalia-chara-state", "resting");
                THALIA_CHARA.interactions.toggleHands(true);
                window.addEventListener('scrollThaliaCharaHandsToggle', (e) => {
                    if (SCROLL.getScroll(ScrollMain) < 5) {
                        THALIA_CHARA.interactions.toggleHands(true);
                        return;
                    }
                    THALIA_CHARA.interactions.toggleHands(e.detail.way === "enter");
                });
                THALIA_CHARA.interactions.initBlinkHit();

                THALIA_CHARA.interactions.updateEyesPosition();
                window.addEventListener("resize", THALIA_CHARA.interactions.updateEyesPosition);
                THALIA_CHARA.elements.contentContainer.addEventListener("mouseenter", THALIA_CHARA.interactions.updateEyesPosition);

                THALIA_CHARA.interactions.look();
                THALIA_CHARA.elements.dragContainer.addEventListener("mouseenter", THALIA_CHARA.interactions.look);
                THALIA_CHARA.elements.dragContainer.addEventListener("mouseleave", THALIA_CHARA.interactions.unlook);
                THALIA_CHARA.elements.dragContainer.addEventListener("mouseleave", THALIA_CHARA.interactions.pointerStop);
                THALIA_CHARA.elements.dragContainer.addEventListener("mouseup", THALIA_CHARA.interactions.pointerStop);

                THALIA_CHARA.elements.main.addEventListener("mousedown", THALIA_CHARA.interactions.pointerActive);

                // social btns
                if(THALIA_CHARA.elements.socialBtns.length > 0) {
                    THALIA_CHARA.interactions.socialBtnHover = (e) => {
                        docHTML.setAttribute("thalia-social-hover", "true");
                    }
                    THALIA_CHARA.interactions.socialBtnOut = (e) => {
                        docHTML.setAttribute("thalia-social-hover", "false");
                    }

                    THALIA_CHARA.elements.socialBtns.forEach((sBtn) => {
                        sBtn.addEventListener("mouseenter", THALIA_CHARA.interactions.socialBtnHover);
                        sBtn.addEventListener("mouseleave", THALIA_CHARA.interactions.socialBtnOut);
                    });
                }
            }

            THALIA_CHARA.interactions.enable();

            window.addEventListener('scrollThaliaCharaPause', (e) => {
                if (SCROLL.getScroll(ScrollMain) < 5) {
                    THALIA_CHARA.interactions.enable();
                    return;
                }

                if (e.detail.way === "enter") {
                    THALIA_CHARA.interactions.enable();
                } else {
                    THALIA_CHARA.interactions.disable();
                }
            });
        },
        enable : () => {
            THALIA_CHARA.elements.dragContainer.addEventListener("mousemove", THALIA_CHARA.interactions.following);

            THALIA_CHARA.interactions.blinkLoopStart();
        },
        disable : () => {
            THALIA_CHARA.elements.dragContainer.removeEventListener("mousemove", THALIA_CHARA.interactions.following);

            THALIA_CHARA.interactions.blinkLoopStop();
        },

        updateEyesPosition : (e) => {
            SCROLL.resize(ScrollMain);
            THALIA_CHARA.data.look.center = _GET.elementCenterPos(THALIA_CHARA.elements.mainEyes);
        },
        look : (e) => {
            THALIA_CHARA.elements.main.classList.add("looking");
        },
        unlook : (e) => {
            THALIA_CHARA.elements.main.classList.remove("looking");
        },
        pointerStop : (e) => {
            const posX_abs = Math.abs(THALIA_CHARA.data.dragPos[0]);
            docHTML.setAttribute("thalia-chara-drag-strength", ((posX_abs > THALIA_GLOBALS.vpSize[0] / 8) ? "strong" : ((posX_abs > 15) ? "weak" : "none")));
            docHTML.style.setProperty("--thalia-chara-drag-direction", ((THALIA_CHARA.data.dragPos[0] > 0) ? 1 : -1));

            THALIA_CHARA.data.state = "resting";
            docHTML.setAttribute("thalia-chara-state", "resting");
            THALIA_CHARA.elements.main.classList.remove("grabbing");
        },
        pointerActive : (e) => {
            THALIA_CHARA.data.pointerPosStart = [e.clientX, e.clientY];

            THALIA_CHARA.data.state = "grabbing";
            THALIA_CHARA.interactions.following(e);
            docHTML.setAttribute("thalia-chara-state", "grabbing");
            THALIA_CHARA.elements.main.classList.add("grabbing");
        },
        following : (e) => {
            THALIA_CHARA.data.pointerPos = [e.clientX, e.clientY];

            if(THALIA_CHARA.data.state == "grabbing") {
                THALIA_CHARA.data.dragPos = [
                    lerp(0, THALIA_CHARA.data.pointerPos[0] - THALIA_CHARA.data.pointerPosStart[0], THALIA_CHARA.options.dragIntensity[0]),
                    lerp(0, THALIA_CHARA.data.pointerPos[1] - THALIA_CHARA.data.pointerPosStart[1], THALIA_CHARA.options.dragIntensity[1])
                ];

                docHTML.style.setProperty("--thalia-chara-drag-x", THALIA_CHARA.data.dragPos[0] +"px");
                docHTML.style.setProperty("--thalia-chara-drag-y", THALIA_CHARA.data.dragPos[1] +"px");
                docHTML.style.setProperty("--thalia-chara-drag-rotate", THALIA_CHARA.data.dragPos[0] * THALIA_CHARA.options.angleDamping +"deg");

                /*// precise angle
                let angle = Math.atan2(
                    (THALIA_CHARA.data.pointerPosStart[1] - THALIA_CHARA.data.pointerPos[1]),
                    (THALIA_CHARA.data.pointerPosStart[0] - THALIA_CHARA.data.pointerPos[0])
                ) + ((THALIA_CHARA.data.pointerPos[0] > 0) ? (Math.PI / 2) : (Math.PI / 2));
                angle = (angle < 0) ? (angle + (2 * Math.PI)) : (angle);
                docHTML.style.setProperty("--thalia-chara-drag-rotate",
                    lerp(0,
                        Math.max(Math.min(
                            angle
                        , Math.PI + 0.8), Math.PI - 0.8)
                        - Math.PI
                    , THALIA_CHARA.options.dragIntensity[2])
                    +"rad"
                );*/
            } else {
                THALIA_CHARA.data.look.posFromCenter = [
                    (THALIA_CHARA.data.pointerPos[0] - THALIA_CHARA.data.look.center[0]) / THALIA_CHARA.options.look.damping[0],
                    (THALIA_CHARA.data.pointerPos[1] - THALIA_CHARA.data.look.center[1]) / THALIA_CHARA.options.look.damping[1]
                ];
                THALIA_CHARA.data.look.distanceFactor = THALIA_CHARA.options.look.maxDistance / Math.sqrt(
                    (THALIA_CHARA.data.look.posFromCenter[0] * THALIA_CHARA.data.look.posFromCenter[0])
                    + (THALIA_CHARA.data.look.posFromCenter[1] * THALIA_CHARA.data.look.posFromCenter[1])
                )

                if (THALIA_CHARA.data.look.distanceFactor > 1) {
                    THALIA_CHARA.data.look.posFromCenter = [
                        THALIA_CHARA.data.look.posFromCenter[0],
                        THALIA_CHARA.data.look.posFromCenter[1]
                    ];
                } else {
                    THALIA_CHARA.data.look.posFromCenter = [
                        THALIA_CHARA.data.look.posFromCenter[0] * THALIA_CHARA.data.look.distanceFactor,
                        THALIA_CHARA.data.look.posFromCenter[1] * THALIA_CHARA.data.look.distanceFactor
                    ];
                }

                THALIA_CHARA.elements.main.style.setProperty("--pointer-follow-look-x", THALIA_CHARA.data.look.posFromCenter[0] +"px");
                THALIA_CHARA.elements.main.style.setProperty("--pointer-follow-look-y", THALIA_CHARA.data.look.posFromCenter[1] +"px");
            }
        },
        toggleHands: (active) => {
            docHTML.setAttribute("thalia-chara-hands-toggle", active);
        },
        initBlinkHit: () => {
            THALIA_CHARA.interactions.blinkHit(false);

            THALIA_CHARA.elements.hands.forEach((hand) => {
                hand.addEventListener("pointerdown", () => { THALIA_CHARA.interactions.blinkHit(true); });
                hand.addEventListener("pointerup", () => { THALIA_CHARA.interactions.blinkHit(false); });
                hand.addEventListener("pointerleave", () => { THALIA_CHARA.interactions.blinkHit(false); });
            })
        },
        blinkHit: (active) => {
            docHTML.setAttribute("thalia-chara-state", (active) ? "grabbing" : "resting");
            THALIA_CHARA.data.dragPos = [0,0];
            docHTML.style.setProperty("--thalia-chara-drag-x", "0px");
            docHTML.style.setProperty("--thalia-chara-drag-y", "0px");
            docHTML.style.setProperty("--thalia-chara-drag-rotate", "0deg");
        },
        blink: (now = false) => {
            setTimeout(() => {
                docHTML.setAttribute("thalia-chara-blink", "true");
                setTimeout(() => {
                    docHTML.setAttribute("thalia-chara-blink", "false");
                }, THALIA_CHARA.options.blink.speed);
            }, (now) ? 0 : _GET.randomIntFromInterval(0, THALIA_CHARA.options.blink.randomIntervalAdd));
        },
        blinkLoopStart: () => {
            if (!THALIA_CHARA.data.blinkIntervalInstance) {
                setTimeout(() => {
                    THALIA_CHARA.interactions.blink(true);
                }, THALIA_CHARA.options.blink.startTimeout);

                THALIA_CHARA.data.blinkIntervalInstance = setInterval(() => {
                    THALIA_CHARA.interactions.blink();
                }, THALIA_CHARA.options.blink.interval);
            }
        },
        blinkLoopStop: () => {
            if (THALIA_CHARA.data.blinkIntervalInstance) {
                clearTimeout(THALIA_CHARA.data.blinkIntervalInstance);
                THALIA_CHARA.data.blinkIntervalInstance = null;
            }
        },
    },
}



// GALLERY GRID
let GridMuuriGallery;
const GridMuuri_options = {
    target : '.grid-muuri',
    gallery : {
        items: ".grid-muuri--item",
        sortData: null,

        showDuration: 600,
        showEasing: 'cubic-bezier(0.4, 0, 0, 1)',
        visibleStyles: {
            opacity: '1',
            transform: 'scale(1)'
        },

        hideDuration: 400,
        hideEasing: 'cubic-bezier(0.7, 0, 0.4, 1)',
        hiddenStyles: {
            opacity: '0',
            transform: 'scale(0.6)'
        },

        layout: {
            fillGaps: true,
            horizontal: false,
            alignRight: false,
            alignBottom: false,
            rounding: false
        },
        layoutOnInit: true,

        layoutOnResize: 150,
        layoutDuration: 800,
        layoutEasing: 'cubic-bezier(0.45, 0, 0, 1)',

        dragEnabled: false,
    }
}


let GALLERY_GRID = {
    itemsShiftValue : 140,
    data : {
        currentFilter : null,
    },
    elements : {
        section : document.querySelector(".section-main-gallery"),
        gallerySectionScrollToAnchor : document.querySelector(".section-main-gallery .scroll-to-anchor"),
        galleryItemsFiltersContainers : undefined,
        filtersBarBtns : document.querySelectorAll(".sticky-menu wrapper[menu-show-id='filters'] .btn-filter"),
        filtersClearBtn : document.querySelectorAll("*[thalia-gallery-filter-btn-clear]"),
        filtersBtns : undefined,
        shiftItemsMuuri: undefined,
        shiftItemsContent: [],
    },
    init : (initReset = true) => {
        GALLERY_GRID.elements.galleryItemsFiltersContainers = document.querySelectorAll(".gallery-grid .item-gallery .filters");

        GridMuuriGallery = new Muuri(GridMuuri_options.target, GridMuuri_options.gallery);

        GALLERY_GRID.initShiftItems();
        GALLERY_GRID.createItemsFiltersBtns();
        GALLERY_GRID.initFiltersBtns(initReset);

        GridMuuriGallery._settings.hideDuration = 0;
        GridMuuriGallery.layout(true);
        setTimeout(() => {
            GridMuuriGallery._settings.hideDuration = GridMuuri_options.gallery.hideDuration;
        }, 200);

        // setTimeout(() => { GALLERY_GRID.initScrollInView(); }, 100);
    },
    destroy : () => {
        GridMuuriGallery.destroy();

        GALLERY_GRID.elements.filtersBtns = document.querySelectorAll("*[thalia-gallery-filter-btn-id]");

        GALLERY_GRID.elements.filtersBtns.forEach((fBtn) => {
            if (fBtn) {
                let newEl = fBtn.cloneNode(true);
                fBtn.parentNode.replaceChild(newEl, fBtn);
                fBtn = newEl;
            }
        });
        GALLERY_GRID.elements.filtersClearBtn.forEach((fcBtn) => {
            if (fcBtn) {
                fcBtn.removeEventListener("click", GALLERY_GRID.onUnfilter);
            }
        });
    },
    galleryFilter : (item, matchFilter) => {
        if (item.getElement().getAttribute('thalia-gallery-item-filters').match(matchFilter)) {
            return true;
        }
        return false;
    },
    onClickFilter : (el) => {
        docHTML.setAttribute("thalia-gallery-filter-previous", docHTML.getAttribute("thalia-gallery-filter"));

        if (el.getAttribute("thalia-gallery-filter-btn-id") == GALLERY_GRID.data.currentFilter) {
            GALLERY_GRID.onUnfilter();
            SCROLL.resize(ScrollMain);
        } else {
            GALLERY_GRID.onFilter(el);
            SCROLL.resize(ScrollMain);
        }
        GALLERY_GRID.scrollToTop();
    },
    onFilter : (el) => {
        GALLERY_GRID.data.currentFilter = el.getAttribute("thalia-gallery-filter-btn-id");
        GALLERY_GRID.setShiftItemsSize();
        docHTML.setAttribute("thalia-gallery-filter", GALLERY_GRID.data.currentFilter);

        GALLERY_GRID.filterItems();
    },
    onUnfilter : (initReset = true) => {
        if (initReset) {
            GALLERY_GRID.data.currentFilter = null;
            GALLERY_GRID.setShiftItemsSize();
            docHTML.setAttribute("thalia-gallery-filter", "false");
        }
        else {
            GALLERY_GRID.setShiftItemsSize();
        }

        GALLERY_GRID.filterItems();
    },
    filterItems : () => {
        const doFilter = !!GALLERY_GRID.data.currentFilter;

        GridMuuriGallery.refreshItems();
        GridMuuriGallery.filter((item) => {
            item.getElement().setAttribute("thalia-gallery-item-was-hidden", !item.isVisible());
            return (doFilter) ? GALLERY_GRID.galleryFilter(item, GALLERY_GRID.data.currentFilter) : true;
        });

        if (doFilter) {
            GALLERY_GRID.elements.filtersBtns.forEach((fBtn) => {
                if (fBtn.getAttribute('thalia-gallery-filter-btn-id').match(GALLERY_GRID.data.currentFilter)) {
                    fBtn.classList.add("active");
                } else {
                    fBtn.classList.remove("active");
                }
            });
        }
        else {
            GALLERY_GRID.elements.filtersBtns.forEach((fBtn) => { fBtn.classList.remove("active") });
        }
    },
    createItemsFiltersBtns : () => {
        GridMuuriGallery.getItems().forEach((item) => {
            let filterElements = "";
            item.getElement().getAttribute("thalia-gallery-item-filters").split(";").forEach((filterName) => {
                filterElements += '<span thalia-gallery-filter-btn-id="'+ filterName +'">'+ filterName +'</span>';
            });
            item.getElement().querySelector(".filters").innerHTML = filterElements;
        })
    },
    initFiltersBtns : (initReset = true) => {
        GALLERY_GRID.elements.filtersBtns = document.querySelectorAll("*[thalia-gallery-filter-btn-id]");
        if (GALLERY_GRID.elements.filtersBtns.length > 0) {
            GALLERY_GRID.elements.filtersBtns.forEach((fBtn) => {
                fBtn.addEventListener("click", () => { GALLERY_GRID.onClickFilter(fBtn) });
            });
            GALLERY_GRID.elements.filtersClearBtn.forEach((fcBtn) => {
                fcBtn.addEventListener("click", GALLERY_GRID.onUnfilter);
            });
        }

        GALLERY_GRID.onUnfilter(initReset);
    },
    getShiftItemsSize : (callback) => {
        GALLERY_GRID.elements.shiftItemsMuuri.forEach((item) => {
            item.style.display = "block";
            item.setAttribute("thalia-gallery-item-height", item.firstElementChild.firstElementChild.offsetHeight);
            item.setAttribute("thalia-gallery-item-height", window.getComputedStyle(item.firstElementChild.firstElementChild).height.replace("px", ""));

            setTimeout(() => {
                if (!item.classList.contains("muuri-item-hidden")) {
                    item.style.display = null;
                } else { item.style.display = "none"; }
            }, 5);
        });

        if(callback) { callback() };
    },
    setShiftItemsSize : () => {
        GALLERY_GRID.elements.shiftItemsMuuri.forEach((item) => {
            item.style.height = ((GALLERY_GRID.data.currentFilter === null) ? GALLERY_GRID.itemsShiftValue : 0) + parseFloat(item.getAttribute("thalia-gallery-item-height")) +"px";
        })
    },
    initShiftItems : () => {
        docHTML.style.setProperty("--thalia-gallery-item-shift", GALLERY_GRID.itemsShiftValue +"px");

        GALLERY_GRID.elements.shiftItemsMuuri = document.querySelectorAll(".gallery-grid .grid-muuri--item.item-shift");
        GALLERY_GRID.elements.shiftItemsMuuri.forEach((item) => {
            // the _Content and _Muuri item have the same index
            GALLERY_GRID.elements.shiftItemsContent.push(item.querySelectorAll(".item-gallery"));
        })

        GALLERY_GRID.getShiftItemsSize();
        GALLERY_GRID.setShiftItemsSize();
        window.addEventListener("resize", () => { GALLERY_GRID.getShiftItemsSize(GALLERY_GRID.setShiftItemsSize) });
    },
    initScrollInView : () => {
        GridMuuriGallery.getItems().forEach((item) => {
            const itemG = item.getElement().querySelector(".item-gallery");
            itemG.setAttribute("data-scroll", "");
            itemG.setAttribute("data-scroll-offset", "200,0");
        });
        ScrollMain.addScrollElements(GridMuuriGallery.getElement());
    },
    scrollToTop : () => {
        if (SCROLL.getScroll(ScrollMain) > 50) {
            ScrollMain.scrollTo(GALLERY_GRID.elements.gallerySectionScrollToAnchor, {
                ...SCROLL.options.scrollTo,
                offset: 0,
                onComplete: () => { SCROLL.resize(ScrollMain); }
            });
        }
    },
}



// PROJECTS
const PROJECTS = {
    data : {
        homePrevScrollPos : null,
        homePrevAnchorPos : null,
    },

    initPagesHandling: () => {
        // GALLERY GRID
        swup.hooks.on('page:view', (visit) => {
            if (GridMuuriGallery) {
                GALLERY_GRID.destroy();
            }

            if (visit.to.url === "/") {
                GALLERY_GRID.init(false);
            }
        });


        // SCROLL
        swup.hooks.on('visit:start', (visit) => {
            visit.scroll.reset = false; // disable default swup scroll to top animation

            if (visit.from.url === "/") {
                PROJECTS.data.homePrevScrollPos = SCROLL.getScroll(ScrollMain);
                PROJECTS.data.homePrevAnchorPos = GALLERY_GRID.elements.gallerySectionScrollToAnchor.getBoundingClientRect().top;
            }

            if (GALLERY_GRID.elements.gallerySectionScrollToAnchor.getBoundingClientRect().top > 1) {
                if (visit.to.url !== "/") {
                    ScrollMain.scrollTo(GALLERY_GRID.elements.gallerySectionScrollToAnchor, {
                        ...SCROLL.options.scrollTo,
                        lock: true,
                        offset: 0,
                        onComplete: () => { SCROLL.resize(ScrollMain); }
                    });
                }
            }
            else {
                swup.hooks.on('content:replace', () => {
                    if (GALLERY_GRID.elements.gallerySectionScrollToAnchor.getBoundingClientRect().top < 1) {
                        ScrollMain.scrollTo((GALLERY_GRID.elements.gallerySectionScrollToAnchor), {
                            immediate: true,
                            lock: true,
                            offset: 0,
                            onComplete: () => { SCROLL.resize(ScrollMain); }
                        });

                        // home scroll restoration
                        if (visit.to.url === "/" && PROJECTS.data.homePrevScrollPos != null) {
                            if (PROJECTS.data.homePrevScrollPos > THALIA_GLOBALS.vpSize[1] && PROJECTS.data.homePrevAnchorPos < 0) {
                                setTimeout(() => {
                                    ScrollMain.scrollTo((PROJECTS.data.homePrevScrollPos), {
                                        ...SCROLL.options.scrollTo,
                                        lock: true,
                                        offset: 0,
                                        onComplete: () => { SCROLL.resize(ScrollMain); }
                                    });
                                }, 300);
                            }
                        }
                    }
                }, { once : true, before: true });
            }
        });
    }
}



//- SWUP
const swup = new Swup({
    animateHistoryBrowsing: true,
    cache: true,

    containers: ['#swup'],
    animationSelector: '[class*="swup-transition-"]',
    animationScope: 'html',

    linkSelector: 'a[href]',
    linkToSelf: 'scroll',

    timeout: 0,
    native: false,
    // resolveUrl: (url) => url,

    // hooks: {},
    // plugins: [],
});



//- RUN
window.addEventListener("load", () => {
    _GET.scrollbarWidth();
    swup.hooks.on('content:replace', () => { _GET.scrollbarWidth(true); });

    ScrollMain = new LocomotiveScroll(SCROLL.options.scroll);
    SCROLL.initEvents();
    //ScrollMain_onScroll({});

    STICKY_MENU.init();

    THALIA_CHARA.interactions.init();

    PROJECTS.initPagesHandling();
    if (document.querySelector(".gallery-grid")) { GALLERY_GRID.init(); }

    SCROLL.resize(ScrollMain);
})
