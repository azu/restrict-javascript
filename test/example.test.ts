import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import { validateAST } from "../src/restrict-javascript";
import * as ESTree from "estree";

const espree = require("espree");
const parse = (text: string): ESTree.Node => {
    return espree.parse(text, {
        loc: true,
        ecmaVersion: 2015
    });
};
const fixturesDir = path.join(__dirname, "fixtures");
const snapshotReplacer = function replacer(_key: string, value: any) {
    if (value instanceof Error) {
        return value.message;
    }
    return value;
};

describe("Snapshot testing", () => {
    fs.readdirSync(fixturesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(({ name }) => name)
        .filter(caseName => {
            // Ignore .dot directory
            return !caseName.startsWith(".");
        })
        .map(caseName => {
            const fixtureDir = path.join(fixturesDir, caseName);
            const normalizedTestName = caseName.replace(/-/g, " ");
            const actualFilePath = path.join(fixtureDir, "input.js");
            const optionsFilePath = path.join(fixtureDir, "options.js");
            const actualContent = fs.readFileSync(actualFilePath, "utf-8");
            const options = fs.existsSync(optionsFilePath) ? require(optionsFilePath) : {};
            const expectedFilePath = path.join(fixtureDir, "output.json");
            it(`Test ${normalizedTestName}`, function() {
                try {
                    const results = JSON.parse(
                        JSON.stringify(validateAST(parse(actualContent), options), snapshotReplacer)
                    );
                    // Usage: update snapshots
                    // UPDATE_SNAPSHOT=1 npm test
                    if (!fs.existsSync(expectedFilePath) || process.env.UPDATE_SNAPSHOT) {
                        fs.writeFileSync(expectedFilePath, JSON.stringify(results, snapshotReplacer, 4));
                        return;
                    }
                    // compare input and output

                    const expectedContent = JSON.parse(fs.readFileSync(expectedFilePath, "utf-8"));
                    assert.deepStrictEqual(results, expectedContent);
                    // ng. should be failed
                    if (caseName.startsWith("ng.")) {
                        assert.notStrictEqual(expectedContent.errors.length, 0, "ng. testcase should have errors");
                    } else {
                        assert.strictEqual(expectedContent.errors.length, 0, "ok. testcase should not have errors");
                    }
                } catch (error) {
                    if (error instanceof assert.AssertionError) {
                        throw error;
                    }
                    console.error(`Parse Error: ${error.message}
    at ${actualFilePath}:1:1
    at ${expectedFilePath}:1:1
    `);
                    throw error;
                }
            });
        });
});
