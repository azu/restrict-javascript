# restrict-javascript

Define restrict JavaScript syntax and validate it.

## Motivation

This validation library aim to define limited JavaScript subset.
That subset will be safe by default.
Safe means that does not call any untrusted function.

## Do

Validate following untrusted function calls and get errors. 

```js
alert("hello");
alert`hello`;
const a = alert;
a("hello");
const alertName = "alert";
window[alertName]("hello");
```

Following code is passed, because it is safe.

```js
`text`;
``` 

### Do Not

This validation does not provide sandbox feature.
It means that the code can refer to any object like `window` by default.
In other hands, `__proto__` and `construsctor` is restricted by default. 

This validation will be used with [vm](https://nodejs.org/api/vm.html) modules.

## Install

Install with [npm](https://www.npmjs.com/):

    npm install restrict-javascript

## Usage

This validation is used with [Espree](https://github.com/eslint/espree).

:memo: Pass `loc: true` option to `espree.parse` function. It is needed to error position. 

```js
import { validateAST } from "restrict-javascript";
const espree = require("espree");
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
            {id: 'DISALLOW_NODE_TYPE', line: 2, column: 0}, // function
            {id: 'DISALLOW_NODE_TYPE', line: 6, column: 0}, // const
            {id: 'DISALLOW_NODE_TYPE', line: 6, column: 6}, // =
            {id: 'DISALLOW_UNTRUSTED_FUNCTION_CALL', line: 6, column: 14}, // add(1, 2)
            {id: 'DISALLOW_NODE_TYPE', line: 6, column: 14} //function call node
        ]
    )
}
```

### Default Options

Default Config is very strict setting.

It aim to prevent to define untrusted function/variables and invoke untrusted functions. 

- Disallow any function/method/class call
    - includes normal function call, `new` expression, and Tagged Function call
- Disallow any function/method/class declaration
    - NG: `function`, `class`, `=>`
- Disallow any declaration variables
    - NG: use `var`, `let`, `const`
- Disallow any assignment variables
    - NG: `foo = "value";`
- Disallow lookup `__proto__` and `constructor` property

Summary: Disallow to create functions and call functions, and lookup the above

You can add allow list by `allow*` option.

### `allowFunctionNames: string[]`

This options allow calling specified function names.

Example: Allow `String()` and `alert()`

```js
{
    allowFunctionNames: ["String", "alert"]
}
```

### `allowMethodNames: string[]`

This options allow calling specified method names.

Example: Allow `Math.random()`

```js
{
    allowMethodNames: ["Math.random"]
}
```

This options accept `?` as place holder value. `?` match any name.

Example: Allow `"string".replace("a", "b")`.
`?` match `"string"`.

```js
{
    allowMethodNames: ["?.replace"]
}
```

Note: method chain matching.
You can match `[].map().filter()` by following options.

```js
{
    allowMethodNames: ["?.map.filter"]
}
```

### `allowNodeTypes: string[]`

This options allow to use specified `ESTree.Node`.

Default: allow safe Node types.

This options will be override default options. Be careful.

- [estree/estree: The ESTree Spec](https://github.com/estree/estree)

### `allowNodesIncludesChildren: ESTree.Node[]`

This options allow node and node's children.
Specify ESTree node object and match it partially.

This options allow especial patterns.

For example, You can allow `new Date().getTime()` signature by following options:

```js
{
    allowNodesIncludesChildren: [
        {
            type: "ExpressionStatement",
            expression: {
                type: "CallExpression",
                callee: {
                    type: "MemberExpression",
                    object: {
                        type: "NewExpression",
                        callee: {
                            type: "Identifier",
                            name: "Date"
                        },
                        arguments: []
                    },
                    property: {
                        type: "Identifier",
                        name: "getTime"
                    },
                    computed: false
                },
                arguments: []
            }
        }
    ]
}
```

See also [test/fixtures/ok.options.allowNodesIncludesChildren/](test/fixtures/ok.options.allowNodesIncludesChildren/) 

:memo: Notice: This options force skip matched node, be careful treat!

Tips: [AST explorer](https://astexplorer.net/) is useful for the options.

### `debug: boolean`

Enable debug options. It is useful for debugging.

- Add `node` property to each errors. 

## Changelog

See [Releases page](https://github.com/azu/restrict-javascript/releases).

## Running tests

Install devDependencies and Run `npm test`:

    npm test

## Contributing

Pull requests and stars are always welcome.

For bugs and feature requests, [please create an issue](https://github.com/azu/restrict-javascript/issues).

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Author

- [github/azu](https://github.com/azu)
- [twitter/azu_re](https://twitter.com/azu_re)

## License

MIT © azu
