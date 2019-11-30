import { validateAST } from "../src/restrict-javascript";
import * as assert from "assert";
import * as vm from "vm";

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
                {id: "DISALLOW_NODE_TYPE", line: 2, column: 0}, // function
                {id: "DISALLOW_NODE_TYPE", line: 6, column: 0}, // const
                {id: "DISALLOW_NODE_TYPE", line: 6, column: 6}, // =
                {id: "DISALLOW_UNTRUSTED_FUNCTION_CALL", line: 6, column: 14}, // add(1, 2)
                {id: "DISALLOW_NODE_TYPE", line: 6, column: 14} //function call node
            ]);
        } else {
            // this untrustedJSCode will be trusted?
            const result = vm.runInContext(untrustedJSCode, vm.createContext());
            console.log(result);
        }
    });
});
