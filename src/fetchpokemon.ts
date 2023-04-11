import axios from "axios"

import { PokemonDTO, Types } from "./pokemonmodel";
import { setoffset, offset } from "./pokemonrepo";

export async function fetchalltypes() {
    console.log("Fetching all types");
    return (await axios.get("https://pokeapi.co/api/v2/type/")).data.results
}

export async function fetchpokemoninfo(nameorid : string | number): Promise<PokemonDTO | null> {
    return (await axios.get(`https://pokeapi.co/api/v2/pokemon/${nameorid}/`)).data;
}

export async function fetchallpokemon() {
    console.log("Fetching all pokemon");
    return (await axios.get("https://pokeapi.co/api/v2/pokemon/?limit=811")).data.results
}

export async function fetchpokemon(limit : number): Promise<Types[] | null> {
    console.log(`Fetching all pokemon with limit ${limit} and offset ${offset}`);
    var data = (await axios.get(`https://pokeapi.co/api/v2/pokemon/?limit=${limit}&offset=${offset}/`)).data.results
    await setoffset(offset + limit);
    return data;
}