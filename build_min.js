({
    baseUrl: 'lib',
    include: ['sd'],
    name: 'vendor/almond',
    wrap: {
        startFile: 'lib/build/start.frag.js',
        endFile: 'lib/build/end.frag.js'
    },
    out: 'dist/sd.nodeps.min.js',
})
