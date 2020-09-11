const fs = require("fs");

const wabt = require("wabt")();

const file = process.argv[2];

const inputWat = file + ".wat";

const wasmModule = wabt.parseWat(inputWat, fs.readFileSync(inputWat, "utf8"));
const { buffer } = wasmModule.toBinary({});

let data = "const wasm_data = new Uint8Array([   // Module length is " + buffer.length + " bytes.\n";
for (let i = 0; i < buffer.length; i++) {
    data += buffer[i] + ",";
};
data += "\n]);";

fs.writeFileSync("wasm_data.js", data);

