import fs from "fs";
import path from "path";
import url from "url";

const test = {}

const layersDir = path.resolve(__dirname, "./layers");
    const layerFiles = fs.readdirSync(layersDir).filter(file => file.endsWith(".ts"));

    for (const file of layerFiles) {
        const layerPath = path.join(layersDir, file);
        import(url.pathToFileURL(layerPath).href).then(layer => {
            if (layer.default) {
                console.log(`Layer: ${file} loaded`);
                console.log(layer.default, file)

                test[file] = layer.default
            } else {
                console.log(`Layer: ${file} not loaded`);
            }
        }).catch(err => {
            console.error(`Failed to load layer: ${file}`, err);
        });
    }

export default test