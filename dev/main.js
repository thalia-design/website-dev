import "./main.scss";
import "./import/scripts/postcss-vh-correction.js"

//- LIBRARIES
import "./import/dependencies/locomotive/locomotive-edited.js"


//- VARS
const docHTML = document.documentElement;


//- OPTIONS
// SMOOTH SCROLL
const ScrollMain_options = {
    scroll: {
        lenisOptions: {
            smoothWheel: true,
            smoothTouch: false,
            wheelMultiplier: 0.9,
            duration: 1.02,
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
    }
}
let ScrollMain;


//- RUN
setTimeout(() => {
    ScrollMain = new LocomotiveScroll(ScrollMain_options.scroll);
    //ScrollMain_onScroll({});
}, 50);
