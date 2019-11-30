import { validateAST } from "../src/restrict-javascript";
import * as assert from "assert";

const espree = require("espree");

describe("example", () => {
    it("is example tests", () => {
        const untrustedJSCode = `
function add(x, y){
    return x + y
}

const total = add(1, 2);
`;
        const AST = espree.parse(untrustedJSCode, {
            loc: true, // <= require `loc` option
            // Other options is optional
            ecmaVersion: 2015
        });
        const validationResult = validateAST(AST);
        if (!validationResult.ok) {
            assert.deepStrictEqual(validationResult.errors, [
                { id: "DISALLOW_NODE_TYPE", line: 2, column: 0 }, // function
                { id: "DISALLOW_NODE_TYPE", line: 6, column: 0 }, // const
                { id: "DISALLOW_NODE_TYPE", line: 6, column: 6 }, // =
                { id: "DISALLOW_UNTRUSTED_FUNCTION_CALL", line: 6, column: 14 }, // add(1, 2)
                { id: "DISALLOW_NODE_TYPE", line: 6, column: 14 } //function call node
            ]);
        }
    });
});
