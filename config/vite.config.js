import { defineConfig } from "vite";

//-- PLUGINS
import * as PLUGINS from "./plugins.js";

import injectHTML from "vite-plugin-html-inject";
// import { viteStaticCopy } from 'vite-plugin-static-copy';
// import legacy from '@vitejs/plugin-legacy';

// postcss
import postcssInlineSvg from "postcss-inline-svg";
import svgo from "postcss-svgo"
import postcssNested from "postcss-nested"
import postcssPresetEnv from "postcss-preset-env"
import postcssEasingGradients from "postcss-easing-gradients";
import postcssShort from "postcss-short";
import postcssViewportHeightCorrection from "postcss-viewport-height-correction"; // [POSTCSS WARNING] https://github.com/Faisal-Manzer/postcss-viewport-height-correction/issues/18


//-- OPTIONS
import PATHS from "./paths.js";

let OPTIONS = {
	buildWithAssets : false,
	bundleMoreFiles : [],

	doMinify : {
		"production" : "esbuild",
		"development" : false
	},
	doMinifyCSS : {
		"production" : "esbuild",
		"development" : false
	},
	doSourcemap : {
		"production" : false,
		"development" : true
	},
	buildDir : {
		"production" : PATHS.buildProd,
		"development" : PATHS.buildDev
	},
}


//-- DATA
import * as DATA from "../dev/data/projects.js";

function thaliaProjectsDataTransform(data) {
	if (data[1].itemThumbnailURL.includes("{p%key%}")) {
		data[1].itemThumbnailURL = data[1].itemThumbnailURL.replaceAll("{p%key%}", data[0]);
	}

	if (!data[1].itemShift) {
		data[1].itemShift = false;
	}

	if (Array.isArray(data[1].filters)) {
        data[1].filters = data[1].filters.join(";");
    }

	return data[1];
}
const thaliaAutoFillProjects = (options, enforceOrder = "pre") => {
	return {
		name: "thaliaAutoFillProjects",
		transformIndexHtml : {
			order: enforceOrder,
			handler(html, ctx) {

				// home gallery items
				if (html.includes("<thaliaAutoFillProjects htmlGalleryItems/>")) {
					let htmlGalleryItems = "";

					Object.entries(options.data).forEach((projectEntry) => {
						const projectData = thaliaProjectsDataTransform(projectEntry);

						htmlGalleryItems += `
<import-html src="import/html/gallery-grid-item.html"
	itemSizeX="${projectData.itemSize[0]}" itemSizeY="${projectData.itemSize[1]}"
	itemTitle="${projectData.title}"
	itemSlug="${projectEntry[0]}"
	itemThumbnailURL="${projectData.itemThumbnailURL}"
	itemFilters="${projectData.filters}"
	itemClassesAdd="${(projectData.itemShift) ? "item-shift" : ""}"
/>`;
					});

					html = html.replaceAll("<thaliaAutoFillProjects htmlGalleryItems/>", htmlGalleryItems);
				}

				// projects data auto fill
				Object.entries(options.data).forEach((projectEntry) => {
					if (ctx.path.includes(projectEntry[0])) {
						if (ctx.path.replace("/index.html", "").split("/").at(-1) == projectEntry[0]) {
							const projectData = thaliaProjectsDataTransform(projectEntry);

							Object.entries(projectData).forEach((pDataEntry) => {
								const entryAlias = "{p%"+ pDataEntry[0] +"%}";
								if (html.includes(entryAlias)) {
									html = html.replaceAll(entryAlias, pDataEntry[1]);
								}
							});
						}
					}
				});


				return html;
			},
		},
	};
};

