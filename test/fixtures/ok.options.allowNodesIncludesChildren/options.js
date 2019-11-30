module.exports = {
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
};
