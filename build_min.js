({
    baseUrl: 'build',
    include: ['sd'],
    name: '../bower_components/almond/almond',
    wrap: {
        startFile: 'src/build/start.frag.js',
        endFile: 'src/build/end.frag.js'
    },
    out: 'sd.min.js',
})
