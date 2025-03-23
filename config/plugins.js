import PATHS from "./paths.js"


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


// REPLACE IN ALL HTML PAGES
const replaceToAllPagesHTML = (partitions, enforceOrder = "pre") => {
/**	VARIABLES
 * 	replaceWith : ""
 * 	targetRegex : /(regex)/g
 *
 * 	dirDepth : boolean			-> toggle for dirDepth mode, will replace any matched regex to the directory depth of the html page
 * 								   "replaceWith" will be ignored
 * 	dirDepthBase : ""			-> will place the string specified for the home page only, generally "./"
 */
	return {
		name: "replaceToAllPagesHTML",
		transformIndexHtml : {
			order: enforceOrder,
			handler(html, ctx) {
				partitions.forEach((part) => {
					part.dirDepth = (part.dirDepth) ? part.dirDepth : false;
					part.dirDepthBase = (part.dirDepthBase) ? part.dirDepthBase : "";

					if (part.dirDepth) {
						const dirDepth = ""+ ("../").repeat(((ctx.path.match(/\//g)||[]).length) - 1);
						part.replaceWith = (dirDepth === "") ? part.dirDepthBase : dirDepth;
					}

					if (part.targetRegex) {
						const targetMatches = html.match(part.targetRegex);
						if (targetMatches != null) {
							targetMatches.forEach((targetHTML) => {
								html = html.replaceAll(targetHTML, part.replaceWith);
							});
						}
					}
				});
				return html;
			},
		},
	};
};


// INSERT HTML TO ALL PAGES
const insertToAllPagesHTML = (partitions, enforceOrder = "pre") => {
/**	VARIABLES
 * 	insert : "<>" 				-> if contains "{%%dirDepth%%}", will be replaced with multiple "../" to match directory detph
 * 								-> if contains "{%%dirName%%}", will be replace by page directory name
 * 								-> if "forArray" is defined, will repeat through it while replacing "{%%forArray%%}" for each item
 * 	targetRegex : /<regex.*>/g
 * 	targetReplace : boolean		-> will remove matched target
 * 	position : "before"|"after"
 * 	newLine : boolean
 * 	dirDepthBase : ""			-> will place the string specified for the home page only, generally "./"
 * 	forArray : []				-> will not insert anything if empty
 */
	return {
		name: "insertToAllPagesHTML",
		transformIndexHtml : {
			order: enforceOrder,
			handler(html, ctx) {
				partitions.forEach((part) => {
					part.targetReplace = (part.targetReplace) ? part.targetReplace : false;
					part.position = (part.position) ? part.position : "";
					part.newLine = (part.newLine) ? part.newLine : false;
					part.forArray = (part.forArray) ? part.forArray : undefined;
					part.dirDepthBase = (part.dirDepthBase) ? part.dirDepthBase : "";

					let insertHTML = part.insert;

					if (part.forArray) {
						const insertHTML_template = insertHTML;
						insertHTML = "";

						for (let index = 0; index < part.forArray.length; index++) {
							insertHTML += insertHTML_template.replaceAll("{%%forArray%%}", part.forArray[index]);
							if (index < part.forArray.length) { insertHTML += (part.newLine) ? `\n` : ""; }
						}
					}
					else {
						if (insertHTML.includes("{%%dirDepth%%}")) {
							const dirDepth = ""+ ("../").repeat(((ctx.path.match(/\//g)||[]).length) - 1);
							insertHTML = insertHTML.replaceAll("{%%dirDepth%%}", ((dirDepth === "") ? part.dirDepthBase : dirDepth));
						}

						if (insertHTML.includes("{%%dirName%%}")) {
							insertHTML = insertHTML.replaceAll("{%%dirName%%}", ctx.path.replace("/index.html", "").split("/").at(-1));
						}

					}

					if (part.targetRegex) {
						const targetMatches = html.match(part.targetRegex);
						if (targetMatches != null) {
							targetMatches.forEach((targetHTML) => {
								html = html.replaceAll(targetHTML, ""
									+ ((part.position == "after" ) ? ((part.targetReplace) ? "" : targetHTML) + ((part.newLine) ? `\n` : "") : "")
									+ insertHTML
									+ ((part.position == "before") ? ((part.targetReplace) ? "" : targetHTML) + ((part.newLine) ? `\n` : "") : "")
								);
							});
						}
					}
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
				return html; // TODO remove attribute after generating
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


// REMOVE VITE HASH UPDATE MARKER IN CSS ASSETS
const removeViteHashUpdateMarker = () => {
	return {
		name: "removeViteHashUpdateMarker",
		generateBundle: {
			order: "pre",
			handler(options, bundle, isWrite) {
				// const viteHashUpdateMarker = "/*$vite$:1*/";
				const viteHashUpdateMarkerRE = /\/\*\$vite\$:\d+\*\//;

				Object.entries(bundle).forEach((asset) => {
					if (asset[1].type == "asset" && asset[1].originalFileNames.length > 0) {
						if ((asset[1].originalFileNames[0].endsWith('.css') || asset[1].originalFileNames[0].endsWith('.scss')) && typeof asset[1].source === "string") {
							asset[1].source = asset[1].source.replace(viteHashUpdateMarkerRE, "");
							// console.info("removed viteHashUpdateMarker in :", asset[1].originalFileNames[0]);
						}
					};
				});
			},
		},
	};
}


export {
    scriptToBodyEnd,
    replaceToAllPagesHTML,
    insertToAllPagesHTML,
    ignoreAssetsHTML,
    isAsset,
    ignoreAssetsRollup,
    removeViteHashUpdateMarker,
}