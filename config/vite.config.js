import { defineConfig } from "vite";


// OPTIONS
import PATHS from "./paths.js"

let OPTIONS = {
	buildWithAssets : false,

	doMinify : {
		"production" : "esbuild",
		"development" : false
	},
	buildDir : {
		"production" : PATHS.buildProd,
		"development" : PATHS.buildDev
	},
}


// PLUGINS
import injectHTML from "vite-plugin-html-inject";

// postcss
import postcssInlineSvg from "postcss-inline-svg";
import svgo from "postcss-svgo"
import postcssNested from "postcss-nested"
import postcssPresetEnv from "postcss-preset-env"
import postcssEasingGradients from "postcss-easing-gradients";
import postcssShort from "postcss-short";
import postcssViewportHeightCorrection from "postcss-viewport-height-correction"; // [POSTCSS WARNING] https://github.com/Faisal-Manzer/postcss-viewport-height-correction/issues/18


// MOVE SCRIPT TAG TO BODY END
const scriptToBodyEnd = () => {
	return {
		name: "scriptToBodyEnd",
		transformIndexHtml(html) {
			let scriptTag = html.match(/^.*<script[^>]*>(.*?)<\/script[^>]*>/gm)[0];
			html = html.replaceAll(scriptTag, "");

			scriptTag = scriptTag.replaceAll(` type="module" crossorigin`, "");
			html = html.replaceAll("</body>", scriptTag + `\n</body>`);

			return html;
		},
	};
};


// INSERT HTML TO ALL PAGES
const insertToAllPagesHTML = (partitions) => {
	/* Variables :
	   targetRegex : /<regex.*>/g
	   position : "before"|"after"
	   newLine : boolean
	   insert : "<>" 	-> if contains "%dirdepth%", will be replaced with multiple "../" to match directory detph
	*/
	return {
		name: "insertToAllPagesHTML",
		transformIndexHtml : {
			order: "pre",
			handler(html, ctx) {
				partitions.forEach((part) => {
					part.position = (part.position) ? part.position : "";
					part.newLine = (part.newLine) ? part.newLine : false;

					const insertHTML = part.insert.replaceAll("%dirdepth%", ("../").repeat(((ctx.path.match(/\//g)||[]).length) - 1));

					html.match(part.targetRegex).forEach((targetHTML) => {
						html = html.replaceAll(targetHTML, ""
							+ ((part.position == "after") ? targetHTML + ((part.newLine) ? `\n` : "") : "")
							+ insertHTML
							+ ((part.position == "before") ? targetHTML + ((part.newLine) ? `\n` : "") : "")
						);
					});
				});
				return html;
			},
		},
	};
};


// IGNORE ASSETS HTML
const ignoreAssetsHTML = () => {
	return {
		name: "ignoreAssetsHTML",
		transformIndexHtml : {
			handler(html) {
				html = html.replaceAll(` href=`, " vite-ignore href=");
				html = html.replaceAll(` src=`, " vite-ignore src=");
				return html;
			},
		},
	};
};


// IGNORE ASSETS ROLLUP BUILD
const isAsset = (assetFileNameOriginal) => {
	const regexAssetsDir = new RegExp(`(${PATHS.dirNames.assets}\/)`);
	return regexAssetsDir.test(assetFileNameOriginal);
}

const ignoreAssetsRollup = (buildWithAssets) => {
	if (!buildWithAssets) {
		return {
			name: "ignoreAssetsRollup",
			apply: "build",
			generateBundle: {
				order: "pre",
				handler(options, bundle, isWrite) {
					Object.entries(bundle).forEach((asset) => {
						if (asset[1].type == "asset" && asset[1].originalFileNames.length > 0) {
							if (isAsset(asset[1].originalFileNames[0])) {
								delete bundle[asset[0]]; // do not generate asset
							}
						};
					});
				},
			},
		};
	}
};


// CONFIG
export default defineConfig(({ mode }) => {
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
			emptyOutDir : true,
			assetsDir : "",
			assetsInlineLimit : 0,
			copyPublicDir : false,
			minify: OPTIONS.doMinify[mode],
			rollupOptions: {
				input: PATHS.pages,
				output: {
					chunkFileNames: "bundle-[hash].js",
					assetFileNames: (assetInfo) => {
						// keep folder structure for assets
						if (assetInfo.originalFileNames.length > 0) {
							if (isAsset(assetInfo.originalFileNames[0])) {
								return assetInfo.originalFileNames[0];
							}
						}
						// css
						return "bundle-[hash].[ext]";
					}
				},
				watch: {
					exclude: PATHS.configDirDepth + "node_modules/**",
					include: PATHS.dev + "/**",
				}
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
			{ enforce: "pre", ...insertToAllPagesHTML([
				{
					targetRegex : /<head.*>/g,
					position : "after",
					newLine : true,
					insert : `<import-html src="import/html/head.html" dirdepth="%dirdepth%" />`
				},
				{
					targetRegex : /<body.*>/g,
					position : "after",
					newLine : true,
					insert : `<import-html src="import/html/noscript.html" />`
				},
			]), },
			{ enforce: "pre", ...injectHTML({ tagName: "import-html" }), },

			// ignoreAssetsHTML(),
			ignoreAssetsRollup(OPTIONS.buildWithAssets),

			{ enforce: "post", ...scriptToBodyEnd(), }
		],
	}
});