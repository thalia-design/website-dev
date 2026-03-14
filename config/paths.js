import { normalizePath } from "vite";
import { resolve } from "path";
import { globSync } from "glob";


let PATHS = {
	dirNames : {
		devRoot : "dev",
		assets: "assets",
		build: "thalia-design.github.io",
	},

    configDirDepth : "../",
	pages : {},
	pageCount : 0
};

PATHS.dev = normalizePath(resolve(__dirname, PATHS.configDirDepth + PATHS.dirNames.devRoot));
PATHS.assets = normalizePath(resolve(PATHS.dev + "/" + PATHS.dirNames.assets));
PATHS.build = normalizePath(resolve(__dirname, "../" + PATHS.configDirDepth + PATHS.dirNames.build));

globSync([PATHS.dev + "/**/*index.html"]).forEach(filePath => {
	PATHS.pageCount += 1;
	PATHS.pages["page_"+ PATHS.pageCount] = filePath;
	console.log("<page_"+ PATHS.pageCount +">", "\u001b[0;30m"+ filePath +"\u001b[0m")
})

console.info("<!>", Object.keys(PATHS.pages).length, "\u001b[0;32mpage"+((Object.keys(PATHS.pages).length > 1) ? "s" : "") +" found\u001b[0m\n");


export default PATHS;