//-- CONFIG
export default defineConfig(({ mode }) => {
	OPTIONS.bundleMoreFiles_insertLinkTags = []; OPTIONS.bundleMoreFiles_inputAssets = {};
	for (let i = 0; i < OPTIONS.bundleMoreFiles.length; i++) {
		OPTIONS.bundleMoreFiles_insertLinkTags.push(OPTIONS.bundleMoreFiles[i]);
		OPTIONS.bundleMoreFiles_inputAssets["bundleMoreFiles_asset_"+ i] = PATHS.dev +"/"+ OPTIONS.bundleMoreFiles[i];
	}

	return {
		publicDir: PATHS.dirNames.devRoot,
		root: PATHS.dirNames.devRoot,
		base : "./",

		server : {
			port: 8888,
			host: true,
		},
		preview : {
			port: 8888,
			host: true,
		},

		build: {
			outDir: OPTIONS.buildDir[mode],
			assetsDir : "",
			assetsInlineLimit : 0,
			emptyOutDir : true,
			copyPublicDir : false,

			target: "es2015",
			sourcemap: OPTIONS.doSourcemap[mode],
			minify: OPTIONS.doMinify[mode],
			cssMinify : OPTIONS.doMinifyCSS[mode],

			rollupOptions: {
				input: {
					...PATHS.pages,
					...OPTIONS.bundleMoreFiles_inputAssets
				},

				output: {
					entryFileNames: "scripts-[hash].js",
					chunkFileNames: "scripts-[hash].js",
					assetFileNames: (assetInfo) => {
						// keep folder structure for assets
						if (assetInfo.originalFileNames.length > 0) {
							if (PLUGINS.isAsset(assetInfo.originalFileNames[0])) {
								return assetInfo.originalFileNames[0];
							}
						}

						// ...and for other assets like css files // TOFIX css url() are kept as is so relative paths are broken
						if (assetInfo.originalFileNames.length > 0 && assetInfo.names[0] != "page_1.css") {
							//OPTIONS.bundleMoreFiles_insertLinkTags.push(assetInfo.originalFileNames[0]);
							return assetInfo.originalFileNames[0];
						}

						// main css
						return "styles-[hash].[ext]";
					},
				},

				plugins: [
					PLUGINS.removeViteHashUpdateMarker(),
				],

				watch: {
					exclude: PATHS.configDirDepth + "node_modules/**",
					include: PATHS.dev + "/**",
				},
			},
		},

		css: {
			transformer: "postcss",
			postcss : {
				plugins: [
					postcssEasingGradients({ // https://github.com/larsenwork/postcss-easing-gradients / https://larsenwork.com/easing-gradients/#editor
						stops: 6,
						alphaDecimals: 3,
						colorMode: "lrgb"
					}),
					postcssInlineSvg({ // https://github.com/TrySound/postcss-inline-svg
						removeFill: true,
						removeStroke: true,
					}),
					svgo({ // https://github.com/cssnano/cssnano/tree/master/packages/postcss-svgo
						params: {
							overrides: {
								removeViewBox: false,
								removeComments: true,
								cleanupNumericValues: {
									floatPrecision: 4
								}
							}
						}
					}),
					postcssNested({ // https://github.com/postcss/postcss-nested
						preserveEmpty: false
					}),
					postcssShort({ // https://github.com/csstools/postcss-short
						skip: "_"
					}),
					postcssViewportHeightCorrection(), // https://github.com/Faisal-Manzer/postcss-viewport-height-correction
					postcssPresetEnv(), // https://github.com/csstools/postcss-plugins/tree/main/plugin-packs/postcss-preset-env // autoprefixer(), // https://github.com/postcss/autoprefixer
				]
			}
		},

		plugins: [
			/*{ enforce: "pre", ...PLUGINS.replaceToAllPagesHTML([
				{
					targetRegex : /({%dirDepth%})/g,
					dirDepth : true,
					dirDepthBase : "./",
				},
			]), },*/
			{ enforce: "pre", ...PLUGINS.insertToAllPagesHTML([
				{
					targetRegex : /<head.*>/g,
					position : "after",
					newLine : true,
					insert : `<import-html src="import/html/head.html"/>`
				},
				{
					targetRegex : /<body.*>/g,
					position : "after",
					newLine : true,
					insert : `<import-html src="import/html/noscript.html" />`
				},
			]), },
			{ enforce: "pre", ...thaliaAutoFillProjects(
				{ data : DATA.THALIA_PROJECTS }
			), },
			{ enforce: "pre", ...injectHTML({ tagName: "import-html" }), },

			{ enforce: "pre", ...PLUGINS.insertToAllPagesHTML([
				{
					targetRegex : /({%ap%})/g,
					targetReplace : true,
					insert : "assets/projets",
				},
				{
					targetRegex : /({%p%})/g,
					targetReplace : true,
					insert : "{%%dirName%%}",
				},
				{
					targetRegex : /({%dirDepth%})/g,
					targetReplace : true,
					insert : "{%%dirDepth%%}",
					dirDepthBase : "./"
				},
			]), },

			// ignoreAssetsHTML(),
			PLUGINS.ignoreAssetsRollup(OPTIONS.buildWithAssets),

			/*{ enforce: "post", ...PLUGINS.insertToAllPagesHTML([
				{
					// targetRegex : /(<link rel="stylesheet").*>/g,
					// position : "before",
					targetRegex : /(<import-assets\/>)/g,
					targetReplace : true,
					newLine : true,
					forArray : OPTIONS.bundleMoreFiles_insertLinkTags,
					dirDepthBase : "./",
					insert : `<link rel="stylesheet" crossorigin href="{%dirDepth%}{%forArray%}">`
				},
			], "post"), },*/

			//{ enforce: "post", ...scriptToBodyEnd(), }
		],
	}
});
