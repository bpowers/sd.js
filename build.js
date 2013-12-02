({
    baseUrl: 'lib',
    paths: {
        requireLib: 'vendor/require',
        underscore: 'vendor/underscore',
        jquery: 'vendor/jquery',
        raphael: 'vendor/raphael',
        snapsvg: 'vendor/snapsvg',
        q: 'vendor/q',
        mustache: 'vendor/mustache',
    },
    include: ['requireLib'],//, 'underscore', 'jquery', 'raphael', 'snapsvg', 'q', 'mustache'],
    optimize: 'none',
    name: 'sd',
    out: 'build/sd.nakid.js',
})
