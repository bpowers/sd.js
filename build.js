({
    baseUrl: 'build',
    include: ['sd'],
    optimize: 'none',
    name: '../bower_components/almond/almond',
    wrap: {
        startFile: 'src/build/start.frag.js',
        endFile: 'src/build/end.frag.js'
    },
    out: 'sd.js',
})
