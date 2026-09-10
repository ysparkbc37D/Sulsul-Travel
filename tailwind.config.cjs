module.exports = {
  content: ['./index.html', './js/**/*.js', './js/**/*.mjs', './kb-travel.js'],
  darkMode: 'class',
  theme: {extend:{colors:{brand:{gold:'#17644d',goldLight:'#9cd8b7',emerald:'#059669',dark:'#1b3029',card:'#fff',cardHover:'#f4f6f5',border:'#dce5df',borderLight:'#edf2ef'}}}},
  // Destination packs compose these utility names at runtime.
  safelist: [{pattern:/^(bg|text|border)-(amber|emerald|sky|indigo|rose|slate|teal|blue|green|orange|red|purple)-(50|100|200|300|400|500|600|700|800|900|950)$/}]
};
