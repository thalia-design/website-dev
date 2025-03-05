import "./main.scss";
import "./import/scripts/postcss-vh-correction.js";

//- LIBRARIES
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
    scrollbarWidth : () => {
        const sw = window.innerWidth - docHTML.clientWidth;
        docHTML.style.setProperty('--scrollbar-width', ((sw > 0) ? sw : 0) + 'px');
        return sw;
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
    initEvents : () => {
        window.addEventListener('scrollHit', (e) => { // data-scroll-position="start,start"
            if (e.detail.progress >= 1) {
                e.detail.target.classList.add("is-scroll-hit");
                return;
            } else {
                e.detail.target.classList.remove("is-scroll-hit");
            }
        });
    }
}


// STICKY MENU
let STICKY_MENU = {
    elements : {
        menusContainers : document.querySelectorAll(".sticky-menu wrapper[menu-show-id]"),
    },

    init : () => {
        docHTML.setAttribute("thalia-sticky-menu-state", "false");
        STICKY_MENU.elements.menusContainers.forEach((el) => { el.setAttribute("menu-show-state", "false"); });

        window.addEventListener('scrollStickyMenu', (e) => {
            if (ScrollMain.lenisInstance.targetScroll > 5) {
                docHTML.setAttribute("thalia-sticky-menu-state", e.detail.way == "enter");
                return;
            } else {
                docHTML.setAttribute("thalia-sticky-menu-state", "true");
            }
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
        })
    }
}



