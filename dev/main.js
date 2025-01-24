import "./main.scss";
import "./import/scripts/postcss-vh-correction.js";

//- LIBRARIES
import "./import/dependencies/locomotive/locomotive-edited.js";
import Muuri from 'muuri';
// import anime from 'animejs/lib/anime.es.js';


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
    }
}

function lerp (start, end, amt) { return (1 - amt) * start + amt * end; }


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
            duration: 1.4,
            lock: false,
            easing: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
        },
    },
    resize : (instance) => {
        setTimeout(() => {
            console.log("resize scroll");
            //instance.resize();
        }, 200);
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
        }
    },
    data : {
        dragPos : [0, 0],
        look : {}
    },
    interactions : {},
    elements : {
        dragContainer : docHTML.querySelector("main"),
        main : docHTML.querySelector(".interactive-chara-thalia svg.thalia-chara"),
        mainEyes : docHTML.querySelector(".interactive-chara-thalia svg.thalia-chara g[data-name='eyes']"),
        hands : docHTML.querySelectorAll(".chara-thalia--hands svg.thalia-chara"),
        socialBtns : docHTML.querySelectorAll(".section-home-head .socials .social-btn")
    }
}

THALIA_CHARA.interactions.updateEyesPosition = (e) => {
    THALIA_CHARA.data.look.center = _GET.elementCenterPos(THALIA_CHARA.elements.mainEyes);
}
THALIA_CHARA.interactions.look = (e) => {
    THALIA_CHARA.elements.main.classList.add("looking");
}
THALIA_CHARA.interactions.unlook = (e) => {
    THALIA_CHARA.elements.main.classList.remove("looking");
}
THALIA_CHARA.interactions.pointerStop = (e) => {
    const posX_abs = Math.abs(THALIA_CHARA.data.dragPos[0]);
    docHTML.setAttribute("thalia-chara-drag-strength", ((posX_abs > THALIA_GLOBALS.vpSize[0] / 8) ? "strong" : ((posX_abs > 15) ? "weak" : "none")));
    docHTML.style.setProperty("--thalia-chara-drag-direction", ((THALIA_CHARA.data.dragPos[0] > 0) ? 1 : -1));

    THALIA_CHARA.data.state = "resting";
    docHTML.setAttribute("thalia-chara-state", "resting");
    THALIA_CHARA.elements.main.classList.remove("grabbing");
}
THALIA_CHARA.interactions.pointerActive = (e) => {
    THALIA_CHARA.data.pointerPosStart = [e.clientX, e.clientY];

    THALIA_CHARA.data.state = "grabbing";
    THALIA_CHARA.interactions.following(e);
    docHTML.setAttribute("thalia-chara-state", "grabbing");
    THALIA_CHARA.elements.main.classList.add("grabbing");
}

THALIA_CHARA.interactions.following = (e) => {
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
            +"rad");
        */

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
}

if(THALIA_CHARA.elements.main && !THALIA_CHARA.data.activated) {
    THALIA_CHARA.data.activated = true;
    THALIA_CHARA.data.state = "resting";
    docHTML.setAttribute("thalia-chara-state", "resting");

    THALIA_CHARA.interactions.updateEyesPosition();
    window.addEventListener("resize", THALIA_CHARA.interactions.updateEyesPosition);

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



// GALLERY GRID
let GridMuuriGallery;
const GridMuuri_options = {
    target : '.grid-muuri',
    gallery : {
        items: ".grid-muuri--item",
        sortData: null,

        showDuration: 300,
        showEasing: 'ease',
        visibleStyles: {
            opacity: '1',
            transform: 'scale(1)'
        },

        hideDuration: 300,
        hideEasing: 'ease',
        hiddenStyles: {
            opacity: '0',
            transform: 'scale(0.5)'
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
        layoutDuration: 400,
        layoutEasing: 'cubic-bezier(0.3, 0, 0.1, 0.9)',

        dragEnabled: false,
    }
}
// GridGalleryMuuri.defaultOptions.showDuration = 400;


let GALLERY_GRID = {
    data : {
        currentFilter : null
    },
    elements : {
        galleryItemsFiltersContainers : docHTML.querySelectorAll(".gallery-grid .item-gallery .filters"),
        filtersBar : docHTML.querySelectorAll(".sticky-filters"),
        filtersBarBtns : docHTML.querySelectorAll(".sticky-filters .btn-filter"),
        filtersClearBtn : docHTML.querySelectorAll("*[thalia-gallery-filter-btn-clear]"),
        filtersBtns : null,
    },
    galleryFilter : (item, matchFilter) => {
        const itemE = item.getElement();
        if (itemE.hasAttribute('thalia-gallery-item-filters')) {
            if (itemE.getAttribute('thalia-gallery-item-filters').match(matchFilter)) {
                return true;
            }
        }
        return false;
    },
    onClickFilter : (el) => {
        if (el.getAttribute("thalia-gallery-filter-btn-id") == GALLERY_GRID.data.currentFilter) {
            GALLERY_GRID.onUnfilter();
            SCROLL.resize();
        } else {
            GALLERY_GRID.onFilter(el);
            SCROLL.resize(ScrollMain);
        }
    },
    onFilter : (el) => {
        GALLERY_GRID.data.currentFilter = el.getAttribute("thalia-gallery-filter-btn-id");

        GridMuuriGallery.filter((item) => { return GALLERY_GRID.galleryFilter(item, GALLERY_GRID.data.currentFilter) });

        GALLERY_GRID.elements.filtersBarBtns.forEach((fbBtn) => {
            if (fbBtn.getAttribute('thalia-gallery-filter-btn-id').match(GALLERY_GRID.data.currentFilter)) {
                fbBtn.classList.add("active");
            } else {
                fbBtn.classList.remove("active");
            }
        });
    },
    onUnfilter : () => {
        GALLERY_GRID.data.currentFilter = null;
        GridMuuriGallery.filter((item) => { return true });
        GALLERY_GRID.elements.filtersBarBtns.forEach((fbBtn) => { fbBtn.classList.remove("active") });
    },
    createItemsFiltersBtns : () => {
        GridMuuriGallery.getItems().forEach((item) => {
            let filterElements = "";
            item.getElement().getAttribute("thalia-gallery-item-filters").split(";").forEach((filterName) => {
                filterElements += "<span thalia-gallery-filter-btn-id="+ filterName +">"+ filterName +"</span>";
            });
            item.getElement().querySelector(".filters").innerHTML = filterElements;
        })
    },
    initFiltersBtns : () => {
        GALLERY_GRID.elements.filtersBtns = docHTML.querySelectorAll("*[thalia-gallery-filter-btn-id]");
        if (GALLERY_GRID.elements.filtersBtns.length > 0) {
            GALLERY_GRID.elements.filtersBtns.forEach((fBtn) => {
                fBtn.addEventListener("click", () => {GALLERY_GRID.onClickFilter(fBtn)});
            });
            GALLERY_GRID.elements.filtersClearBtn.forEach((fcBtn) => {
                fcBtn.addEventListener("click", GALLERY_GRID.onUnfilter);
            });
        }
    }
}




//- RUN
setTimeout(() => {
    _GET.scrollbarWidth();
    ScrollMain = new LocomotiveScroll(SCROLL.options.scroll);
    //ScrollMain_onScroll({});
    GridMuuriGallery = new Muuri(GridMuuri_options.target, GridMuuri_options.gallery);
    GALLERY_GRID.createItemsFiltersBtns();
    GALLERY_GRID.initFiltersBtns();
    SCROLL.resize(ScrollMain);
}, 50);
