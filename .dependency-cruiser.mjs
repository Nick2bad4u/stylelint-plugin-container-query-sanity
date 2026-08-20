/** @type {import("dependency-cruiser").IConfiguration} */
const dependencyCruiserConfig = {
    forbidden: [
        {
            comment:
                "Circular imports make initialization order brittle and impede isolated testing.",
            from: {},
            name: "no-circular",
            severity: "error",
            to: {
                circular: true,
            },
        },
    ],
    options: {
        doNotFollow: {
            path: "node_modules",
        },
        exclude: "(^|/)(?:dist|coverage|cache|[.]cache|temp)(?:/|$)|[.]css$",
        moduleSystems: ["es6", "cjs"],
        tsConfig: {
            fileName: "tsconfig.json",
        },
    },
};

export default dependencyCruiserConfig;
