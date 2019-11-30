import * as ESTree from "estree";
import isMatch from "lodash.ismatch";
import { walk } from "estree-walker";
import { matchAllowedPropertyName, matchMethodPath, memberExpressionToNames } from "./utils";

export type Condition = {
    type: ESTree.Node["type"];
    [index: string]: any;
};

export enum ValidationErrorId {
    NONE = "NONE",
    // ============
    // client issue
    // ============
    PARSE_ERROR = "PARSE_ERROR",
    // =======
    // server(validation)
    // =======
    // allowNodeTypes options
    DISALLOW_NODE_TYPE = "DISALLOW_NODE_TYPE",
    // Disallow to use `a.constructor`
    DISALLOW_CONSTRUCTOR_LOOKUP = "DISALLOW_CONSTRUCTOR_LOOKUP",
    // Disallow to use `a.__proto__`
    DISALLOW__PROTO__LOOKUP = "DISALLOW__PROTO__LOOKUP",
    // Disallow to use native function like `alert()`
    DISALLOW_UNTRUSTED_FUNCTION_CALL = "DISALLOW_UNTRUSTED_FUNCTION_CALL",
    // Disallow to use method  `window.alert()`
    DISALLOW_UNTRUSTED_METHOD_CALL = "DISALLOW_UNTRUSTED_METHOD_CALL",
    // Disallow to use user-defined variable for PropertyName
    DISALLOW_UNTRUSTED_DYNAMIC_PROPERTY_REFERENCE = "DISALLOW_UNTRUSTED_DYNAMIC_PROPERTY_REFERENCE"
}

export interface ValidationOptions {
    // If use following syntax, throw parse Error.
    disallowTemplateSettings?: {
        escape?: boolean;
        evaluate?: boolean;
        interpolate?: boolean;
    };
    // Allow Function name
    // Default: []
    // Example: ["alert"]
    allowFunctionNames?: string[];
    // Allow method name
    // `?` is place holder value. That is treated as wildcard name.
    // Default: []
    // Example: ["Math.random"] allow `Math.random()`
    // Example: ["?.replace"] allow `"string".replace("a", "b")`
    allowMethodNames?: string[];
    // Allow node types
    // Default: [SafeNodeTypes]
    allowNodeTypes?: string[];
    // Allow node and node's children
    // Specify ESTree node object and match it partially
    // Notice: This options force skip matched node, be careful treat!
    // Default: []
    // Example: See test/fixtures/ok.options.allowNodesIncludesChildren/options.js
    allowNodesIncludesChildren?: Condition[];
    // If debug is true, validation result includes `node` for debugging
    debug?: true;
}

/**
 * Default Allow Nodes only includes safe syntax.
 *
 * - Do not call
 * - Do no define variable, functions
 * - Do not eval code
 * - Do not import/export
 */
export const DefaultAllowNodeTypes = [
    // # Program(Root)
    "Program",
    // # Identifier
    "Identifier",
    // # Literal
    "Literal",
    // # FunctionDeclaration
    // { type: "FunctionDeclaration" }
    // { type: "FunctionExpression" }
    // { type: "ArrowFunctionExpression" }
    // # SwitchCase
    "SwitchCase",
    // # CatchClause
    "CatchClause",
    //VariableDeclarator
    // { type: "VariableDeclarator" }
    // #Statement
    "ExpressionStatement",
    "BlockStatement",
    "EmptyStatement",
    "DebuggerStatement",
    "WithStatement",
    "ReturnStatement",
    "LabeledStatement",
    "BreakStatement",
    "ContinueStatement",
    "IfStatement",
    "SwitchStatement",
    "ReturnStatement",
    "ThrowStatement",
    "TryStatement",
    "WhileStatement",
    "DoWhileStatement",
    "ForStatement",
    "ForInStatement",
    "ForOfStatement",
    // # Declaration
    // "FunctionDeclaration",
    // "VariableDeclaration",
    // "ClassDeclaration",
    // # Expression
    "ThisExpression",
    "ArrayExpression",
    "ObjectExpression",
    "YieldExpression",
    "UnaryExpression",
    "UpdateExpression",
    "BinaryExpression",
    // "AssignmentExpression",
    "LogicalExpression",
    "MemberExpression",
    "ConditionalExpression",
    // # CallExpression
    // "CallExpression",
    // "NewExpression",
    "SequenceExpression",
    "TemplateLiteral",
    // "TaggedTemplateExpression",
    // "ClassExpression",
    "MetaProperty",
    "Identifier",
    "AwaitExpression",
    // # Property
    "Property",
    // # Pattern
    "ObjectPattern",
    "ArrayPattern",
    "RestElement",
    // "AssignmentPattern",
    "MemberExpression",
    // # Super
    // { type: "Super"}
    // # TemplateElement
    "TemplateElement",
    // # SpreadElement
    "SpreadElement"
    // # Class
    // "ClassDeclaration",
    // "ClassExpression",
    // # ClassBody
    // { type: "ClassBody"}
    // # MethodDefinition
    // "MethodDefinition",
    // # ModuleDeclaration
    // "ModuleDeclaration",
    // # ModuleSpecifier
    // "ImportSpecifier",
    // "ImportDefaultSpecifier",
    // "ImportNamespaceSpecifier",
    // "ExportSpecifier",
];
export const DefaultValidationOptions = {
    allowFunctionNames: [],
    allowMethodNames: [],
    allowNodeTypes: DefaultAllowNodeTypes,
    // allow node includes children
    // if allow if node, allow if body also
    allowNodesIncludesChildren: []
};

