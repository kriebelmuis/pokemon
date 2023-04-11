"use strict";
const axios = require('axios/dist/node/axios.cjs').default;
var GetPokemonFromName = function GetPokemonFromName(pokemon) {
    axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemon}`)
        .then(function (res) {
        console.log(res);
    })
        .catch(function (err) {
        console.log(`Error: ${err}`);
    })
        .finally(function () {
        console.log("Fetching pokemon from name");
    });
};
module.exports.GetPokemonFromName = GetPokemonFromName;
