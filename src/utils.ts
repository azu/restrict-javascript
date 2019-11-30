import { MemberExpression } from "estree";
import { walk } from "estree-walker";

/**
 * a.b.c to ["a", "b", "c"]
 * @param memberExpression
 */
export const memberExpressionToNames = (memberExpression: MemberExpression): string[] => {
    const identifierStack: string[] = [];
    walk(memberExpression, {
        leave(node) {
            if (node.type === "MemberExpression") {
                // object.property
                // object
                // If object is MemberExpression, just skip
                if (node.object.type !== "MemberExpression") {
                    if (node.object.type === "Identifier") {
                        identifierStack.push(node.object.name);
                    } else {
                        identifierStack.push("?");
                    }
                }
                // property
                if (node.property.type === "Identifier") {
                    identifierStack.push(node.property.name);
                } else {
                    identifierStack.push("?");
                }
            }
        }
    });
    return identifierStack;
};

/**
 * Return true, if "?.a.c" match "x.a.c"
 *
 * - a.?.c == a.b.c
 * - a.b.c == a.b.c
 * - b.c !== a.b.c
 * - "" !== a.b.c
 */
export const matchMethodPath = (pathString: string, anotherPathString: string): boolean => {
    const aChars = pathString.split(".");
    const bChars = anotherPathString.split(".");
    if (aChars.length === 0 || bChars.length === 0) {
        return false;
    }
    // should iterate long path
    const longChars = aChars.length > bChars.length ? aChars : bChars;
    const shortChars = aChars.length > bChars.length ? bChars : aChars;
    return longChars.every((char, index) => {
        // ? match all characters
        const anotherChar = shortChars[index];
        if (char === "?" || anotherChar === "?") {
            return true;
        }
        return char === anotherChar;
    });
};

export const matchAllowedPropertyName = (node: any, name: string) => {
    if (node.type === "Identifier" && node.name === name) {
        return true;
    }
    if (node.type === "MemberExpression") {
        if (node.computed && node.property.type === "Literal" && node.property.value === name) {
            return true;
        }
    }
    return false;
};