export const validateNode = (
    node: ESTree.Node,
    {
        allowNodeTypes,
        allowFunctionNames,
        allowMethodNames,
        debug
    }: { allowNodeTypes: string[]; allowFunctionNames: string[]; allowMethodNames: string[]; debug: boolean }
): ValidationError[] => {
    const errors: ValidationError[] = [];
    // Function Call name check
    // This check depended on diallow to create new variable
    if (node.type === "CallExpression") {
        const SimpleCallExpression = node as ESTree.SimpleCallExpression;
        if (
            SimpleCallExpression.callee &&
            SimpleCallExpression.callee.type === "Identifier" &&
            SimpleCallExpression.callee.name
        ) {
            const functionName = SimpleCallExpression.callee.name;
            if (allowFunctionNames.includes(functionName)) {
                return [];
            } else {
                errors.push({
                    id: ValidationErrorId.DISALLOW_UNTRUSTED_FUNCTION_CALL,
                    line: node.loc ? node.loc.start.line : 1,
                    column: node.loc ? node.loc.start.column : 0,
                    ...(debug ? { node } : {})
                });
            }
        }
    }
    // Method Call name check
    if (node.type === "CallExpression") {
        const SimpleCallExpression = node as ESTree.SimpleCallExpression;
        if (SimpleCallExpression.callee && SimpleCallExpression.callee.type === "MemberExpression") {
            const names = memberExpressionToNames(SimpleCallExpression.callee);
            const memberPath = names.join(".");
            // Match method path
            // support ?.method pattern
            const isAllowedMethod = allowMethodNames.some(allowMethodPath =>
                matchMethodPath(allowMethodPath, memberPath)
            );
            if (isAllowedMethod) {
                return [];
            } else {
                errors.push({
                    id: ValidationErrorId.DISALLOW_UNTRUSTED_METHOD_CALL,
                    line: node.loc ? node.loc.start.line : 1,
                    column: node.loc ? node.loc.start.column : 0,
                    ...(debug ? { node } : {})
                });
            }
        }
    }
    // Disallow Member Expression compute=true
    // a[p] is dynamic reference
    // However ,allow `a["literal"]
    if (node.type === "MemberExpression") {
        if (node.computed && node.property.type !== "Literal") {
            errors.push({
                id: ValidationErrorId.DISALLOW_UNTRUSTED_DYNAMIC_PROPERTY_REFERENCE,
                line: node.loc ? node.loc.start.line : 1,
                column: node.loc ? node.loc.start.column : 0,
                ...(debug ? { node } : {})
            });
        }
    }

    if (node.type === "Identifier" || node.type === "MemberExpression") {
        // Disallow __proto_
        if (matchAllowedPropertyName(node, "__proto__")) {
            errors.push({
                id: ValidationErrorId.DISALLOW__PROTO__LOOKUP,
                line: node.loc ? node.loc.start.line : 1,
                column: node.loc ? node.loc.start.column : 0,
                ...(debug ? { node } : {})
            });
        }
        // Disallow constructor
        if (matchAllowedPropertyName(node, "constructor")) {
            errors.push({
                id: ValidationErrorId.DISALLOW_CONSTRUCTOR_LOOKUP,
                line: node.loc ? node.loc.start.line : 1,
                column: node.loc ? node.loc.start.column : 0,
                ...(debug ? { node } : {})
            });
        }
    }

    // Condition Checks
    const isAllowedNodeType = allowNodeTypes.includes(node.type);
    if (!isAllowedNodeType) {
        // Disallow unknown by default
        errors.push({
            id: ValidationErrorId.DISALLOW_NODE_TYPE,
            line: node.loc ? node.loc.start.line : 1,
            column: node.loc ? node.loc.start.column : 0,
            ...(debug ? { node } : {})
        });
    }
    return errors;
};

export type ValidationError = {
    // error id that is one of ValidationErrorId
    id: ValidationErrorId;
    // line number starts with 1
    line: number;
    // column number starts with 0
    column: number;
    // Error object that has error message
    error?: Error;
    // details
    node?: ESTree.Node;
};

export const validateAST = (
    ast: ESTree.Node,
    options: ValidationOptions = {}
): { ok: boolean; errors: ValidationError[] } => {
    const allowNodeTypes = options.allowNodeTypes || DefaultValidationOptions.allowNodeTypes;
    const allowFunctionNames = options.allowFunctionNames || DefaultValidationOptions.allowFunctionNames;
    const allowMethodNames = options.allowMethodNames || DefaultValidationOptions.allowMethodNames;
    const allowNodesIncludesChildren =
        options.allowNodesIncludesChildren || DefaultValidationOptions.allowNodesIncludesChildren;
    const errors: ValidationError[] = [];
    walk(ast, {
        enter(node) {
            // Node Checks
            // If the parent node is allowed, does not check children of the node
            // Example, allow `ForStatement` node and the `ForStatement` body nodes is allowed
            // It aim to define complex allow pattern
            const isSkipChildren = allowNodesIncludesChildren.some(allowNode => {
                // match source with allowNode
                return isMatch(node, allowNode);
            });
            if (isSkipChildren) {
                // stop to walk into child nodes
                // This node is allowed
                return this.skip();
            }
            const validationNodeErrors = validateNode(node, {
                allowFunctionNames: allowFunctionNames,
                allowMethodNames: allowMethodNames,
                allowNodeTypes: allowNodeTypes,
                debug: options.debug !== undefined ? options.debug : false
            });
            if (validationNodeErrors.length > 0) {
                errors.push(...validationNodeErrors);
            }
        }
    });
    return {
        ok: errors.length === 0,
        errors
    };
};