// THALIA CHARA ANIMATIONS
let THALIA_CHARA = {
    options : {
        dragIntensity : [0.5, 0.6],
        angleDamping : 0.025,
        look : {
            maxDistance : 10,
            damping : [20, 15]
        }
    },
    data : {
        dragPos : [0, 0],
        look : {}
    },
    elements : {
        dragContainer : document.querySelector("main"),
        contentContainer : document.querySelector(".section-home-head"),
        main : document.querySelector(".interactive-chara-thalia svg.thalia-chara"),
        mainEyes : document.querySelector(".interactive-chara-thalia svg.thalia-chara g[data-name='eyes']"),
        hands : document.querySelectorAll(".chara-thalia--hands svg.thalia-chara"),
        socialBtns : document.querySelectorAll(".section-home-head .socials .social-btn")
    },
    interactions : {
        init: () => {
            if(THALIA_CHARA.elements.main && !THALIA_CHARA.data.activated) {
                THALIA_CHARA.data.activated = true;
                THALIA_CHARA.data.state = "resting";
                docHTML.setAttribute("thalia-chara-state", "resting");
                THALIA_CHARA.interactions.toggleHands(true);
                window.addEventListener('scrollThaliaCharaHandsToggle', (e) => {
                    if (ScrollMain.lenisInstance.targetScroll > 5) {
                        THALIA_CHARA.interactions.toggleHands(e.detail.way == "enter");
                        return;
                    } else {
                        THALIA_CHARA.interactions.toggleHands(true);
                    }
                });

                THALIA_CHARA.interactions.updateEyesPosition();
                window.addEventListener("resize", THALIA_CHARA.interactions.updateEyesPosition);
                THALIA_CHARA.elements.contentContainer.addEventListener("mouseenter", THALIA_CHARA.interactions.updateEyesPosition);

                THALIA_CHARA.interactions.look();
                THALIA_CHARA.elements.dragContainer.addEventListener("mouseenter", THALIA_CHARA.interactions.look);
                THALIA_CHARA.elements.dragContainer.addEventListener("mouseleave", THALIA_CHARA.interactions.unlook);
                THALIA_CHARA.elements.dragContainer.addEventListener("mouseleave", THALIA_CHARA.interactions.pointerStop);
                THALIA_CHARA.elements.dragContainer.addEventListener("mouseup", THALIA_CHARA.interactions.pointerStop);

                THALIA_CHARA.elements.main.addEventListener("mousedown", THALIA_CHARA.interactions.pointerActive);
                THALIA_CHARA.elements.dragContainer.addEventListener("mousemove", THALIA_CHARA.interactions.following);

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
        }
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
        gallerySectionScrollToAnchor : document.querySelector(".section-home-gallery .scroll-to-anchor"),
        galleryItemsFiltersContainers : document.querySelectorAll(".gallery-grid .item-gallery .filters"),
        filtersBarBtns : document.querySelectorAll(".sticky-menu wrapper[menu-show-id='filters'] .btn-filter"),
        filtersClearBtn : document.querySelectorAll("*[thalia-gallery-filter-btn-clear]"),
        filtersBtns : undefined,
        shiftItemsMuuri: undefined,
        shiftItemsContent: [],
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

        GridMuuriGallery.refreshItems();
        GridMuuriGallery.filter((item) => {
            item.getElement().setAttribute("thalia-gallery-item-was-hidden", !item.isVisible());
            return GALLERY_GRID.galleryFilter(item, GALLERY_GRID.data.currentFilter);
        });

        GALLERY_GRID.elements.filtersBtns.forEach((fBtn) => {
            if (fBtn.getAttribute('thalia-gallery-filter-btn-id').match(GALLERY_GRID.data.currentFilter)) {
                fBtn.classList.add("active");
            } else {
                fBtn.classList.remove("active");
            }
        });
    },
    onUnfilter : () => {
        GALLERY_GRID.data.currentFilter = null;
        GALLERY_GRID.setShiftItemsSize();
        docHTML.setAttribute("thalia-gallery-filter", "false");

        GridMuuriGallery.refreshItems();
        GridMuuriGallery.filter((item) => {
            item.getElement().setAttribute("thalia-gallery-item-was-hidden", !item.isVisible());
            return true;
        });

        GALLERY_GRID.elements.filtersBtns.forEach((fBtn) => { fBtn.classList.remove("active") });
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
    initFiltersBtns : () => {
        GALLERY_GRID.elements.filtersBtns = document.querySelectorAll("*[thalia-gallery-filter-btn-id]");
        if (GALLERY_GRID.elements.filtersBtns.length > 0) {
            GALLERY_GRID.elements.filtersBtns.forEach((fBtn) => {
                fBtn.addEventListener("click", () => { GALLERY_GRID.onClickFilter(fBtn) });
            });
            GALLERY_GRID.elements.filtersClearBtn.forEach((fcBtn) => {
                fcBtn.addEventListener("click", GALLERY_GRID.onUnfilter);
            });
        }

        GALLERY_GRID.onUnfilter();
    },
    getShiftItemsSize : (callback) => {
        GALLERY_GRID.elements.shiftItemsMuuri.forEach((item) => {
            item.style.display = "block";
            item.setAttribute("thalia-gallery-item-height", item.firstElementChild.firstElementChild.offsetHeight);
            item.setAttribute("thalia-gallery-item-height", window.getComputedStyle(item.firstElementChild.firstElementChild).height.replace("px", ""));
            setTimeout(() => { item.style.display = null; }, 5);
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
        const anchorPos = GALLERY_GRID.elements.gallerySectionScrollToAnchor.getBoundingClientRect().top;
        if (ScrollMain.lenisInstance.targetScroll > 50) {
            ScrollMain.scrollTo(GALLERY_GRID.elements.gallerySectionScrollToAnchor, {
                ...SCROLL.options.scrollTo,
                offset: 0,
                onComplete: () => {
                    SCROLL.resize(ScrollMain);
                }
            });
        }
    },
}



//- RUN
window.addEventListener("load", () => {
    _GET.scrollbarWidth();

    ScrollMain = new LocomotiveScroll(SCROLL.options.scroll);
    SCROLL.initEvents();
    //ScrollMain_onScroll({});

    STICKY_MENU.init();
    STICKY_MENU.toggleMenu("filters");
    document.querySelector("*[test-click='project']").addEventListener("click", () => { STICKY_MENU.toggleMenu("project"); });
    document.querySelector("*[test-click='filters']").addEventListener("click", () => { STICKY_MENU.toggleMenu("filters"); });

    THALIA_CHARA.interactions.init();

    GridMuuriGallery = new Muuri(GridMuuri_options.target, GridMuuri_options.gallery);
    GALLERY_GRID.initShiftItems();
    GALLERY_GRID.createItemsFiltersBtns();
    GALLERY_GRID.initFiltersBtns();
    GridMuuriGallery.layout(true);
    setTimeout(() => {
        GALLERY_GRID.initScrollInView();
    }, 100);

    SCROLL.resize(ScrollMain);
})
